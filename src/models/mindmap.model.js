import { createId } from "../utils/id.js";

export function createMindmapModel(boardId, overrides = {}) {
  const now = new Date().toISOString();

  return {
    id: createId("mindmap"),
    boardId,
    name: "Mapa principal",
    description: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMindmapNodeModel(mindmapId, blockId, overrides = {}) {
  const now = new Date().toISOString();

  return {
    id: createId("mindmap_node"),
    mindmapId,
    blockId,

    x: 420,
    y: 260,
    width: 220,

    parentNodeId: null,
    collapsed: false,

    createdAt: now,
    updatedAt: now,

    ...overrides,
  };
}

export function createMindmapEdgeModel(
  mindmapId,
  fromNodeId,
  toNodeId,
  overrides = {}
) {
  const now = new Date().toISOString();

  return {
    id: createId("mindmap_edge"),
    mindmapId,
    fromNodeId,
    toNodeId,
    type: "hierarchy",

    createdAt: now,
    updatedAt: now,

    ...overrides,
  };
}

export function createDefaultMindmapStructure(boardId, overrides = {}) {
  const mindmap = createMindmapModel(boardId, {
    name: "Mapa principal",
    ...overrides,
  });

  return {
    mindmap,
    nodes: [],
    edges: [],
  };
}