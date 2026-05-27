import { GridCellAddress } from "@/lib/grid/grid-types";

type GridMutation = {
  address: GridCellAddress;
  oldValue: string;
  newValue: string;
};

type GridCommand = {
  label: string;
  mutations: GridMutation[];
};

export class GridCommandBus {
  private undoStack: GridCommand[] = [];
  private redoStack: GridCommand[] = [];

  commit(label: string, mutations: GridMutation[]) {
    if (mutations.length === 0) return;
    this.undoStack.push({ label, mutations });
    this.redoStack = [];
  }

  undo(apply: (mutation: GridMutation, reverse: boolean) => void): string | null {
    const command = this.undoStack.pop();
    if (!command) return null;
    for (let i = command.mutations.length - 1; i >= 0; i -= 1) {
      apply(command.mutations[i], true);
    }
    this.redoStack.push(command);
    return command.label;
  }

  redo(apply: (mutation: GridMutation, reverse: boolean) => void): string | null {
    const command = this.redoStack.pop();
    if (!command) return null;
    for (const mutation of command.mutations) {
      apply(mutation, false);
    }
    this.undoStack.push(command);
    return command.label;
  }
}

export type { GridMutation };
