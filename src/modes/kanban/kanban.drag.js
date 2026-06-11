import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/modular/sortable.esm.js";

import { moveKanbanItem } from "../../app/state.js";
import { showToast } from "../../ui/toast.js";

let sortableInstances = [];

function destroySortableInstances() {
  sortableInstances.forEach((instance) => {
    instance.destroy();
  });

  sortableInstances = [];
}

function getOrderedItemIds(listElement) {
  return [...listElement.querySelectorAll("[data-kanban-item-id]")].map((card) => {
    return card.dataset.kanbanItemId;
  });
}

function setupSortableList(listElement) {
  const sortable = new Sortable(listElement, {
    group: "muralis-kanban",
    animation: 170,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    draggable: ".kanban-card",
    ghostClass: "kanban-card--ghost",
    chosenClass: "kanban-card--chosen",
    dragClass: "kanban-card--dragging",
    filter: "input, button, a",
    preventOnFilter: false,
    scroll: true,
    scrollSensitivity: 70,
    scrollSpeed: 12,

    onStart() {
      document.body.classList.add("is-dragging-kanban-card");
    },

    onEnd(event) {
      document.body.classList.remove("is-dragging-kanban-card");

      const kanbanItemId = event.item?.dataset?.kanbanItemId;
      const nextStageId = event.to?.dataset?.stageId;

      if (!kanbanItemId || !nextStageId) {
        return;
      }

      const orderedItemIds = getOrderedItemIds(event.to);

      moveKanbanItem(kanbanItemId, nextStageId, orderedItemIds);

      showToast("Card movido no Kanban.", {
        type: "success",
        duration: 1600,
      });
    },
  });

  sortableInstances.push(sortable);
}

export function refreshKanbanDrag() {
  destroySortableInstances();

  const boardCanvas = document.querySelector("#boardCanvas");

  if (boardCanvas?.dataset.kanbanSort !== "manual") {
    return;
  }

  const lists = document.querySelectorAll("[data-kanban-stage-list]");

  lists.forEach((listElement) => {
    setupSortableList(listElement);
  });
}

export function setupKanbanDrag() {
  window.addEventListener("blur", () => {
    document.body.classList.remove("is-dragging-kanban-card");
  });
}