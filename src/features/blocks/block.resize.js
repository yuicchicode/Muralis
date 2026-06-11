import {
  getState,
  selectBlock,
  updateBlock,
} from "../../app/state.js";

const MIN_WIDTH = 180;
const MIN_HEIGHT = 110;
const MAX_WIDTH = 720;
const MAX_HEIGHT = 520;

let resizeState = null;

function getCurrentZoom() {
  const state = getState();
  const zoom = state.board.viewport?.zoom || 1;

  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getNumberFromPixels(value) {
  return Number.parseFloat(String(value).replace("px", "")) || 0;
}

function startResize(event, handleElement) {
  const blockElement = handleElement.closest("[data-block-id]");

  if (!blockElement) {
    return;
  }

  const blockId = blockElement.dataset.blockId;

  selectBlock(blockId);

  const initialWidth = getNumberFromPixels(blockElement.style.width);
  const initialHeight = getNumberFromPixels(blockElement.style.minHeight);

  resizeState = {
    blockId,
    blockElement,
    pointerId: event.pointerId,

    startX: event.clientX,
    startY: event.clientY,

    initialWidth,
    initialHeight,

    nextWidth: initialWidth,
    nextHeight: initialHeight,

    zoom: getCurrentZoom(),
  };

  handleElement.setPointerCapture?.(event.pointerId);

  blockElement.classList.add("is-resizing");
  document.body.classList.add("is-resizing-block");

  event.preventDefault();
  event.stopPropagation();
}

function moveResize(event) {
  if (!resizeState) {
    return;
  }

  if (event.pointerId !== resizeState.pointerId) {
    return;
  }

  const rawDeltaX = event.clientX - resizeState.startX;
  const rawDeltaY = event.clientY - resizeState.startY;

  const deltaX = rawDeltaX / resizeState.zoom;
  const deltaY = rawDeltaY / resizeState.zoom;

  const nextWidth = clamp(
    Math.round(resizeState.initialWidth + deltaX),
    MIN_WIDTH,
    MAX_WIDTH
  );

  const nextHeight = clamp(
    Math.round(resizeState.initialHeight + deltaY),
    MIN_HEIGHT,
    MAX_HEIGHT
  );

  resizeState.nextWidth = nextWidth;
  resizeState.nextHeight = nextHeight;

  resizeState.blockElement.style.width = `${nextWidth}px`;
  resizeState.blockElement.style.minHeight = `${nextHeight}px`;

  event.preventDefault();
}

function finishResize(event) {
  if (!resizeState) {
    return;
  }

  if (event.pointerId !== resizeState.pointerId) {
    return;
  }

  const {
    blockId,
    blockElement,
    nextWidth,
    nextHeight,
  } = resizeState;

  blockElement.classList.remove("is-resizing");
  document.body.classList.remove("is-resizing-block");

  resizeState = null;

  updateBlock(blockId, {
    width: nextWidth,
    height: nextHeight,
  });
}

function cancelResize() {
  if (!resizeState) {
    return;
  }

  resizeState.blockElement.style.width = `${resizeState.initialWidth}px`;
  resizeState.blockElement.style.minHeight = `${resizeState.initialHeight}px`;

  resizeState.blockElement.classList.remove("is-resizing");
  document.body.classList.remove("is-resizing-block");

  resizeState = null;
}

export function setupBlockResize() {
  const boardCanvas = document.querySelector("#boardCanvas");

  if (!boardCanvas) {
    return;
  }

  boardCanvas.addEventListener(
    "pointerdown",
    (event) => {
      const handleElement = event.target.closest("[data-resize-handle]");

      if (!handleElement) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      startResize(event, handleElement);
    },
    true
  );

  window.addEventListener("pointermove", moveResize);
  window.addEventListener("pointerup", finishResize);
  window.addEventListener("pointercancel", cancelResize);
  window.addEventListener("blur", cancelResize);
}