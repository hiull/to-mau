import { describe, it, expect } from 'vitest';
import { workingSize } from '../../src/core/resolution';

describe('workingSize', () => {
  it('máy thường: cạnh dài tối đa 2048', () => {
    expect(workingSize(4000, 3000, { isIOS: false })).toEqual({ width: 2048, height: 1536 });
  });
  it('iOS: cạnh dài tối đa 1536', () => {
    expect(workingSize(4000, 3000, { isIOS: true })).toEqual({ width: 1536, height: 1152 });
  });
  it('máy RAM ≤ 4GB: 1536', () => {
    expect(workingSize(3000, 4000, { isIOS: false, deviceMemory: 4 })).toEqual({ width: 1152, height: 1536 });
  });
  it('ảnh nhỏ giữ nguyên', () => {
    expect(workingSize(800, 600, { isIOS: false })).toEqual({ width: 800, height: 600 });
  });
});
