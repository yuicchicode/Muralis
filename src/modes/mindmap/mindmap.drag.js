import { getState, updateMindmapNode } from "../../app/state.js";

const DRAG_THRESHOLD = 4;

let dragState = null;

function getViewportZoom() {
  const state = getState();

  return Number(state.board?.viewport?.zoom) || 1;
}

function clampPosition(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMindmapSurface() {
  return document.querySelector(".mindmap-surface");
}

function getNodeElement(target) {
  return target.closest("[data-mindmap-node-id]");
}

function shouldIgnorePointerDown(event) {
  return Boolean(event.target.closest("button, input, select, textarea, a"));
}

function startNodeDrag(event) {
  const nodeElement = getNodeElement(event.target);

  if (!nodeElement || shouldIgnorePointerDown(event)) {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  const nodeId = nodeElement.dataset.mindmapNodeId;
  const state = getState();
  const node = state.mindmapNodes.find((item) => item.id === nodeId);

  if (!node) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const zoom = getViewportZoom();

  dragState = {
    nodeId,
    nodeElement,
    pointerId: event.pointerId,

    startClientX: event.clientX,
    startClientY: event.clientY,

    startX: Number(node.x) || 0,
    startY: Number(node.y) || 0,

    nextX: Number(node.x) || 0,
    nextY: Number(node.y) || 0,

    zoom,
    hasMoved: false,
  };

  nodeElement.setPointerCapture?.(event.pointerId);
  nodeElement.classList.add("is-dragging");

  document.body.classList.add("is-dragging-mindmap-node");

  document.addEventListener("pointermove", handleNodeDragMove);
  document.addEventListener("pointerup", stopNodeDrag);
  document.addEventListener("pointercancel", cancelNodeDrag);
}

function handleNodeDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  event.preventDefault();

  const deltaX = (event.clientX - dragState.startClientX) / dragState.zoom;
  const deltaY = (event.clientY - dragState.startClientY) / dragState.zoom;

  const distance = Math.hypot(
    event.clientX - dragState.startClientX,
    event.clientY - dragState.startClientY
  );

  if (distance > DRAG_THRESHOLD) {
    dragState.hasMoved = true;
  }

  const surface = getMindmapSurface();

  const surfaceWidth = surface?.offsetWidth || 2400;
  const surfaceHeight = surface?.offsetHeight || 1600;

  const nodeWidth = dragState.nodeElement.offsetWidth || 220;
  const nodeHeight = dragState.nodeElement.offsetHeight || 92;

  dragState.nextX = clampPosition(
    dragState.startX + deltaX,
    0,
    surfaceWidth - nodeWidth
  );

  dragState.nextY = clampPosition(
    dragState.startY + deltaY,
    0,
    surfaceHeight - nodeHeight
  );

  dragState.nodeElement.style.left = `${dragState.nextX}px`;
  dragState.nodeElement.style.top = `${dragState.nextY}px`;
}

function cleanupNodeDrag() {
  if (!dragState) {
    return;
  }

  dragState.nodeElement.releasePointerCapture?.(dragState.pointerId);
  dragState.nodeElement.classList.remove("is-dragging");

  document.body.classList.remove("is-dragging-mindmap-node");

  document.removeEventListener("pointermove", handleNodeDragMove);
  document.removeEventListener("pointerup", stopNodeDrag);
  document.removeEventListener("pointercancel", cancelNodeDrag);

  dragState = null;
}

function stopNodeDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  event.preventDefault();

  const {
    nodeId,
    startX,
    startY,
    nextX,
    nextY,
    hasMoved,
  } = dragState;

  if (dragState.hasMoved) {
    dragState.nodeElement.dataset.wasDragged = "true";
  }

  cleanupNodeDrag();

  if (!hasMoved) {
    return;
  }

  const roundedX = Math.round(nextX);
  const roundedY = Math.round(nextY);

  if (roundedX === startX && roundedY === startY) {
    return;
  }

  updateMindmapNode(nodeId, {
    x: roundedX,
    y: roundedY,
  });
}

function cancelNodeDrag() {
  if (!dragState) {
    return;
  }

  dragState.nodeElement.style.left = `${dragState.startX}px`;
  dragState.nodeElement.style.top = `${dragState.startY}px`;

  cleanupNodeDrag();
}

export function setupMindmapDrag() {
  document.addEventListener("pointerdown", startNodeDrag);
}