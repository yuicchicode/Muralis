import { createId } from "../utils/id.js";

export function createBoardModel(overrides = {}) {
  const now = new Date().toISOString();

  return {
    id: createId("board"),
    name: "Novo mural",
    activeMode: "free",

    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },

    createdAt: now,
    updatedAt: now,

    ...overrides,
  };
}