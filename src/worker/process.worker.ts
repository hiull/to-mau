/// <reference lib="webworker" />
import { execute, resultTransfer } from './run';
import type { Request, Response } from './protocol';

self.onmessage = async (e: MessageEvent<Request>) => {
  const { id, job } = e.data;
  try {
    const result = await execute(job);
    (self as unknown as Worker).postMessage({ id, ok: true, result } satisfies Response, resultTransfer(result));
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: String((err as Error)?.message ?? err) } satisfies Response);
  }
};
