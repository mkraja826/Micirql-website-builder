import type { EditorState, WorkspaceCommand, WorkspaceMutationPolicy } from "./editor";
import { applyWorkspaceCommand } from "./editor";

export type EditorHistory = {
  present: EditorState;
  past: EditorState[];
  future: EditorState[];
  limit: number;
};

export function createEditorHistory(initial: EditorState, limit = 100): EditorHistory {
  return { present: initial, past: [], future: [], limit: Math.max(1, limit) };
}

export function executeEditorCommand(
  history: EditorHistory,
  command: WorkspaceCommand,
  policy: WorkspaceMutationPolicy = {},
): EditorHistory {
  return executeEditorCommands(history, [command], policy);
}

export function executeEditorCommands(
  history: EditorHistory,
  commands: WorkspaceCommand[],
  policy: WorkspaceMutationPolicy = {},
): EditorHistory {
  if (commands.length === 0) return history;
  const next = commands.reduce((state, command) => applyWorkspaceCommand(state, command, policy), history.present);
  const past = [...history.past, history.present];
  return {
    present: next,
    past: past.slice(Math.max(0, past.length - history.limit)),
    future: [],
    limit: history.limit,
  };
}

export function undoEditor(history: EditorHistory): EditorHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    present: previous,
    past: history.past.slice(0, -1),
    future: [history.present, ...history.future],
    limit: history.limit,
  };
}

export function redoEditor(history: EditorHistory): EditorHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    present: next,
    past: [...history.past, history.present].slice(-history.limit),
    future: history.future.slice(1),
    limit: history.limit,
  };
}
