import { getState } from "../../app/state.js";
import { showToast } from "../../ui/toast.js";

function createDownloadFileName(boardName) {
  const safeName = boardName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const date = new Date().toISOString().slice(0, 10);

  return `${safeName || "muralis"}-${date}.json`;
}

export function exportBoardAsJson() {
  const state = getState();

  const payload = {
    app: "Muralis",
    version: 2,
    exportedAt: new Date().toISOString(),
    boards: [state.board],
    activeBoardId: state.activeBoardId,
    board: state.board,
    blocks: state.blocks,
    kanbans: state.kanbans,
    activeKanbanByBoardId: {
      [state.activeBoardId]: state.activeKanbanId,
    },
    activeKanbanId: state.activeKanbanId,
    kanbanStages: state.kanbanStages,
    kanbanItems: state.kanbanItems,
    kanbanPreferencesById: state.kanbanPreferencesById,
    mindmaps: state.mindmaps,
    activeMindmapByBoardId: {
      [state.activeBoardId]: state.activeMindmapId,
    },
    activeMindmapId: state.activeMindmapId,
    mindmapNodes: state.mindmapNodes,
    mindmapEdges: state.mindmapEdges,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const fileName = createDownloadFileName(state.board.name);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast(`Arquivo "${fileName}" exportado.`, {
    type: "success",
  });
}
