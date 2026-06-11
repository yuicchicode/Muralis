import { updateBlock } from "../../app/state.js";
import { showToast } from "../../ui/toast.js";

export function setupTaskControls() {
  document.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-task-done-toggle]");

    if (!checkbox) {
      return;
    }

    const blockElement = checkbox.closest("[data-block-id]");

    if (!blockElement) {
      return;
    }

    updateBlock(blockElement.dataset.blockId, {
      status: checkbox.checked ? "done" : "todo",
    });

    showToast(
      checkbox.checked ? "Tarefa concluída." : "Tarefa reaberta.",
      {
        type: checkbox.checked ? "success" : "info",
      }
    );
  });
}