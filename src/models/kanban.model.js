import { createId } from "../utils/id.js";

export const DEFAULT_KANBAN_STAGES = [
  {
    status: "ideas",
    name: "Ideias",
    color: "purple",
    order: 1000,
  },
  {
    status: "todo",
    name: "A fazer",
    color: "blue",
    order: 2000,
  },
  {
    status: "doing",
    name: "Fazendo",
    color: "orange",
    order: 3000,
  },
  {
    status: "done",
    name: "Feito",
    color: "green",
    order: 4000,
  },
];

export function createKanbanModel(boardId, overrides = {}) {
  const now = new Date().toISOString();

  return {
    id: createId("kanban"),
    boardId,
    name: "Kanban principal",
    description: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createKanbanStageModel(kanbanId, overrides = {}) {
  const now = new Date().toISOString();

  return {
    id: createId("stage"),
    kanbanId,
    name: "Nova etapa",
    status: "todo",
    color: "blue",
    order: 1000,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createKanbanItemModel(overrides = {}) {
  const now = new Date().toISOString();

  return {
    id: createId("kanban_item"),
    kanbanId: "",
    stageId: "",
    blockId: "",
    order: 1000,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createDefaultKanbanStructure(boardId, overrides = {}) {
  const kanban = createKanbanModel(boardId, overrides);

  const stages = DEFAULT_KANBAN_STAGES.map((stage) => {
    return createKanbanStageModel(kanban.id, stage);
  });

  return {
    kanban,
    stages,
  };
}