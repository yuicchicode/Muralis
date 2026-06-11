const STORAGE_KEY = "muralis:app:v1";
const STORAGE_VERSION = 5;

function createFallbackBoard() {
  const now = new Date().toISOString();

  return {
    id: "board_main",
    name: "Meu primeiro mural",
    activeMode: "free",
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeViewport(viewport = {}) {
  return {
    x: Number.isFinite(viewport.x) ? viewport.x : 0,
    y: Number.isFinite(viewport.y) ? viewport.y : 0,
    zoom: Number.isFinite(viewport.zoom) ? viewport.zoom : 1,
  };
}

function normalizeBoard(board = {}, fallbackBoard = createFallbackBoard()) {
  return {
    ...fallbackBoard,
    ...board,
    id: board.id || fallbackBoard.id,
    name: board.name || fallbackBoard.name,
    activeMode: board.activeMode || "free",
    viewport: normalizeViewport(board.viewport),
    createdAt: board.createdAt || fallbackBoard.createdAt,
    updatedAt: board.updatedAt || fallbackBoard.updatedAt,
  };
}

function normalizeBlocks(blocks = [], fallbackBoardId = "board_main") {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks.map((block) => {
    return {
      ...block,
      boardId: block.boardId || fallbackBoardId,
    };
  });
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

    due: dueValues.includes(preferences.due) ? preferences.due : "all",

    completion: completionValues.includes(preferences.completion)
      ? preferences.completion
      : "all",

    sort: sortValues.includes(preferences.sort) ? preferences.sort : "manual",

    expandedStageIds: Array.isArray(preferences.expandedStageIds)
      ? preferences.expandedStageIds.filter((stageId) => typeof stageId === "string")
      : [],
  };
}

function normalizeKanbanPreferencesById(preferencesById = {}) {
  if (!preferencesById || typeof preferencesById !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(preferencesById).map(([kanbanId, preferences]) => {
      return [kanbanId, normalizeKanbanPreferences(preferences)];
    })
  );
}

function normalizeV5Payload(payload) {
  const fallbackBoard = createFallbackBoard();

  const boards =
    Array.isArray(payload.boards) && payload.boards.length > 0
      ? payload.boards.map((board) => normalizeBoard(board, fallbackBoard))
      : [fallbackBoard];

  const activeBoardId = boards.some((board) => board.id === payload.activeBoardId)
    ? payload.activeBoardId
    : boards[0].id;

  return {
    boards,
    activeBoardId,
    blocks: normalizeBlocks(payload.blocks, activeBoardId),

    kanbans: Array.isArray(payload.kanbans) ? payload.kanbans : [],

    kanbanStages: Array.isArray(payload.kanbanStages)
      ? payload.kanbanStages
      : [],

    kanbanItems: Array.isArray(payload.kanbanItems)
      ? payload.kanbanItems
      : [],

    activeKanbanByBoardId:
      payload.activeKanbanByBoardId &&
      typeof payload.activeKanbanByBoardId === "object"
        ? payload.activeKanbanByBoardId
        : {},

    kanbanPreferencesById: normalizeKanbanPreferencesById(
      payload.kanbanPreferencesById
    ),

    mindmaps: Array.isArray(payload.mindmaps) ? payload.mindmaps : [],

    mindmapNodes: Array.isArray(payload.mindmapNodes)
      ? payload.mindmapNodes
      : [],

    mindmapEdges: Array.isArray(payload.mindmapEdges)
      ? payload.mindmapEdges
      : [],

    activeMindmapByBoardId:
      payload.activeMindmapByBoardId &&
      typeof payload.activeMindmapByBoardId === "object"
        ? payload.activeMindmapByBoardId
        : {},
  };
}

function migrateV1ToV5(payload) {
  const fallbackBoard = createFallbackBoard();

  const board = normalizeBoard(
    {
      id: payload.board?.id || "board_main",
      name: payload.board?.name || "Meu primeiro mural",
      activeMode: payload.board?.activeMode || "free",
      viewport: payload.board?.viewport,
      createdAt: payload.board?.createdAt,
      updatedAt: payload.board?.updatedAt,
    },
    fallbackBoard
  );

  return {
    boards: [board],
    activeBoardId: board.id,
    blocks: normalizeBlocks(payload.blocks, board.id),

    kanbans: [],
    kanbanStages: [],
    kanbanItems: [],
    activeKanbanByBoardId: {},
    kanbanPreferencesById: {},

    mindmaps: [],
    mindmapNodes: [],
    mindmapEdges: [],
    activeMindmapByBoardId: {},
  };
}

function migrateV2ToV5(payload) {
  return normalizeV5Payload({
    boards: payload.boards,
    activeBoardId: payload.activeBoardId,
    blocks: payload.blocks,

    kanbans: [],
    kanbanStages: [],
    kanbanItems: [],
    activeKanbanByBoardId: {},
    kanbanPreferencesById: {},

    mindmaps: [],
    mindmapNodes: [],
    mindmapEdges: [],
    activeMindmapByBoardId: {},
  });
}

function migrateV3ToV5(payload) {
  return normalizeV5Payload({
    boards: payload.boards,
    activeBoardId: payload.activeBoardId,
    blocks: payload.blocks,

    kanbans: payload.kanbans,
    kanbanStages: payload.kanbanStages,
    kanbanItems: payload.kanbanItems,
    activeKanbanByBoardId: payload.activeKanbanByBoardId,
    kanbanPreferencesById: {},

    mindmaps: [],
    mindmapNodes: [],
    mindmapEdges: [],
    activeMindmapByBoardId: {},
  });
}

function migrateV4ToV5(payload) {
  return normalizeV5Payload({
    boards: payload.boards,
    activeBoardId: payload.activeBoardId,
    blocks: payload.blocks,

    kanbans: payload.kanbans,
    kanbanStages: payload.kanbanStages,
    kanbanItems: payload.kanbanItems,
    activeKanbanByBoardId: payload.activeKanbanByBoardId,
    kanbanPreferencesById: payload.kanbanPreferencesById,

    mindmaps: [],
    mindmapNodes: [],
    mindmapEdges: [],
    activeMindmapByBoardId: {},
  });
}

export function loadAppData() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);

    if (!rawData) {
      return null;
    }

    const payload = JSON.parse(rawData);

    if (payload?.version === 5) {
      return normalizeV5Payload(payload);
    }

    if (payload?.version === 4) {
      return migrateV4ToV5(payload);
    }

    if (payload?.version === 3) {
      return migrateV3ToV5(payload);
    }

    if (payload?.version === 2) {
      return migrateV2ToV5(payload);
    }

    if (payload?.version === 1 && payload.board && Array.isArray(payload.blocks)) {
      return migrateV1ToV5(payload);
    }

    if (Array.isArray(payload?.boards) && Array.isArray(payload?.blocks)) {
      return migrateV2ToV5(payload);
    }

    console.warn("Dados locais do Muralis estão em um formato inválido.");
    return null;
  } catch (error) {
    console.warn("Não foi possível carregar os dados locais do Muralis.", error);
    return null;
  }
}

export function saveAppData(snapshot) {
  try {
    const normalizedSnapshot = normalizeV5Payload({
      boards: snapshot.boards,
      activeBoardId: snapshot.activeBoardId,
      blocks: snapshot.blocks,

      kanbans: snapshot.kanbans,
      kanbanStages: snapshot.kanbanStages,
      kanbanItems: snapshot.kanbanItems,
      activeKanbanByBoardId: snapshot.activeKanbanByBoardId,
      kanbanPreferencesById: snapshot.kanbanPreferencesById,

      mindmaps: snapshot.mindmaps,
      mindmapNodes: snapshot.mindmapNodes,
      mindmapEdges: snapshot.mindmapEdges,
      activeMindmapByBoardId: snapshot.activeMindmapByBoardId,
    });

    const payload = {
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),

      boards: normalizedSnapshot.boards,
      activeBoardId: normalizedSnapshot.activeBoardId,
      blocks: normalizedSnapshot.blocks,

      kanbans: normalizedSnapshot.kanbans,
      kanbanStages: normalizedSnapshot.kanbanStages,
      kanbanItems: normalizedSnapshot.kanbanItems,
      activeKanbanByBoardId: normalizedSnapshot.activeKanbanByBoardId,
      kanbanPreferencesById: normalizedSnapshot.kanbanPreferencesById,

      mindmaps: normalizedSnapshot.mindmaps,
      mindmapNodes: normalizedSnapshot.mindmapNodes,
      mindmapEdges: normalizedSnapshot.mindmapEdges,
      activeMindmapByBoardId: normalizedSnapshot.activeMindmapByBoardId,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    return true;
  } catch (error) {
    console.warn("Não foi possível salvar os dados locais do Muralis.", error);
    return false;
  }
}

export function clearAppData() {
  localStorage.removeItem(STORAGE_KEY);
}