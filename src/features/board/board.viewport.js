import {
  getState,
  setViewport,
  subscribe,
} from "../../app/state.js";

import { qs } from "../../utils/dom.js";

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.25;
const ZOOM_STEP = 0.12;
const GRID_SIZE = 28;

let viewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

let isSpacePressed = false;
let panState = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isTypingTarget(target) {
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']")
  );
}

function isViewportMode(mode) {
  return mode === "free" || mode === "mindmap";
}

function getActiveMode() {
  return getState().board.activeMode;
}

function normalizeViewport(nextViewport = {}) {
  const x = Number.isFinite(nextViewport.x) ? nextViewport.x : 0;
  const y = Number.isFinite(nextViewport.y) ? nextViewport.y : 0;
  const zoom = Number.isFinite(nextViewport.zoom) ? nextViewport.zoom : 1;

  return {
    x,
    y,
    zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

function getBoardElements() {
  return {
    boardViewport: qs(".board-viewport"),
    boardCanvas: qs("#boardCanvas"),
    boardBackground: qs(".board-background"),
    viewportControls: qs(".viewport-controls"),
    zoomValue: qs("[data-zoom-value]"),
  };
}

function updateViewportControls(activeMode) {
  const { boardViewport, viewportControls } = getBoardElements();
  const isEnabled = isViewportMode(activeMode);

  boardViewport?.classList.toggle("is-viewport-static", !isEnabled);

  if (viewportControls) {
    viewportControls.hidden = !isEnabled;
    viewportControls.setAttribute("aria-hidden", isEnabled ? "false" : "true");
  }
}

function updateZoomLabel(zoom) {
  const { zoomValue } = getBoardElements();

  if (!zoomValue) {
    return;
  }

  zoomValue.textContent = `${Math.round(zoom * 100)}%`;
}

function updateBackground(viewportState) {
  const { boardBackground } = getBoardElements();

  if (!boardBackground) {
    return;
  }

  const gridSize = GRID_SIZE * viewportState.zoom;

  boardBackground.style.backgroundSize = `${gridSize}px ${gridSize}px`;
  boardBackground.style.backgroundPosition = `${viewportState.x}px ${viewportState.y}px`;
}

function applyViewport(nextViewport, options = {}) {
  const { shouldPersist = false } = options;

  const { boardCanvas } = getBoardElements();

  viewport = normalizeViewport(nextViewport);

  if (boardCanvas) {
    boardCanvas.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
  }

  updateZoomLabel(viewport.zoom);
  updateBackground(viewport);

  if (shouldPersist) {
    setViewport(viewport);
  }
}

function getViewportCenterOrigin() {
  const { boardViewport } = getBoardElements();

  if (!boardViewport) {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }

  const rect = boardViewport.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function zoomTo(nextZoom, origin = getViewportCenterOrigin()) {
  if (!isViewportMode(getActiveMode())) {
    return;
  }

  const { boardViewport } = getBoardElements();

  if (!boardViewport) {
    return;
  }

  const rect = boardViewport.getBoundingClientRect();
  const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

  const originX = origin.x - rect.left;
  const originY = origin.y - rect.top;

  const worldX = (originX - viewport.x) / viewport.zoom;
  const worldY = (originY - viewport.y) / viewport.zoom;

  const nextX = originX - worldX * clampedZoom;
  const nextY = originY - worldY * clampedZoom;

  applyViewport(
    {
      x: nextX,
      y: nextY,
      zoom: clampedZoom,
    },
    {
      shouldPersist: true,
    }
  );
}

function zoomBy(amount, origin) {
  zoomTo(viewport.zoom + amount, origin);
}

function resetZoom() {
  zoomTo(1, getViewportCenterOrigin());
}

function centerView() {
  if (!isViewportMode(getActiveMode())) {
    return;
  }

  const { boardViewport } = getBoardElements();

  if (!boardViewport) {
    return;
  }

  const state = getState();
  const blocks = state.blocks;

  if (blocks.length === 0) {
    applyViewport(
      {
        x: 0,
        y: 0,
        zoom: 1,
      },
      {
        shouldPersist: true,
      }
    );

    return;
  }

  const rect = boardViewport.getBoundingClientRect();

  const minX = Math.min(...blocks.map((block) => block.x));
  const minY = Math.min(...blocks.map((block) => block.y));
  const maxX = Math.max(...blocks.map((block) => block.x + block.width));
  const maxY = Math.max(...blocks.map((block) => block.y + block.height));

  const boardCenterX = minX + (maxX - minX) / 2;
  const boardCenterY = minY + (maxY - minY) / 2;

  applyViewport(
    {
      x: rect.width / 2 - boardCenterX * viewport.zoom,
      y: rect.height / 2 - boardCenterY * viewport.zoom,
      zoom: viewport.zoom,
    },
    {
      shouldPersist: true,
    }
  );
}

export function focusBlockInViewport(blockId, options = {}) {
  const { shouldPersist = true } = options;
  const state = getState();

  if (!isViewportMode(state.board.activeMode)) {
    return false;
  }

  const { boardViewport } = getBoardElements();

  if (!boardViewport) {
    return false;
  }

  const block = state.blocks.find((item) => item.id === blockId);

  if (!block) {
    return false;
  }

  const rect = boardViewport.getBoundingClientRect();

  const currentViewport = state.board.viewport || viewport;
  const zoom = currentViewport.zoom || 1;

  const blockCenterX = block.x + block.width / 2;
  const blockCenterY = block.y + block.height / 2;

  const nextX = rect.width / 2 - blockCenterX * zoom;
  const nextY = rect.height / 2 - blockCenterY * zoom;

  applyViewport(
    {
      x: nextX,
      y: nextY,
      zoom,
    },
    {
      shouldPersist,
    }
  );

  return true;
}

function setSpaceMode(enabled) {
  isSpacePressed = enabled && isViewportMode(getActiveMode());
  document.body.classList.toggle("is-space-panning", isSpacePressed);
}

function startPan(event) {
  const { boardViewport } = getBoardElements();

  if (!boardViewport) {
    return;
  }

  panState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    initialX: viewport.x,
    initialY: viewport.y,
  };

  boardViewport.setPointerCapture?.(event.pointerId);
  document.body.classList.add("is-panning-board");

  event.preventDefault();
}

function movePan(event) {
  if (!panState) {
    return;
  }

  if (event.pointerId !== panState.pointerId) {
    return;
  }

  const deltaX = event.clientX - panState.startX;
  const deltaY = event.clientY - panState.startY;

  applyViewport({
    x: panState.initialX + deltaX,
    y: panState.initialY + deltaY,
    zoom: viewport.zoom,
  });

  event.preventDefault();
}

function finishPan(event) {
  if (!panState) {
    return;
  }

  if (event.pointerId !== panState.pointerId) {
    return;
  }

  const { boardViewport } = getBoardElements();

  boardViewport?.releasePointerCapture?.(panState.pointerId);

  panState = null;

  document.body.classList.remove("is-panning-board");

  setViewport(viewport);
}

function cancelPan() {
  if (!panState) {
    return;
  }

  panState = null;
  document.body.classList.remove("is-panning-board");
}

function setupViewportButtons() {
  document.addEventListener("click", (event) => {
    const zoomInButton = event.target.closest("[data-action='zoom-in']");

    if (zoomInButton) {
      zoomBy(ZOOM_STEP);
      return;
    }

    const zoomOutButton = event.target.closest("[data-action='zoom-out']");

    if (zoomOutButton) {
      zoomBy(-ZOOM_STEP);
      return;
    }

    const resetZoomButton = event.target.closest("[data-action='reset-zoom']");

    if (resetZoomButton) {
      resetZoom();
      return;
    }

    const centerButton = event.target.closest("[data-action='center-view']");

    if (centerButton) {
      centerView();
    }
  });
}

function setupViewportKeyboard() {
  document.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }

    const isViewportEnabled = isViewportMode(getActiveMode());
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (event.code === "Space" && isViewportEnabled) {
      event.preventDefault();
      setSpaceMode(true);
      return;
    }

    if (!isCtrlOrCmd || !isViewportEnabled) {
      return;
    }

    if (key === "+" || key === "=") {
      event.preventDefault();
      zoomBy(ZOOM_STEP);
      return;
    }

    if (key === "-") {
      event.preventDefault();
      zoomBy(-ZOOM_STEP);
      return;
    }

    if (key === "0") {
      event.preventDefault();
      resetZoom();
    }
  });

  document.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      setSpaceMode(false);
    }
  });

  window.addEventListener("blur", () => {
    setSpaceMode(false);
    cancelPan();
  });
}

function setupViewportPointer() {
  const { boardViewport } = getBoardElements();

  if (!boardViewport) {
    return;
  }

  boardViewport.addEventListener("pointerdown", (event) => {
    if (!isViewportMode(getActiveMode())) {
      return;
    }

    const isLeftButton = event.button === 0;
    const isRightButton = event.button === 2;

    const shouldPanWithSpace = isSpacePressed && isLeftButton;
    const shouldPanWithRightClick = isRightButton;

    if (!shouldPanWithSpace && !shouldPanWithRightClick) {
      return;
    }

    startPan(event);
  });

  /*
    Impede o menu padrão do botão direito dentro do mural,
    já que agora o botão direito serve para arrastar o board.
  */
  boardViewport.addEventListener("contextmenu", (event) => {
    if (isViewportMode(getActiveMode())) {
      event.preventDefault();
    }
  });

  window.addEventListener("pointermove", movePan);
  window.addEventListener("pointerup", finishPan);
  window.addEventListener("pointercancel", cancelPan);
}

function setupViewportWheel() {
  const { boardViewport } = getBoardElements();

  if (!boardViewport) {
    return;
  }

  boardViewport.addEventListener(
    "wheel",
    (event) => {
      const state = getState();

      if (state.board.activeMode === "kanban") {
        const columnList = event.target.closest(".kanban-column__list");

        if (columnList) {
          const canScrollVertically =
            columnList.scrollHeight > columnList.clientHeight;

          const isScrollingDown = event.deltaY > 0;
          const isScrollingUp = event.deltaY < 0;

          const canScrollDown =
            columnList.scrollTop + columnList.clientHeight <
            columnList.scrollHeight - 1;

          const canScrollUp = columnList.scrollTop > 0;

          const shouldScrollColumn =
            canScrollVertically &&
            ((isScrollingDown && canScrollDown) ||
              (isScrollingUp && canScrollUp));

          if (shouldScrollColumn) {
            columnList.scrollTop += event.deltaY;
            event.preventDefault();
            return;
          }
        }

        const scrollTarget = event.target.closest("#boardCanvas");

        if (!scrollTarget) {
          return;
        }

        const horizontalDelta =
          Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY;

        scrollTarget.scrollLeft += horizontalDelta;

        event.preventDefault();
        return;
      }

      if (state.board.activeMode === "matrix") {
        const quadrantList = event.target.closest(".matrix-quadrant__list");

        if (quadrantList) {
          const canScrollVertically =
            quadrantList.scrollHeight > quadrantList.clientHeight;

          const isScrollingDown = event.deltaY > 0;
          const isScrollingUp = event.deltaY < 0;

          const canScrollDown =
            quadrantList.scrollTop + quadrantList.clientHeight <
            quadrantList.scrollHeight - 1;

          const canScrollUp = quadrantList.scrollTop > 0;

          const shouldScrollQuadrant =
            canScrollVertically &&
            ((isScrollingDown && canScrollDown) ||
              (isScrollingUp && canScrollUp));

          if (shouldScrollQuadrant) {
            quadrantList.scrollTop += event.deltaY;
            event.preventDefault();
            return;
          }
        }

        const scrollTarget = event.target.closest("#boardCanvas");

        if (!scrollTarget) {
          return;
        }

        scrollTarget.scrollTop += event.deltaY;
        scrollTarget.scrollLeft += event.deltaX;

        event.preventDefault();
        return;
      }

      if (state.board.activeMode === "timeline") {
        const scrollTarget = event.target.closest("#boardCanvas");

        if (!scrollTarget) {
          return;
        }

        scrollTarget.scrollTop += event.deltaY;
        scrollTarget.scrollLeft += event.deltaX;

        event.preventDefault();
        return;
      }

      if (!isViewportMode(state.board.activeMode)) {
        return;
      }

      event.preventDefault();

      const direction = event.deltaY < 0 ? 1 : -1;

      zoomBy(direction * ZOOM_STEP, {
        x: event.clientX,
        y: event.clientY,
      });
    },
    {
      passive: false,
    }
  );
}

export function setupBoardViewport() {
  subscribe((state) => {
    const { boardCanvas } = getBoardElements();
    const activeMode = state.board.activeMode;
    const isEnabled = isViewportMode(activeMode);

    updateViewportControls(activeMode);

    if (!isEnabled) {
      if (boardCanvas) {
        boardCanvas.style.transform = "none";
      }

      cancelPan();
      setSpaceMode(false);
      updateZoomLabel(1);
      updateBackground({
        x: 0,
        y: 0,
        zoom: 1,
      });

      return;
    }

    applyViewport(state.board.viewport || viewport);
  });

  setupViewportButtons();
  setupViewportKeyboard();
  setupViewportPointer();
  setupViewportWheel();
}
