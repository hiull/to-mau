import type { Job, JobResult, Response } from './protocol';

let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./process.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<Response>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      // Worker hỏng: các việc đang chờ chạy lại trên luồng chính.
      e.preventDefault?.();
      worker = null;
      const jobs = [...pending.values()];
      pending.clear();
      jobs.forEach((p) => p.reject(new Error('worker-failed')));
    };
  } catch {
    worker = null;
  }
  return worker;
}

/**
 * Chạy việc nặng trong Web Worker. Dữ liệu vào được sao chép (không transfer) để nếu worker hỏng
 * thì vẫn chạy lại được trên luồng chính.
 */
export async function runJob<J extends Job>(job: J): Promise<JobResult[J['type']]> {
  const w = getWorker();
  if (w) {
    try {
      return await new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        w.postMessage({ id, job });
      });
    } catch (e) {
      if ((e as Error).message !== 'worker-failed') throw e;
    }
  }
  const { execute } = await import('./run');
  return execute(job);
}
