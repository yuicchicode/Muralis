import {
  getState,
  updateBlock,
} from "../../app/state.js";

const DRAG_THRESHOLD = 4;

let dragState = null;

function getNumberFromPixels(value) {
  return Number.parseFloat(String(value).replace("px", "")) || 0;
}

function isEditableTarget(target) {
  return Boolean(
    target.closest(
      "button, input, textarea, select, a, [contenteditable='true'], [data-resize-handle]"
    )
  );
}

function getDistance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function getCurrentZoom() {
  const state = getState();
  const zoom = state.board.viewport?.zoom || 1;

  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

function startDrag(event, blockElement) {
  const startX = event.clientX;
  const startY = event.clientY;

  const initialLeft = getNumberFromPixels(blockElement.style.left);
  const initialTop = getNumberFromPixels(blockElement.style.top);

  dragState = {
    blockId: blockElement.dataset.blockId,
    blockElement,
    pointerId: event.pointerId,

    startX,
    startY,

    currentX: startX,
    currentY: startY,

    initialLeft,
    initialTop,

    nextLeft: initialLeft,
    nextTop: initialTop,

    zoom: getCurrentZoom(),

    hasMoved: false,
  };

  blockElement.setPointerCapture?.(event.pointerId);
}

function moveDrag(event) {
  if (!dragState) {
    return;
  }

  if (event.pointerId !== dragState.pointerId) {
    return;
  }

  const rawDeltaX = event.clientX - dragState.startX;
  const rawDeltaY = event.clientY - dragState.startY;

  const deltaX = rawDeltaX / dragState.zoom;
  const deltaY = rawDeltaY / dragState.zoom;

  const distance = getDistance(
    dragState.startX,
    dragState.startY,
    event.clientX,
    event.clientY
  );

  if (!dragState.hasMoved && distance < DRAG_THRESHOLD) {
    return;
  }

  dragState.hasMoved = true;
  dragState.currentX = event.clientX;
  dragState.currentY = event.clientY;

  dragState.nextLeft = Math.round(dragState.initialLeft + deltaX);
  dragState.nextTop = Math.round(dragState.initialTop + deltaY);

  dragState.blockElement.classList.add("is-dragging");
  document.body.classList.add("is-dragging-block");

  dragState.blockElement.style.left = `${dragState.nextLeft}px`;
  dragState.blockElement.style.top = `${dragState.nextTop}px`;

  event.preventDefault();
}

function finishDrag(event) {
  if (!dragState) {
    return;
  }

  if (event.pointerId !== dragState.pointerId) {
    return;
  }

  const {
    blockId,
    blockElement,
    pointerId,
    nextLeft,
    nextTop,
    hasMoved,
  } = dragState;

  blockElement.releasePointerCapture?.(pointerId);
  blockElement.classList.remove("is-dragging");
  document.body.classList.remove("is-dragging-block");

  dragState = null;

  if (!hasMoved) {
    return;
  }

  updateBlock(blockId, {
    x: nextLeft,
    y: nextTop,
  });
}

function cancelDrag() {
  if (!dragState) {
    return;
  }

  dragState.blockElement.style.left = `${dragState.initialLeft}px`;
  dragState.blockElement.style.top = `${dragState.initialTop}px`;

  dragState.blockElement.classList.remove("is-dragging");
  document.body.classList.remove("is-dragging-block");

  dragState = null;
}

export function setupBlockDrag() {
  const boardCanvas = document.querySelector("#boardCanvas");

  if (!boardCanvas) {
    return;
  }

  boardCanvas.addEventListener("pointerdown", (event) => {
    if (document.body.classList.contains("is-space-panning")) {
      return;
    }

    const blockElement = event.target.closest(".idea-block[data-block-id]");

    if (!blockElement) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    startDrag(event, blockElement);
  });

  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", finishDrag);
  window.addEventListener("pointercancel", cancelDrag);
  window.addEventListener("blur", cancelDrag);
}