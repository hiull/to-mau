import { describe, it, expect } from 'vitest';
import { Autosaver } from '../../src/ui/autosave';

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Autosaver', () => {
  it('lưu một lần sau khoảng chờ kể từ thay đổi cuối', async () => {
    let n = 0;
    const a = new Autosaver(async () => { n++; }, 20);
    a.markDirty(); a.markDirty(); a.markDirty();
    await tick(60);
    expect(n).toBe(1);
  });

  it('flush lưu ngay và chờ lưu xong', async () => {
    const done: string[] = [];
    const a = new Autosaver(async () => { await tick(30); done.push('save'); }, 1000);
    a.markDirty();
    await a.flush();
    expect(done).toEqual(['save']);
  });

  it('các lần lưu không chồng lên nhau', async () => {
    let running = 0, maxRunning = 0;
    const a = new Autosaver(async () => { running++; maxRunning = Math.max(maxRunning, running); await tick(20); running--; }, 1);
    a.markDirty(); const p1 = a.flush();
    a.markDirty(); const p2 = a.flush();
    await Promise.all([p1, p2]);
    expect(maxRunning).toBe(1);
  });

  it('reset chờ lần lưu đang chạy xong rồi mới xoá, và huỷ thay đổi chưa lưu', async () => {
    const log: string[] = [];
    const a = new Autosaver(async () => { log.push('save-start'); await tick(30); log.push('save-end'); }, 1);
    a.markDirty();
    await tick(5); // lần lưu đang chạy
    a.markDirty(); // thay đổi mới chưa lưu
    await a.reset(async () => { log.push('clear'); });
    await tick(40);
    expect(log).toEqual(['save-start', 'save-end', 'clear']);
  });
});
