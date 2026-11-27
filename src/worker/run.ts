import { binarize, buildRegionMap } from '../core/regions';
import { flattenIndex, regionPixelIndex } from '../core/fill';
import { toLineArt } from '../import/lineart';
import { vectorize } from '../import/vectorize';
import type { Job, JobResult } from './protocol';

/** Thực thi một việc nặng (dùng chung cho worker và chế độ dự phòng không có worker). */
export async function execute<J extends Job>(job: J): Promise<JobResult[J['type']]> {
  switch (job.type) {
    case 'regions': {
      const map = buildRegionMap(binarize(job.rgba));
      return { map, index: flattenIndex(regionPixelIndex(map)) } as JobResult[J['type']];
    }
    case 'index':
      return flattenIndex(regionPixelIndex(job.map)) as JobResult[J['type']];
    case 'countRegions':
      return buildRegionMap(job.line).count as JobResult[J['type']];
    case 'lineart':
      return toLineArt(job.img, job.mode, job.detail) as JobResult[J['type']];
    case 'vectorize':
      return (await vectorize(job.line)) as JobResult[J['type']];
  }
}

/** Các buffer có thể chuyển (transfer) trong kết quả. */
export function resultTransfer(r: unknown): Transferable[] {
  const out: Transferable[] = [];
  const visit = (v: any) => {
    if (!v || typeof v !== 'object') return;
    if (ArrayBuffer.isView(v)) { if (!out.includes(v.buffer as ArrayBuffer)) out.push(v.buffer as ArrayBuffer); return; }
    for (const k of Object.keys(v)) visit(v[k]);
  };
  visit(r);
  return out;
}
