import type { Gray, RGBA, RegionMap } from '../core/types';
import type { FlatIndex } from '../core/fill';
import type { ImportMode } from '../import/lineart';

export type Job =
  | { type: 'regions'; rgba: RGBA }
  | { type: 'index'; map: RegionMap }
  | { type: 'countRegions'; line: Gray }
  | { type: 'lineart'; img: RGBA; mode: ImportMode; detail: number }
  | { type: 'vectorize'; line: Gray };

export type JobResult = {
  regions: { map: RegionMap; index: FlatIndex };
  index: FlatIndex;
  countRegions: number;
  lineart: Gray;
  vectorize: string;
};

export type Request = { id: number; job: Job };
export type Response = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };
