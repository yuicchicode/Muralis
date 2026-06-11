import { replaceBoardData } from "../../app/state.js";
import { showToast } from "../../ui/toast.js";

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(reader.error);
    };

    reader.readAsText(file);
  });
}

function validateImportPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Arquivo inválido.");
  }

  if (!Array.isArray(payload.blocks)) {
    throw new Error("O arquivo não possui uma lista válida de blocos.");
  }

  if (!payload.board || typeof payload.board !== "object") {
    throw new Error("O arquivo não possui dados válidos do mural.");
  }

  return true;
}

export async function importBoardFromJson() {
  const input = document.createElement("input");

  input.type = "file";
  input.accept = "application/json,.json";

  input.addEventListener(
    "change",
    async () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      try {
        const text = await readFileAsText(file);
        const payload = JSON.parse(text);

        validateImportPayload(payload);

        const shouldImport = confirm(
          "Importar este arquivo vai substituir o mural atual. Deseja continuar?"
        );

        if (!shouldImport) {
          showToast("Importação cancelada.", {
            type: "info",
          });

          return;
        }

        replaceBoardData({
          board: payload.board,
          boards: payload.boards,
          activeBoardId: payload.activeBoardId,
          blocks: payload.blocks,
          kanbans: payload.kanbans,
          activeKanbanByBoardId: payload.activeKanbanByBoardId,
          activeKanbanId: payload.activeKanbanId,
          kanbanStages: payload.kanbanStages,
          kanbanItems: payload.kanbanItems,
          kanbanPreferencesById: payload.kanbanPreferencesById,
          mindmaps: payload.mindmaps,
          activeMindmapByBoardId: payload.activeMindmapByBoardId,
          activeMindmapId: payload.activeMindmapId,
          mindmapNodes: payload.mindmapNodes,
          mindmapEdges: payload.mindmapEdges,
        });

        showToast(`Mural importado com ${payload.blocks.length} blocos.`, {
          type: "success",
        });
      } catch (error) {
        console.error(error);

        showToast("Não foi possível importar este arquivo JSON.", {
          type: "error",
          title: "Erro ao importar",
        });
      }
    },
    {
      once: true,
    }
  );

  input.click();
}
