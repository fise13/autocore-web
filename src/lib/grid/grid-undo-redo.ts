import { GridCellAddress } from "@/lib/grid/grid-types";

import { GridCommandBus, GridMutation } from "./grid-command-bus";

export type GridEditorSession = {
  cell: GridCellAddress;
  value: string;
  initialValue: string;
  selectAll: boolean;
};

export function handleGridUndo(
  commandBus: GridCommandBus,
  applyMutation: (mutation: GridMutation, reverse: boolean) => void,
  editor: GridEditorSession | null,
  setEditor: (editor: GridEditorSession | null) => void,
): string | null {
  if (editor && editor.value !== editor.initialValue) {
    setEditor({ ...editor, value: editor.initialValue });
    return "Edit Cell";
  }
  if (editor) {
    setEditor(null);
  }
  return commandBus.undo(applyMutation);
}

export function handleGridRedo(
  commandBus: GridCommandBus,
  applyMutation: (mutation: GridMutation, reverse: boolean) => void,
): string | null {
  return commandBus.redo(applyMutation);
}
