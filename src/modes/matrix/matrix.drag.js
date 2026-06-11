import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/modular/sortable.esm.js";

import { updateBlock } from "../../app/state.js";
import { showToast } from "../../ui/toast.js";

let sortableInstances = [];

const MATRIX_SCORE_BY_LEVEL = {
  high: 5,
  low: 2,
};

function destroySortableInstances() {
  sortableInstances.forEach((instance) => {
    instance.destroy();
  });

  sortableInstances = [];
}

function setupSortableMatrixList(listElement) {
  const sortable = new Sortable(listElement, {
    group: "muralis-matrix",
    animation: 170,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    draggable: ".matrix-card",
    ghostClass: "matrix-card--ghost",
    chosenClass: "matrix-card--chosen",
    dragClass: "matrix-card--dragging",
    sort: false,
    emptyInsertThreshold: 18,
    scroll: true,
    scrollSensitivity: 70,
    scrollSpeed: 12,

    onStart() {
      document.body.classList.add("is-dragging-matrix-card");
    },

    onEnd(event) {
      document.body.classList.remove("is-dragging-matrix-card");

      if (event.from === event.to) {
        return;
      }

      const blockId = event.item?.dataset?.blockId;
      const impactLevel = event.to?.dataset?.impact;
      const effortLevel = event.to?.dataset?.effort;

      if (!blockId || !impactLevel || !effortLevel) {
        return;
      }

      const impact = MATRIX_SCORE_BY_LEVEL[impactLevel];
      const effort = MATRIX_SCORE_BY_LEVEL[effortLevel];

      if (!impact || !effort) {
        return;
      }

      updateBlock(blockId, {
        impact,
        effort,
      });

      showToast("Bloco movido na Matriz.", {
        type: "success",
        duration: 1800,
      });
    },
  });

  sortableInstances.push(sortable);
}

export function refreshMatrixDrag() {
  destroySortableInstances();

  const lists = document.querySelectorAll("[data-matrix-drop-list]");

  lists.forEach((listElement) => {
    setupSortableMatrixList(listElement);
  });
}

export function setupMatrixDrag() {
  window.addEventListener("blur", () => {
    document.body.classList.remove("is-dragging-matrix-card");
  });
}