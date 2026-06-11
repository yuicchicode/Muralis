import { saveAppData, loadAppData } from "../db/storage.js";
import { createBoardModel } from "../models/board.model.js";
import { createBlockModel } from "../models/block.model.js";

import {
  createDefaultMindmapStructure,
  createMindmapEdgeModel,
  createMindmapModel,
  createMindmapNodeModel,
} from "../models/mindmap.model.js";

import {
  createDefaultKanbanStructure,
  createKanbanItemModel,
  createKanbanModel,
  createKanbanStageModel,
} from "../models/kanban.model.js";

const DEFAULT_VISIBLE_TYPES = [
  "idea",
  "task",
  "reference",
  "goal",
  "quote",
  "link",
];

const DEFAULT_KANBAN_PREFERENCES = {
  priority: "all",
  due: "all",
  completion: "all",
  sort: "manual",
  expandedStageIds: [],
};

function createDefaultKanbanPreferences() {
  return {
    ...DEFAULT_KANBAN_PREFERENCES,
    expandedStageIds: [],
  };
}

function normalizeKanbanPreferences(preferences = {}) {
  const priorityValues = ["all", "high", "medium", "low"];
  const dueValues = ["all", "overdue", "today", "week", "no-date"];
  const completionValues = ["all", "open", "done"];
  const sortValues = ["manual", "due", "priority", "created"];

  return {
    priority: priorityValues.includes(preferences.priority)
      ? preferences.priority
      : "all",

    due: dueValues.includes(preferences.due)
      ? preferences.due
      : "all",

    completion: completionValues.includes(preferences.completion)
      ? preferences.completion
      : "all",

    sort: sortValues.includes(preferences.sort)
      ? preferences.sort
      : "manual",

    expandedStageIds: Array.isArray(preferences.expandedStageIds)
      ? preferences.expandedStageIds.filter((stageId) => typeof stageId === "string")
      : [],
  };
}

const persistedData = loadAppData();
const subscribers = new Set();

const defaultBoard = createBoardModel({
  id: "board_main",
  name: "Meu primeiro mural",
});

const initialBoards =
  Array.isArray(persistedData?.boards) && persistedData.boards.length > 0
    ? persistedData.boards
    : [defaultBoard];

const initialActiveBoardId = initialBoards.some(
  (board) => board.id === persistedData?.activeBoardId
)
  ? persistedData.activeBoardId
  : initialBoards[0].id;

const state = {
  boards: initialBoards,

  activeBoardId: initialActiveBoardId,

  blocks: Array.isArray(persistedData?.blocks) ? persistedData.blocks : [],

  kanbans: Array.isArray(persistedData?.kanbans)
    ? persistedData.kanbans
    : [],

  kanbanStages: Array.isArray(persistedData?.kanbanStages)
    ? persistedData.kanbanStages
    : [],

  kanbanItems: Array.isArray(persistedData?.kanbanItems)
    ? persistedData.kanbanItems
    : [],

  activeKanbanByBoardId:
    persistedData?.activeKanbanByBoardId &&
    typeof persistedData.activeKanbanByBoardId === "object"
      ? persistedData.activeKanbanByBoardId
      : {},

  kanbanPreferencesById:
    persistedData?.kanbanPreferencesById &&
    typeof persistedData.kanbanPreferencesById === "object"
      ? persistedData.kanbanPreferencesById
      : {},

  mindmaps: Array.isArray(persistedData?.mindmaps)
  ? persistedData.mindmaps
  : [],

  mindmapNodes: Array.isArray(persistedData?.mindmapNodes)
    ? persistedData.mindmapNodes
    : [],

  mindmapEdges: Array.isArray(persistedData?.mindmapEdges)
    ? persistedData.mindmapEdges
    : [],

  activeMindmapByBoardId:
    persistedData?.activeMindmapByBoardId &&
    typeof persistedData.activeMindmapByBoardId === "object"
      ? persistedData.activeMindmapByBoardId
      : {},

  selectedBlockIds: [],

  filters: {
    query: "",
    types: new Set(DEFAULT_VISIBLE_TYPES),
    tags: new Set(),
  },
};

function getActiveBoard() {
  return (
    state.boards.find((board) => board.id === state.activeBoardId) ||
    state.boards[0]
  );
}

function getActiveBlocks() {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return [];
  }

  return state.blocks.filter((block) => block.boardId === activeBoard.id);
}

function getBoardKanbans(boardId) {
  return state.kanbans.filter((kanban) => kanban.boardId === boardId);
}

function getKanbanStages(kanbanId) {
  return state.kanbanStages
    .filter((stage) => stage.kanbanId === kanbanId)
    .sort((a, b) => a.order - b.order);
}

function getKanbanItems(kanbanId) {
  return state.kanbanItems
    .filter((item) => item.kanbanId === kanbanId)
    .sort((a, b) => a.order - b.order);
}

function getActiveKanban() {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return null;
  }

  const boardKanbans = getBoardKanbans(activeBoard.id);

  if (boardKanbans.length === 0) {
    return null;
  }

  const activeKanbanId = state.activeKanbanByBoardId[activeBoard.id];

  return (
    boardKanbans.find((kanban) => kanban.id === activeKanbanId) ||
    boardKanbans[0]
  );
}

function getActiveKanbanStages() {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return [];
  }

  return getKanbanStages(activeKanban.id);
}

function getActiveKanbanItems() {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return [];
  }

  return getKanbanItems(activeKanban.id);
}

function getBoardMindmaps(boardId) {
  return state.mindmaps.filter((mindmap) => mindmap.boardId === boardId);
}

function getMindmapNodes(mindmapId) {
  return state.mindmapNodes.filter((node) => node.mindmapId === mindmapId);
}

function getMindmapEdges(mindmapId) {
  return state.mindmapEdges.filter((edge) => edge.mindmapId === mindmapId);
}

function getActiveMindmap() {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return null;
  }

  const boardMindmaps = getBoardMindmaps(activeBoard.id);

  if (boardMindmaps.length === 0) {
    return null;
  }

  const activeMindmapId = state.activeMindmapByBoardId[activeBoard.id];

  return (
    boardMindmaps.find((mindmap) => mindmap.id === activeMindmapId) ||
    boardMindmaps[0]
  );
}

function getActiveMindmapNodes() {
  const activeMindmap = getActiveMindmap();

  if (!activeMindmap) {
    return [];
  }

  return getMindmapNodes(activeMindmap.id);
}

function getActiveMindmapEdges() {
  const activeMindmap = getActiveMindmap();

  if (!activeMindmap) {
    return [];
  }

  return getMindmapEdges(activeMindmap.id);
}


function ensureKanbanPreferences(kanbanId) {
  if (!kanbanId) {
    return createDefaultKanbanPreferences();
  }

  const existingPreferences = state.kanbanPreferencesById[kanbanId];

  if (!existingPreferences) {
    state.kanbanPreferencesById[kanbanId] = createDefaultKanbanPreferences();
    return state.kanbanPreferencesById[kanbanId];
  }

  state.kanbanPreferencesById[kanbanId] =
    normalizeKanbanPreferences(existingPreferences);

  return state.kanbanPreferencesById[kanbanId];
}

function getActiveKanbanPreferences() {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return createDefaultKanbanPreferences();
  }

  return ensureKanbanPreferences(activeKanban.id);
}

function getPersistedSnapshot() {
  return {
    boards: state.boards.map((board) => ({ ...board })),
    activeBoardId: state.activeBoardId,
    blocks: state.blocks.map((block) => ({ ...block })),
    kanbans: state.kanbans.map((kanban) => ({ ...kanban })),
    kanbanStages: state.kanbanStages.map((stage) => ({ ...stage })),
    kanbanItems: state.kanbanItems.map((item) => ({ ...item })),
    activeKanbanByBoardId: { ...state.activeKanbanByBoardId },
    kanbanPreferencesById: structuredClone(state.kanbanPreferencesById),
    mindmaps: state.mindmaps.map((mindmap) => ({ ...mindmap })),
    mindmapNodes: state.mindmapNodes.map((node) => ({ ...node })),
    mindmapEdges: state.mindmapEdges.map((edge) => ({ ...edge })),
    activeMindmapByBoardId: { ...state.activeMindmapByBoardId },
  };
}

function cloneState() {
  const activeBoard = getActiveBoard();
  const activeKanban = getActiveKanban();
  const activeMindmap = getActiveMindmap();

  return {
    boards: state.boards.map((board) => ({ ...board })),
    activeBoardId: state.activeBoardId,

    board: { ...activeBoard },

    blocks: getActiveBlocks().map((block) => ({ ...block })),

    kanbans: activeBoard
      ? getBoardKanbans(activeBoard.id).map((kanban) => ({ ...kanban }))
      : [],

    activeKanbanId: activeKanban?.id || null,
    activeKanban: activeKanban ? { ...activeKanban } : null,

    activeKanbanPreferences: {
      ...getActiveKanbanPreferences(),
      expandedStageIds: [
        ...getActiveKanbanPreferences().expandedStageIds,
      ],
    },

    activeMindmapByBoardId: { ...state.activeMindmapByBoardId },

    kanbanStages: getActiveKanbanStages().map((stage) => ({ ...stage })),
    kanbanItems: getActiveKanbanItems().map((item) => ({ ...item })),

    kanbanPreferencesById: structuredClone(state.kanbanPreferencesById),

    selectedBlockIds: [...state.selectedBlockIds],

    mindmaps: activeBoard
      ? getBoardMindmaps(activeBoard.id).map((mindmap) => ({ ...mindmap }))
      : [],

    activeMindmapId: activeMindmap?.id || null,
    activeMindmap: activeMindmap ? { ...activeMindmap } : null,

    mindmapNodes: getActiveMindmapNodes().map((node) => ({ ...node })),
    mindmapEdges: getActiveMindmapEdges().map((edge) => ({ ...edge })),

    filters: {
      query: state.filters.query,
      types: new Set(state.filters.types),
      tags: new Set(state.filters.tags),
    },
  };
}

function notify(options = {}) {
  const { shouldPersist = true } = options;

  if (shouldPersist) {
    saveAppData(getPersistedSnapshot());
  }

  const snapshot = cloneState();

  subscribers.forEach((callback) => {
    callback(snapshot);
  });
}

function touchActiveBoard() {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return;
  }

  activeBoard.updatedAt = new Date().toISOString();
}

function resetTransientState() {
  state.selectedBlockIds = [];
  state.filters.query = "";
  state.filters.types = new Set(DEFAULT_VISIBLE_TYPES);
  state.filters.tags = new Set();
}

function ensureKanbanForBoard(boardId) {
  const existingKanbans = getBoardKanbans(boardId);

  if (existingKanbans.length > 0) {
    return existingKanbans[0];
  }

  const { kanban, stages } = createDefaultKanbanStructure(boardId, {
    name: "Kanban principal",
  });

  state.kanbans.push(kanban);
  state.kanbanStages.push(...stages);
  state.activeKanbanByBoardId[boardId] = kanban.id;

  return kanban;
}

function ensureMindmapForBoard(boardId) {
  const existingMindmaps = getBoardMindmaps(boardId);

  if (existingMindmaps.length > 0) {
    return existingMindmaps[0];
  }

  const { mindmap } = createDefaultMindmapStructure(boardId, {
    name: "Mapa principal",
  });

  state.mindmaps.push(mindmap);
  state.activeMindmapByBoardId[boardId] = mindmap.id;

  return mindmap;
}

function ensureStagesForKanban(kanbanId) {
  const stages = getKanbanStages(kanbanId);

  if (stages.length > 0) {
    return stages;
  }

  const defaultStages = createDefaultKanbanStructure("temp").stages.map(
    (stage) => {
      const { id, kanbanId: ignoredKanbanId, ...stageData } = stage;

      return createKanbanStageModel(kanbanId, stageData);
    }
  );

  state.kanbanStages.push(...defaultStages);

  return defaultStages;
}

function findStageByStatus(kanbanId, status = "todo") {
  const stages = ensureStagesForKanban(kanbanId);

  return (
    stages.find((stage) => stage.status === status) ||
    stages.find((stage) => stage.status === "todo") ||
    stages[0]
  );
}

function getNextKanbanItemOrder(kanbanId, stageId) {
  const items = state.kanbanItems.filter((item) => {
    return item.kanbanId === kanbanId && item.stageId === stageId;
  });

  if (items.length === 0) {
    return 1000;
  }

  return Math.max(...items.map((item) => item.order || 1000)) + 1000;
}

function ensureTaskInKanban(block, kanbanId = null) {
  if (!block || block.type !== "task") {
    return null;
  }

  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return null;
  }

  const targetKanban =
    kanbanId ||
    state.activeKanbanByBoardId[block.boardId] ||
    ensureKanbanForBoard(block.boardId).id;

  const existingItem = state.kanbanItems.find((item) => {
    return item.kanbanId === targetKanban && item.blockId === block.id;
  });

  if (existingItem) {
    return existingItem;
  }

  const stage = findStageByStatus(targetKanban, block.status || "todo");

  if (!stage) {
    return null;
  }

  const item = createKanbanItemModel({
    kanbanId: targetKanban,
    stageId: stage.id,
    blockId: block.id,
    order: getNextKanbanItemOrder(targetKanban, stage.id),
  });

  state.kanbanItems.push(item);

  return item;
}

function syncTaskItemsWithStatus(block) {
  if (!block || block.type !== "task") {
    return;
  }

  const now = new Date().toISOString();

  state.kanbanItems.forEach((item) => {
    if (item.blockId !== block.id) {
      return;
    }

    const stage = findStageByStatus(item.kanbanId, block.status || "todo");

    if (!stage) {
      return;
    }

    item.stageId = stage.id;
    item.updatedAt = now;
  });
}

function ensureKanbanDefaults() {
  state.boards.forEach((board) => {
    const kanban = ensureKanbanForBoard(board.id);

    ensureStagesForKanban(kanban.id);
    ensureKanbanPreferences(kanban.id);

    const mindmap = ensureMindmapForBoard(board.id);

    const activeKanbanId = state.activeKanbanByBoardId[board.id];
    const activeKanbanExists = getBoardKanbans(board.id).some((item) => {
      return item.id === activeKanbanId;
    });

    if (!activeKanbanExists) {
      state.activeKanbanByBoardId[board.id] = kanban.id;
    }

    const activeMindmapId = state.activeMindmapByBoardId[board.id];
    const activeMindmapExists = getBoardMindmaps(board.id).some((item) => {
      return item.id === activeMindmapId;
    });

    if (!activeMindmapExists) {
      state.activeMindmapByBoardId[board.id] = mindmap.id;
    }

    const boardTasks = state.blocks.filter((block) => {
      return block.boardId === board.id && block.type === "task";
    });

    boardTasks.forEach((task) => {
      const hasAnyKanbanItem = state.kanbanItems.some((item) => {
        return item.blockId === task.id;
      });

      if (!hasAnyKanbanItem) {
        ensureTaskInKanban(task, kanban.id);
      }
    });
  });
}

ensureKanbanDefaults();

export function subscribe(callback) {
  subscribers.add(callback);
  callback(cloneState());

  return () => {
    subscribers.delete(callback);
  };
}

export function getState() {
  return cloneState();
}

export function createBoard(name = "Novo mural") {
  const safeName = String(name).trim() || "Novo mural";

  const board = createBoardModel({
    name: safeName,
  });

  state.boards.push(board);
  state.activeBoardId = board.id;

  const { kanban, stages } = createDefaultKanbanStructure(board.id, {
    name: "Kanban principal",
  });

  state.kanbans.push(kanban);
  state.kanbanStages.push(...stages);
  state.activeKanbanByBoardId[board.id] = kanban.id;
  state.kanbanPreferencesById[kanban.id] = createDefaultKanbanPreferences();

  const { mindmap } = createDefaultMindmapStructure(board.id, {
    name: "Mapa principal",
  });

  state.mindmaps.push(mindmap);
  state.activeMindmapByBoardId[board.id] = mindmap.id;

  resetTransientState();

  notify();

  return board;
}

export function renameBoard(boardId, name) {
  const safeName = String(name).trim();

  if (!safeName) {
    return null;
  }

  const board = state.boards.find((item) => item.id === boardId);

  if (!board) {
    return null;
  }

  board.name = safeName;
  board.updatedAt = new Date().toISOString();

  notify();

  return board;
}

export function setActiveBoard(boardId) {
  const boardExists = state.boards.some((board) => board.id === boardId);

  if (!boardExists || state.activeBoardId === boardId) {
    return;
  }

  state.activeBoardId = boardId;
  ensureKanbanForBoard(boardId);
  resetTransientState();
  ensureMindmapForBoard(boardId);

  notify();
}

export function createKanban(name = "Novo Kanban") {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return null;
  }

  const safeName = String(name).trim() || "Novo Kanban";

  const { kanban, stages } = createDefaultKanbanStructure(activeBoard.id, {
    name: safeName,
  });

  state.kanbans.push(kanban);
  state.kanbanStages.push(...stages);
  state.activeKanbanByBoardId[activeBoard.id] = kanban.id;
  state.kanbanPreferencesById[kanban.id] = createDefaultKanbanPreferences();

  resetTransientState();
  touchActiveBoard();
  notify();

  return kanban;
}

export function renameKanban(kanbanId, name) {
  const safeName = String(name).trim();

  if (!safeName) {
    return null;
  }

  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return null;
  }

  const kanban = state.kanbans.find((item) => {
    return item.id === kanbanId && item.boardId === activeBoard.id;
  });

  if (!kanban) {
    return null;
  }

  kanban.name = safeName;
  kanban.updatedAt = new Date().toISOString();

  touchActiveBoard();
  notify();

  return kanban;
}

export function setActiveKanban(kanbanId) {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return;
  }

  const kanbanExists = state.kanbans.some((kanban) => {
    return kanban.id === kanbanId && kanban.boardId === activeBoard.id;
  });

  if (!kanbanExists) {
    return;
  }

  state.activeKanbanByBoardId[activeBoard.id] = kanbanId;
  ensureKanbanPreferences(kanbanId);
  resetTransientState();

  notify();
}

export function createBlock(type = "idea", overrides = {}) {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return null;
  }

  const activeBlocks = getActiveBlocks();
  const offset = activeBlocks.length * 28;

  const block = createBlockModel(type, {
    boardId: activeBoard.id,
    x: 180 + offset,
    y: 120 + offset,
    ...overrides,
  });

  state.blocks.push(block);
  state.selectedBlockIds = [block.id];

  if (block.type === "task") {
    ensureTaskInKanban(block);
  }

  touchActiveBoard();
  notify();

  return block;
}

export function updateBlock(blockId, updates) {
  const blockIndex = state.blocks.findIndex((block) => block.id === blockId);

  if (blockIndex === -1) {
    return null;
  }

  const updatedBlock = {
    ...state.blocks[blockIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  state.blocks[blockIndex] = updatedBlock;

  if (updatedBlock.type === "task") {
    ensureTaskInKanban(updatedBlock);

    if ("status" in updates) {
      syncTaskItemsWithStatus(updatedBlock);
    }
  }

  touchActiveBoard();
  notify();

  return updatedBlock;
}

export function removeBlock(blockId) {
  const nodeIdsToRemove = state.mindmapNodes
    .filter((node) => node.blockId === blockId)
    .map((node) => node.id);

  state.blocks = state.blocks.filter((block) => {
    return block.id !== blockId;
  });

  state.kanbanItems = state.kanbanItems.filter((item) => {
    return item.blockId !== blockId;
  });

  state.mindmapNodes = state.mindmapNodes.filter((node) => {
    return node.blockId !== blockId;
  });

  state.mindmapEdges = state.mindmapEdges.filter((edge) => {
    return (
      !nodeIdsToRemove.includes(edge.fromNodeId) &&
      !nodeIdsToRemove.includes(edge.toNodeId)
    );
  });

  state.selectedBlockIds = state.selectedBlockIds.filter((id) => {
    return id !== blockId;
  });

  touchActiveBoard();
  notify();
}

export function duplicateSelectedBlocks() {
  if (state.selectedBlockIds.length === 0) {
    return [];
  }

  const selectedBlocks = state.selectedBlockIds
    .map((blockId) => state.blocks.find((block) => block.id === blockId))
    .filter(Boolean);

  if (selectedBlocks.length === 0) {
    return [];
  }

  const now = new Date().toISOString();

  const duplicatedBlocks = selectedBlocks.map((block, index) => {
    const {
      id,
      createdAt,
      updatedAt,
      ...copyableBlockData
    } = block;

    return createBlockModel(block.type, {
      ...copyableBlockData,

      boardId: getActiveBoard().id,

      title: block.title,
      content: block.content,

      x: block.x + 32 + index * 12,
      y: block.y + 32 + index * 12,

      createdAt: now,
      updatedAt: now,
    });
  });

  state.blocks.push(...duplicatedBlocks);

  duplicatedBlocks.forEach((block) => {
    if (block.type === "task") {
      ensureTaskInKanban(block);
    }
  });

  state.selectedBlockIds = duplicatedBlocks.map((block) => block.id);

  touchActiveBoard();
  notify();

  return duplicatedBlocks;
}

export function replaceBoardData(importedData) {
  const activeBoard = getActiveBoard();
  const now = new Date().toISOString();

  if (!activeBoard) {
    return;
  }

  const importedBoard = importedData?.board || {};
  const importedBlocks = Array.isArray(importedData?.blocks)
    ? importedData.blocks
    : [];

  activeBoard.name = importedBoard.name || activeBoard.name;
  activeBoard.activeMode = importedBoard.activeMode || "free";
  activeBoard.viewport = {
    x: importedBoard.viewport?.x || 0,
    y: importedBoard.viewport?.y || 0,
    zoom: importedBoard.viewport?.zoom || 1,
  };
  activeBoard.updatedAt = now;

  const currentKanbanIds = getBoardKanbans(activeBoard.id).map((kanban) => {
    return kanban.id;
  });

  currentKanbanIds.forEach((kanbanId) => {
    delete state.kanbanPreferencesById[kanbanId];
  });

  state.blocks = state.blocks.filter((block) => block.boardId !== activeBoard.id);

  state.kanbans = state.kanbans.filter((kanban) => {
    return kanban.boardId !== activeBoard.id;
  });

  state.kanbanStages = state.kanbanStages.filter((stage) => {
    return !currentKanbanIds.includes(stage.kanbanId);
  });

  state.kanbanItems = state.kanbanItems.filter((item) => {
    return !currentKanbanIds.includes(item.kanbanId);
  });

  const nextBlocks = importedBlocks.map((block) => {
    const fallbackBlock = createBlockModel(block.type || "idea");

    return {
      ...fallbackBlock,
      ...block,
      id: block.id || fallbackBlock.id,
      boardId: activeBoard.id,
      updatedAt: block.updatedAt || now,
    };
  });

  state.blocks.push(...nextBlocks);

  const importedKanbans = Array.isArray(importedData?.kanbans)
    ? importedData.kanbans
    : [];

  if (importedKanbans.length > 0) {
    const nextKanbans = importedKanbans.map((kanban) => {
      return {
        ...createKanbanModel(activeBoard.id),
        ...kanban,
        boardId: activeBoard.id,
        updatedAt: kanban.updatedAt || now,
      };
    });

    const nextKanbanIds = nextKanbans.map((kanban) => kanban.id);

    const nextStages = Array.isArray(importedData?.kanbanStages)
      ? importedData.kanbanStages
          .filter((stage) => nextKanbanIds.includes(stage.kanbanId))
          .map((stage) => ({
            ...createKanbanStageModel(stage.kanbanId),
            ...stage,
            updatedAt: stage.updatedAt || now,
          }))
      : [];

    const nextItems = Array.isArray(importedData?.kanbanItems)
      ? importedData.kanbanItems
          .filter((item) => {
            return (
              nextKanbanIds.includes(item.kanbanId) &&
              nextBlocks.some((block) => block.id === item.blockId)
            );
          })
          .map((item) => ({
            ...createKanbanItemModel(),
            ...item,
            updatedAt: item.updatedAt || now,
          }))
      : [];

    state.kanbans.push(...nextKanbans);
    state.kanbanStages.push(...nextStages);
    state.kanbanItems.push(...nextItems);

    const importedActiveKanbanId =
      importedData?.activeKanbanByBoardId?.[importedData.activeBoardId] ||
      importedData?.activeKanbanByBoardId?.[importedBoard.id] ||
      importedData?.activeKanbanId;

    state.activeKanbanByBoardId[activeBoard.id] = nextKanbanIds.includes(
      importedActiveKanbanId
    )
      ? importedActiveKanbanId
      : nextKanbans[0].id;

    const importedPreferences =
      importedData?.kanbanPreferencesById &&
      typeof importedData.kanbanPreferencesById === "object"
        ? importedData.kanbanPreferencesById
        : {};

    nextKanbans.forEach((kanban) => {
      state.kanbanPreferencesById[kanban.id] =
        normalizeKanbanPreferences(importedPreferences[kanban.id]);
    });
  } else {
    const { kanban, stages } = createDefaultKanbanStructure(activeBoard.id, {
      name: "Kanban principal",
    });

    state.kanbans.push(kanban);
    state.kanbanStages.push(...stages);
    state.activeKanbanByBoardId[activeBoard.id] = kanban.id;
    state.kanbanPreferencesById[kanban.id] = createDefaultKanbanPreferences();
  }

  const currentMindmapIds = getBoardMindmaps(activeBoard.id).map((mindmap) => {
    return mindmap.id;
  });

  state.mindmaps = state.mindmaps.filter((mindmap) => {
    return mindmap.boardId !== activeBoard.id;
  });

  state.mindmapNodes = state.mindmapNodes.filter((node) => {
    return !currentMindmapIds.includes(node.mindmapId);
  });

  state.mindmapEdges = state.mindmapEdges.filter((edge) => {
    return !currentMindmapIds.includes(edge.mindmapId);
  });

  const importedMindmaps = Array.isArray(importedData?.mindmaps)
  ? importedData.mindmaps
  : [];

  if (importedMindmaps.length > 0) {
    const nextMindmaps = importedMindmaps.map((mindmap) => {
      return {
        ...createMindmapModel(activeBoard.id),
        ...mindmap,
        boardId: activeBoard.id,
        updatedAt: mindmap.updatedAt || now,
      };
    });

    const nextMindmapIds = nextMindmaps.map((mindmap) => mindmap.id);

    const nextMindmapNodes = Array.isArray(importedData?.mindmapNodes)
      ? importedData.mindmapNodes
          .filter((node) => {
            return (
              nextMindmapIds.includes(node.mindmapId) &&
              nextBlocks.some((block) => block.id === node.blockId)
            );
          })
          .map((node) => ({
            ...createMindmapNodeModel(node.mindmapId, node.blockId),
            ...node,
            updatedAt: node.updatedAt || now,
          }))
      : [];

    const nextNodeIds = nextMindmapNodes.map((node) => node.id);

    const nextMindmapEdges = Array.isArray(importedData?.mindmapEdges)
      ? importedData.mindmapEdges
          .filter((edge) => {
            return (
              nextMindmapIds.includes(edge.mindmapId) &&
              nextNodeIds.includes(edge.fromNodeId) &&
              nextNodeIds.includes(edge.toNodeId)
            );
          })
          .map((edge) => ({
            ...createMindmapEdgeModel(
              edge.mindmapId,
              edge.fromNodeId,
              edge.toNodeId
            ),
            ...edge,
            updatedAt: edge.updatedAt || now,
          }))
      : [];

    state.mindmaps.push(...nextMindmaps);
    state.mindmapNodes.push(...nextMindmapNodes);
    state.mindmapEdges.push(...nextMindmapEdges);

    const importedActiveMindmapId =
      importedData?.activeMindmapByBoardId?.[importedData.activeBoardId] ||
      importedData?.activeMindmapByBoardId?.[importedBoard.id] ||
      importedData?.activeMindmapId;

    state.activeMindmapByBoardId[activeBoard.id] = nextMindmapIds.includes(
      importedActiveMindmapId
    )
      ? importedActiveMindmapId
      : nextMindmaps[0].id;
  } else {
    const { mindmap } = createDefaultMindmapStructure(activeBoard.id, {
      name: "Mapa principal",
    });

    state.mindmaps.push(mindmap);
    state.activeMindmapByBoardId[activeBoard.id] = mindmap.id;
  }

  ensureKanbanDefaults();

  resetTransientState();
  touchActiveBoard();
  notify();
}

export function selectBlock(blockId, options = {}) {
  const { append = false } = options;

  const blockExists = getActiveBlocks().some((block) => block.id === blockId);

  if (!blockExists) {
    return;
  }

  if (append) {
    const alreadySelected = state.selectedBlockIds.includes(blockId);

    state.selectedBlockIds = alreadySelected
      ? state.selectedBlockIds.filter((id) => id !== blockId)
      : [...state.selectedBlockIds, blockId];
  } else {
    state.selectedBlockIds = [blockId];
  }

  notify({
    shouldPersist: false,
  });
}

export function clearSelection() {
  if (state.selectedBlockIds.length === 0) {
    return;
  }

  state.selectedBlockIds = [];

  notify({
    shouldPersist: false,
  });
}

export function setActiveMode(mode) {
  const activeBoard = getActiveBoard();

  if (!activeBoard || activeBoard.activeMode === mode) {
    return;
  }

  activeBoard.activeMode = mode;

  touchActiveBoard();
  notify();
}

export function setViewport(updates, options = {}) {
  const { shouldPersist = true } = options;
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return;
  }

  const currentViewport = activeBoard.viewport || defaultBoard.viewport;

  activeBoard.viewport = {
    ...currentViewport,
    ...updates,
  };

  touchActiveBoard();

  notify({
    shouldPersist,
  });
}

export function createKanbanStage(name = "Nova etapa") {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return null;
  }

  const stages = getKanbanStages(activeKanban.id);
  const maxOrder =
    stages.length > 0 ? Math.max(...stages.map((stage) => stage.order || 1000)) : 0;

  const stage = createKanbanStageModel(activeKanban.id, {
    name: String(name).trim() || "Nova etapa",
    status: "todo",
    color: "blue",
    order: maxOrder + 1000,
  });

  state.kanbanStages.push(stage);

  touchActiveBoard();
  notify();

  return stage;
}

export function updateKanbanStage(stageId, updates = {}) {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return null;
  }

  const stageIndex = state.kanbanStages.findIndex((stage) => {
    return stage.id === stageId && stage.kanbanId === activeKanban.id;
  });

  if (stageIndex === -1) {
    return null;
  }

  const currentStage = state.kanbanStages[stageIndex];

  const nextStage = {
    ...currentStage,
    ...updates,
    name: updates.name !== undefined
      ? String(updates.name).trim() || currentStage.name
      : currentStage.name,
    updatedAt: new Date().toISOString(),
  };

  state.kanbanStages[stageIndex] = nextStage;

  if (updates.status && updates.status !== currentStage.status) {
    const affectedItems = state.kanbanItems.filter((item) => {
      return item.stageId === stageId && item.kanbanId === activeKanban.id;
    });

    affectedItems.forEach((item) => {
      const blockIndex = state.blocks.findIndex((block) => {
        return block.id === item.blockId && block.type === "task";
      });

      if (blockIndex === -1) {
        return;
      }

      state.blocks[blockIndex] = {
        ...state.blocks[blockIndex],
        status: updates.status,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  touchActiveBoard();
  notify();

  return nextStage;
}

export function moveKanbanStage(stageId, direction = "right") {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return;
  }

  const stages = getKanbanStages(activeKanban.id);
  const currentIndex = stages.findIndex((stage) => stage.id === stageId);

  if (currentIndex === -1) {
    return;
  }

  const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= stages.length) {
    return;
  }

  const currentStage = stages[currentIndex];
  const targetStage = stages[targetIndex];

  const currentStateStage = state.kanbanStages.find((stage) => {
    return stage.id === currentStage.id;
  });

  const targetStateStage = state.kanbanStages.find((stage) => {
    return stage.id === targetStage.id;
  });

  if (!currentStateStage || !targetStateStage) {
    return;
  }

  const currentOrder = currentStateStage.order;
  currentStateStage.order = targetStateStage.order;
  targetStateStage.order = currentOrder;

  currentStateStage.updatedAt = new Date().toISOString();
  targetStateStage.updatedAt = new Date().toISOString();

  touchActiveBoard();
  notify();
}

export function createTaskInKanbanStage(stageId) {
  const activeBoard = getActiveBoard();
  const activeKanban = getActiveKanban();

  if (!activeBoard || !activeKanban) {
    return null;
  }

  const stage = state.kanbanStages.find((item) => {
    return item.id === stageId && item.kanbanId === activeKanban.id;
  });

  if (!stage) {
    return null;
  }

  const activeBlocks = getActiveBlocks();
  const offset = activeBlocks.length * 28;

  const block = createBlockModel("task", {
    boardId: activeBoard.id,
    status: stage.status || "todo",
    x: 180 + offset,
    y: 120 + offset,
  });

  state.blocks.push(block);

  const item = createKanbanItemModel({
    kanbanId: activeKanban.id,
    stageId: stage.id,
    blockId: block.id,
    order: getNextKanbanItemOrder(activeKanban.id, stage.id),
  });

  state.kanbanItems.push(item);
  state.selectedBlockIds = [block.id];

  touchActiveBoard();
  notify();

  return block;
}

export function moveKanbanItem(kanbanItemId, nextStageId, orderedItemIds = []) {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return null;
  }

  const targetStage = state.kanbanStages.find((stage) => {
    return stage.id === nextStageId && stage.kanbanId === activeKanban.id;
  });

  if (!targetStage) {
    return null;
  }

  const item = state.kanbanItems.find((kanbanItem) => {
    return kanbanItem.id === kanbanItemId && kanbanItem.kanbanId === activeKanban.id;
  });

  if (!item) {
    return null;
  }

  const now = new Date().toISOString();

  item.stageId = nextStageId;
  item.updatedAt = now;

  orderedItemIds.forEach((itemId, index) => {
    const orderedItem = state.kanbanItems.find((kanbanItem) => {
      return kanbanItem.id === itemId && kanbanItem.kanbanId === activeKanban.id;
    });

    if (!orderedItem) {
      return;
    }

    orderedItem.stageId = nextStageId;
    orderedItem.order = (index + 1) * 1000;
    orderedItem.updatedAt = now;
  });

  const blockIndex = state.blocks.findIndex((block) => {
    return block.id === item.blockId && block.type === "task";
  });

  if (blockIndex !== -1) {
    state.blocks[blockIndex] = {
      ...state.blocks[blockIndex],
      status: targetStage.status || "todo",
      updatedAt: now,
    };
  }

  touchActiveBoard();
  notify();

  return item;
}

export function deleteKanban(kanbanId) {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return {
      ok: false,
      reason: "no-board",
    };
  }

  const boardKanbans = getBoardKanbans(activeBoard.id);

  if (boardKanbans.length <= 1) {
    return {
      ok: false,
      reason: "last-kanban",
    };
  }

  const kanbanToDelete = boardKanbans.find((kanban) => {
    return kanban.id === kanbanId;
  });

  if (!kanbanToDelete) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const nextKanban = boardKanbans.find((kanban) => {
    return kanban.id !== kanbanId;
  });

  const stageIds = state.kanbanStages
    .filter((stage) => stage.kanbanId === kanbanId)
    .map((stage) => stage.id);

  state.kanbans = state.kanbans.filter((kanban) => {
    return kanban.id !== kanbanId;
  });

  state.kanbanStages = state.kanbanStages.filter((stage) => {
    return stage.kanbanId !== kanbanId;
  });

  state.kanbanItems = state.kanbanItems.filter((item) => {
    return item.kanbanId !== kanbanId && !stageIds.includes(item.stageId);
  });

  delete state.kanbanPreferencesById[kanbanId];

  if (state.activeKanbanByBoardId[activeBoard.id] === kanbanId) {
    state.activeKanbanByBoardId[activeBoard.id] = nextKanban.id;
  }

  resetTransientState();
  touchActiveBoard();
  notify();

  return {
    ok: true,
    deletedKanban: kanbanToDelete,
    activeKanban: nextKanban,
  };
}

export function deleteKanbanStage(stageId, targetStageId = null) {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return {
      ok: false,
      reason: "no-kanban",
    };
  }

  const stages = getKanbanStages(activeKanban.id);

  if (stages.length <= 1) {
    return {
      ok: false,
      reason: "last-stage",
    };
  }

  const stageToDelete = stages.find((stage) => stage.id === stageId);

  if (!stageToDelete) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const affectedItems = state.kanbanItems.filter((item) => {
    return item.kanbanId === activeKanban.id && item.stageId === stageId;
  });

  let targetStage = null;

  if (affectedItems.length > 0) {
    targetStage = stages.find((stage) => {
      return stage.id === targetStageId && stage.id !== stageId;
    });

    if (!targetStage) {
      return {
        ok: false,
        reason: "target-required",
      };
    }
  }

  const now = new Date().toISOString();

  if (targetStage) {
    const currentTargetItems = state.kanbanItems.filter((item) => {
      return item.kanbanId === activeKanban.id && item.stageId === targetStage.id;
    });

    const baseOrder =
      currentTargetItems.length > 0
        ? Math.max(...currentTargetItems.map((item) => item.order || 1000))
        : 0;

    affectedItems.forEach((item, index) => {
      item.stageId = targetStage.id;
      item.order = baseOrder + (index + 1) * 1000;
      item.updatedAt = now;

      const blockIndex = state.blocks.findIndex((block) => {
        return block.id === item.blockId && block.type === "task";
      });

      if (blockIndex === -1) {
        return;
      }

      state.blocks[blockIndex] = {
        ...state.blocks[blockIndex],
        status: targetStage.status || "todo",
        updatedAt: now,
      };
    });
  }

  state.kanbanStages = state.kanbanStages.filter((stage) => {
    return stage.id !== stageId;
  });

  const preferences = ensureKanbanPreferences(activeKanban.id);

  preferences.expandedStageIds = preferences.expandedStageIds.filter((id) => {
    return id !== stageId;
  });

  resetTransientState();
  touchActiveBoard();
  notify();

  return {
    ok: true,
    deletedStage: stageToDelete,
    movedItems: affectedItems.length,
    targetStage,
  };
}

export function addTaskToActiveKanban(blockId, stageId = null) {
  const activeBoard = getActiveBoard();
  const activeKanban = getActiveKanban();

  if (!activeBoard || !activeKanban) {
    return {
      ok: false,
      reason: "no-kanban",
    };
  }

  const task = state.blocks.find((block) => {
    return (
      block.id === blockId &&
      block.boardId === activeBoard.id &&
      block.type === "task"
    );
  });

  if (!task) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const alreadyExists = state.kanbanItems.some((item) => {
    return item.kanbanId === activeKanban.id && item.blockId === task.id;
  });

  if (alreadyExists) {
    return {
      ok: false,
      reason: "already-exists",
    };
  }

  const stages = getKanbanStages(activeKanban.id);

  const targetStage =
    stages.find((stage) => stage.id === stageId) ||
    stages.find((stage) => stage.status === "todo") ||
    stages[0];

  if (!targetStage) {
    return {
      ok: false,
      reason: "no-stage",
    };
  }

  const now = new Date().toISOString();

  const item = createKanbanItemModel({
    kanbanId: activeKanban.id,
    stageId: targetStage.id,
    blockId: task.id,
    order: getNextKanbanItemOrder(activeKanban.id, targetStage.id),
  });

  state.kanbanItems.push(item);

  const blockIndex = state.blocks.findIndex((block) => block.id === task.id);

  if (blockIndex !== -1) {
    state.blocks[blockIndex] = {
      ...state.blocks[blockIndex],
      status: targetStage.status || "todo",
      updatedAt: now,
    };
  }

  state.selectedBlockIds = [task.id];

  touchActiveBoard();
  notify();

  return {
    ok: true,
    item,
    task,
    stage: targetStage,
  };
}

export function removeTaskFromActiveKanban(kanbanItemId) {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return {
      ok: false,
      reason: "no-kanban",
    };
  }

  const item = state.kanbanItems.find((kanbanItem) => {
    return (
      kanbanItem.id === kanbanItemId &&
      kanbanItem.kanbanId === activeKanban.id
    );
  });

  if (!item) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const task = state.blocks.find((block) => block.id === item.blockId);

  state.kanbanItems = state.kanbanItems.filter((kanbanItem) => {
    return kanbanItem.id !== kanbanItemId;
  });

  state.selectedBlockIds = state.selectedBlockIds.filter((blockId) => {
    return blockId !== item.blockId;
  });

  touchActiveBoard();
  notify();

  return {
    ok: true,
    item,
    task,
  };
}

export function setActiveKanbanViewOption(field, value) {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return;
  }

  const preferences = ensureKanbanPreferences(activeKanban.id);

  const nextPreferences = normalizeKanbanPreferences({
    ...preferences,
    [field]: value,
  });

  state.kanbanPreferencesById[activeKanban.id] = nextPreferences;

  touchActiveBoard();
  notify();
}

export function resetActiveKanbanViewOptions() {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return;
  }

  const currentPreferences = ensureKanbanPreferences(activeKanban.id);

  state.kanbanPreferencesById[activeKanban.id] = {
    ...createDefaultKanbanPreferences(),
    expandedStageIds: [...currentPreferences.expandedStageIds],
  };

  touchActiveBoard();
  notify();
}

export function toggleActiveKanbanStageExpanded(stageId) {
  const activeKanban = getActiveKanban();

  if (!activeKanban) {
    return;
  }

  const stageExists = state.kanbanStages.some((stage) => {
    return stage.id === stageId && stage.kanbanId === activeKanban.id;
  });

  if (!stageExists) {
    return;
  }

  const preferences = ensureKanbanPreferences(activeKanban.id);

  const expanded = new Set(preferences.expandedStageIds);

  if (expanded.has(stageId)) {
    expanded.delete(stageId);
  } else {
    expanded.add(stageId);
  }

  preferences.expandedStageIds = [...expanded];

  touchActiveBoard();
  notify();
}

function getMindmapDescendantNodeIds(mindmapId, nodeId) {
  const descendantIds = [];
  const pendingIds = [nodeId];

  while (pendingIds.length > 0) {
    const currentNodeId = pendingIds.shift();

    const children = state.mindmapNodes.filter((node) => {
      return (
        node.mindmapId === mindmapId &&
        node.parentNodeId === currentNodeId
      );
    });

    children.forEach((child) => {
      descendantIds.push(child.id);
      pendingIds.push(child.id);
    });
  }

  return descendantIds;
}

function mindmapEdgeExists(mindmapId, fromNodeId, toNodeId) {
  return state.mindmapEdges.some((edge) => {
    return (
      edge.mindmapId === mindmapId &&
      edge.fromNodeId === fromNodeId &&
      edge.toNodeId === toNodeId
    );
  });
}

export function createMindmap(name = "Novo mapa") {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return null;
  }

  const safeName = String(name).trim() || "Novo mapa";

  const mindmap = createMindmapModel(activeBoard.id, {
    name: safeName,
  });

  state.mindmaps.push(mindmap);
  state.activeMindmapByBoardId[activeBoard.id] = mindmap.id;

  resetTransientState();
  touchActiveBoard();
  notify();

  return mindmap;
}

export function renameMindmap(mindmapId, name) {
  const safeName = String(name).trim();

  if (!safeName) {
    return null;
  }

  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return null;
  }

  const mindmap = state.mindmaps.find((item) => {
    return item.id === mindmapId && item.boardId === activeBoard.id;
  });

  if (!mindmap) {
    return null;
  }

  mindmap.name = safeName;
  mindmap.updatedAt = new Date().toISOString();

  touchActiveBoard();
  notify();

  return mindmap;
}

export function setActiveMindmap(mindmapId) {
  const activeBoard = getActiveBoard();

  if (!activeBoard) {
    return;
  }

  const mindmapExists = state.mindmaps.some((mindmap) => {
    return mindmap.id === mindmapId && mindmap.boardId === activeBoard.id;
  });

  if (!mindmapExists) {
    return;
  }

  state.activeMindmapByBoardId[activeBoard.id] = mindmapId;
  resetTransientState();

  notify();
}

export function createMindmapNodeForBlock(blockId, overrides = {}) {
  const activeBoard = getActiveBoard();
  const activeMindmap = getActiveMindmap();

  if (!activeBoard || !activeMindmap) {
    return null;
  }

  const block = state.blocks.find((item) => {
    return item.id === blockId && item.boardId === activeBoard.id;
  });

  if (!block) {
    return null;
  }

  const alreadyExists = state.mindmapNodes.find((node) => {
    return node.mindmapId === activeMindmap.id && node.blockId === blockId;
  });

  if (alreadyExists) {
    return alreadyExists;
  }

  const node = createMindmapNodeModel(activeMindmap.id, blockId, overrides);

  state.mindmapNodes.push(node);

  touchActiveBoard();
  notify();

  return node;
}

export function updateMindmapNode(nodeId, updates = {}) {
  const activeMindmap = getActiveMindmap();

  if (!activeMindmap) {
    return null;
  }

  const nodeIndex = state.mindmapNodes.findIndex((node) => {
    return node.id === nodeId && node.mindmapId === activeMindmap.id;
  });

  if (nodeIndex === -1) {
    return null;
  }

  const currentNode = state.mindmapNodes[nodeIndex];

  const nextNode = {
    ...currentNode,
    ...updates,
    x: updates.x !== undefined ? Number(updates.x) : currentNode.x,
    y: updates.y !== undefined ? Number(updates.y) : currentNode.y,
    width: updates.width !== undefined ? Number(updates.width) : currentNode.width,
    updatedAt: new Date().toISOString(),
  };

  state.mindmapNodes[nodeIndex] = nextNode;

  touchActiveBoard();
  notify();

  return nextNode;
}

export function createMindmapEdge(fromNodeId, toNodeId) {
  const activeMindmap = getActiveMindmap();

  if (!activeMindmap) {
    return null;
  }

  if (fromNodeId === toNodeId) {
    return null;
  }

  const fromNodeExists = state.mindmapNodes.some((node) => {
    return node.id === fromNodeId && node.mindmapId === activeMindmap.id;
  });

  const toNodeExists = state.mindmapNodes.some((node) => {
    return node.id === toNodeId && node.mindmapId === activeMindmap.id;
  });

  if (!fromNodeExists || !toNodeExists) {
    return null;
  }

  const existingEdge = state.mindmapEdges.find((edge) => {
    return (
      edge.mindmapId === activeMindmap.id &&
      edge.fromNodeId === fromNodeId &&
      edge.toNodeId === toNodeId
    );
  });

  if (existingEdge) {
    return existingEdge;
  }

  const edge = createMindmapEdgeModel(activeMindmap.id, fromNodeId, toNodeId);

  state.mindmapEdges.push(edge);

  touchActiveBoard();
  notify();

  return edge;
}

export function deleteMindmapNode(nodeId) {
  const activeMindmap = getActiveMindmap();

  if (!activeMindmap) {
    return {
      ok: false,
      reason: "no-mindmap",
    };
  }

  const node = state.mindmapNodes.find((item) => {
    return item.id === nodeId && item.mindmapId === activeMindmap.id;
  });

  if (!node) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const now = new Date().toISOString();

  const childNodes = state.mindmapNodes.filter((item) => {
    return (
      item.mindmapId === activeMindmap.id &&
      item.parentNodeId === node.id
    );
  });

  const parentNodeId = node.parentNodeId || null;

  childNodes.forEach((childNode) => {
    childNode.parentNodeId = parentNodeId;
    childNode.updatedAt = now;
  });

  state.mindmapEdges = state.mindmapEdges.filter((edge) => {
    return (
      edge.mindmapId !== activeMindmap.id ||
      (edge.fromNodeId !== node.id && edge.toNodeId !== node.id)
    );
  });

  if (parentNodeId) {
    childNodes.forEach((childNode) => {
      if (mindmapEdgeExists(activeMindmap.id, parentNodeId, childNode.id)) {
        return;
      }

      const edge = createMindmapEdgeModel(
        activeMindmap.id,
        parentNodeId,
        childNode.id
      );

      state.mindmapEdges.push(edge);
    });
  }

  state.mindmapNodes = state.mindmapNodes.filter((item) => {
    return item.id !== node.id;
  });

  state.selectedBlockIds = state.selectedBlockIds.filter((blockId) => {
    return blockId !== node.blockId;
  });

  touchActiveBoard();
  notify();

  return {
    ok: true,
    deletedNode: node,
    reparentedChildren: childNodes.length,
  };
}

export function deleteMindmapBranch(nodeId) {
  const activeMindmap = getActiveMindmap();

  if (!activeMindmap) {
    return {
      ok: false,
      reason: "no-mindmap",
    };
  }

  const rootNode = state.mindmapNodes.find((node) => {
    return node.id === nodeId && node.mindmapId === activeMindmap.id;
  });

  if (!rootNode) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  const descendantNodeIds = getMindmapDescendantNodeIds(
    activeMindmap.id,
    rootNode.id
  );

  const nodeIdsToRemove = [rootNode.id, ...descendantNodeIds];

  const removedBlockIds = state.mindmapNodes
    .filter((node) => nodeIdsToRemove.includes(node.id))
    .map((node) => node.blockId);

  state.mindmapNodes = state.mindmapNodes.filter((node) => {
    return !nodeIdsToRemove.includes(node.id);
  });

  state.mindmapEdges = state.mindmapEdges.filter((edge) => {
    return (
      edge.mindmapId !== activeMindmap.id ||
      (
        !nodeIdsToRemove.includes(edge.fromNodeId) &&
        !nodeIdsToRemove.includes(edge.toNodeId)
      )
    );
  });

  state.selectedBlockIds = state.selectedBlockIds.filter((blockId) => {
    return !removedBlockIds.includes(blockId);
  });

  touchActiveBoard();
  notify();

  return {
    ok: true,
    deletedRootNode: rootNode,
    deletedNodesCount: nodeIdsToRemove.length,
  };
}



export function setSearchQuery(query) {
  state.filters.query = query.trim().toLowerCase();

  notify({
    shouldPersist: false,
  });
}

export function setTypeFilter(type, isVisible) {
  if (isVisible) {
    state.filters.types.add(type);
  } else {
    state.filters.types.delete(type);
  }

  notify({
    shouldPersist: false,
  });
}

export function setTagFilter(tag, isVisible) {
  const normalizedTag = String(tag).trim().toLowerCase();

  if (!normalizedTag) {
    return;
  }

  if (isVisible) {
    state.filters.tags.add(normalizedTag);
  } else {
    state.filters.tags.delete(normalizedTag);
  }

  notify({
    shouldPersist: false,
  });
}

export function clearTagFilters() {
  if (state.filters.tags.size === 0) {
    return;
  }

  state.filters.tags = new Set();

  notify({
    shouldPersist: false,
  });
}
