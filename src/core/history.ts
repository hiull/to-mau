import type { RGBA } from './types';
import { applyPatch, type Patch } from './fill';

/** Hoàn tác / làm lại dựa trên patch pixel. */
export class History {
  private undoStack: Patch[] = [];
  private redoStack: Patch[] = [];
  constructor(private limit = 30) {}

  push(p: Patch): void {
    this.undoStack.push(p);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }
  undo(layer: RGBA): boolean {
    const p = this.undoStack.pop();
    if (!p) return false;
    applyPatch(layer, p, 'before');
    this.redoStack.push(p);
    return true;
  }
  redo(layer: RGBA): boolean {
    const p = this.redoStack.pop();
    if (!p) return false;
    applyPatch(layer, p, 'after');
    this.undoStack.push(p);
    return true;
  }
  /** Patch sẽ bị hoàn tác / làm lại ở lần gọi kế tiếp. */
  peekUndo(): Patch | undefined { return this.undoStack[this.undoStack.length - 1]; }
  peekRedo(): Patch | undefined { return this.redoStack[this.redoStack.length - 1]; }
  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  clear(): void { this.undoStack = []; this.redoStack = []; }
}
