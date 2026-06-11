import {
  clearTagFilters,
  setActiveMode,
  setSearchQuery,
  setTagFilter,
  setTypeFilter,
} from "../../app/state.js";

import {
  clearKanbanModeToolbar,
  renderKanbanMode,
} from "../../modes/kanban/kanban.mode.js";

import {
  clearMindmapModeToolbar,
  renderMindmapMode,
} from "../../modes/mindmap/mindmap.mode.js";

import {
  clearTimelineModeToolbar,
  renderTimelineMode,
} from "../../modes/timeline/timeline.mode.js";

import { exportBoardAsJson } from "../import-export/export-json.js";
import { importBoardFromJson } from "../import-export/import-json.js";
import { renderBlock } from "../blocks/block.render.js";
import { clearMatrixModeToolbar, renderMatrixMode, } from "../../modes/matrix/matrix.mode.js";

import {
  clearElement,
  createElement,
  qs,
  qsa,
  setText,
} from "../../utils/dom.js";

const MODE_LABELS = {
  free: "Mural livre",
  kanban: "Kanban",
  mindmap: "Mapa mental",
  matrix: "Matriz esforço/impacto",
  timeline: "Linha do tempo",
};

const MODES_WITH_CONTROL_PANEL = new Set([
  "kanban",
  "matrix",
  "mindmap",
  "timeline",
]);

let isModeControlsOpen = false;
let lastRenderedMode = null;

function modeHasControlPanel(mode) {
  return MODES_WITH_CONTROL_PANEL.has(mode);
}

function setModeControlsOpen(isOpen) {
  isModeControlsOpen = Boolean(isOpen);

  const app = qs("#app");

  app?.classList.toggle("is-mode-controls-open", isModeControlsOpen);

  qsa("[data-action='toggle-mode-controls']").forEach((button) => {
    button.setAttribute("aria-expanded", isModeControlsOpen ? "true" : "false");

    const label = button.querySelector("[data-board-control-label]");

    if (label) {
      label.textContent = isModeControlsOpen ? "Fechar" : "Controles";
    }
  });
}

function getModeControlIcon(mode) {
  const iconsByMode = {
    kanban: "▦",
    matrix: "◆",
    mindmap: "✦",
    timeline: "◷",
  };

  return iconsByMode[mode] || "☰";
}

function renderBoardControlDock(state) {
  const boardViewport = qs(".board-viewport");

  if (!boardViewport) {
    return;
  }

  let dock = qs("[data-board-control-dock]");

  if (!dock) {
    dock = createElement("div", {
      className: "board-control-dock",
      attrs: {
        "data-board-control-dock": "",
      },
    });

    boardViewport.append(dock);
  }

  clearElement(dock);

  if (!modeHasControlPanel(state.board.activeMode)) {
    dock.hidden = true;
    setModeControlsOpen(false);
    return;
  }

  const modeIcon = getModeControlIcon(state.board.activeMode);

  dock.hidden = false;

  const button = createElement("button", {
    className: "board-control-dock__button",
    attrs: {
      type: "button",
      "data-action": "toggle-mode-controls",
      "aria-expanded": isModeControlsOpen ? "true" : "false",
      "aria-controls": "modeControlsPanel",
    },
  });

  button.append(
    createElement("span", {
      className: "board-control-dock__icon",
      text: modeIcon,
      attrs: {
        "aria-hidden": "true",
      },
    }),
    createElement("span", {
      attrs: {
        "data-board-control-label": "",
      },
      text: isModeControlsOpen ? "Fechar" : "Controles",
    })
  );

  dock.append(button);
}

function getModeButtons() {
  return qsa(".mode-switcher__button");
}

function getAllTags(state) {
  const tags = state.blocks.flatMap((block) => {
    return Array.isArray(block.tags) ? block.tags : [];
  });

  return [...new Set(tags)].sort((a, b) => a.localeCompare(b));
}

function getVisibleBlocks(state) {
  const query = state.filters.query;
  const visibleTypes = state.filters.types;
  const selectedTags = state.filters.tags || new Set();

  return state.blocks.filter((block) => {
    const blockTags = Array.isArray(block.tags) ? block.tags : [];

    const matchesType = visibleTypes.has(block.type);

    const searchableContent = [
      block.title,
      block.content,
      block.type,
      block.status,
      block.priority,
      block.dueDate,
      ...blockTags,
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = query.length === 0 || searchableContent.includes(query);

    const matchesTags =
      selectedTags.size === 0 ||
      [...selectedTags].every((tag) => blockTags.includes(tag));

    return matchesType && matchesQuery && matchesTags;
  });
}

function updateModeButtons(activeMode) {
  getModeButtons().forEach((button) => {
    const isActive = button.dataset.mode === activeMode;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.tabIndex = isActive ? 0 : -1;
  });
}

function focusModeButton(currentButton, direction) {
  const buttons = getModeButtons();
  const currentIndex = buttons.indexOf(currentButton);

  if (currentIndex === -1) {
    return;
  }

  const nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
  buttons[nextIndex].focus();
}

function activateModeButton(button) {
  if (!button?.dataset.mode) {
    return;
  }

  setModeControlsOpen(false);
  setActiveMode(button.dataset.mode);
}

function handleModeSwitcherKeydown(event) {
  const modeButton = event.target.closest(".mode-switcher__button");

  if (!modeButton) {
    return;
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    focusModeButton(modeButton, 1);
    activateModeButton(document.activeElement);
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    focusModeButton(modeButton, -1);
    activateModeButton(document.activeElement);
    return;
  }

  if (event.key === "Home" || event.key === "End") {
    const buttons = getModeButtons();
    const targetButton =
      event.key === "Home" ? buttons[0] : buttons[buttons.length - 1];

    event.preventDefault();
    targetButton?.focus();
    activateModeButton(targetButton);
  }
}

function updateBoardMeta(state) {
  const totalBlocks = state.blocks.length;

  setText(
    "[data-block-count]",
    `${totalBlocks} ${totalBlocks === 1 ? "bloco" : "blocos"}`
  );

  setText("[data-save-status]", "Salvo localmente");
  setText("[data-board-title]", state.board.name);
}

function ensureTagFilterSection() {
  let section = qs("[data-tag-filter-section]");

  if (section) {
    return section;
  }

  const sidebar = qs(".sidebar");
  const tipSection = qs(".sidebar__section--tip");

  if (!sidebar) {
    return null;
  }

  section = createElement("section", {
    className: "sidebar__section",
    attrs: {
      "data-tag-filter-section": "",
    },
  });

  const header = createElement("div", {
    className: "sidebar__header",
  });

  const eyebrow = createElement("p", {
    className: "eyebrow",
    text: "Tags",
  });

  const title = createElement("h2", {
    text: "Filtrar por assunto",
  });

  const tagList = createElement("div", {
    className: "tag-filter-list",
    attrs: {
      "data-tag-filter-list": "",
    },
  });

  header.append(eyebrow, title);
  section.append(header, tagList);

  if (tipSection) {
    sidebar.insertBefore(section, tipSection);
  } else {
    sidebar.append(section);
  }

  return section;
}

function renderTagFilters(state) {
  const section = ensureTagFilterSection();

  if (!section) {
    return;
  }

  const tagList = qs("[data-tag-filter-list]", section);

  if (!tagList) {
    return;
  }

  clearElement(tagList);

  const allTags = getAllTags(state);
  const selectedTags = state.filters.tags || new Set();

  if (allTags.length === 0) {
    const empty = createElement("p", {
      className: "tag-filter-empty",
      text: "Nenhuma tag criada ainda.",
    });

    tagList.append(empty);
    return;
  }

  allTags.forEach((tag) => {
    const label = createElement("label", {
      className: "tag-filter-chip",
    });

    const checkbox = createElement("input", {
      attrs: {
        type: "checkbox",
        "data-filter-tag": tag,
      },
    });

    checkbox.checked = selectedTags.has(tag);

    const text = createElement("span", {
      text: `#${tag}`,
    });

    label.append(checkbox, text);
    tagList.append(label);
  });

  if (selectedTags.size > 0) {
    const clearButton = createElement("button", {
      className: "ghost-button tag-filter-clear",
      text: "Limpar tags",
      attrs: {
        type: "button",
        "data-action": "clear-tag-filters",
      },
    });

    tagList.append(clearButton);
  }
}

function renderEmptyState(boardCanvas, state) {
  const hasSearch =
    state.filters.query.length > 0 || (state.filters.tags?.size || 0) > 0;

  const title = hasSearch ? "Nada encontrado" : "Seu mural está vazio";

  const message = hasSearch
    ? "Tente buscar por outro termo ou ajustar os filtros."
    : "Crie uma ideia, tarefa, link ou referência para começar a organizar seus pensamentos.";

  const emptyState = createElement("div", {
    className: "empty-state",
    dataset: {
      emptyState: "",
    },
  });

  const icon = createElement("div", {
    className: "empty-state__icon",
    text: hasSearch ? "⌕" : "✦",
    attrs: {
      "aria-hidden": "true",
    },
  });

  const heading = createElement("h2", {
    text: title,
  });

  const paragraph = createElement("p", {
    text: message,
  });

  const button = createElement("button", {
    className: "primary-button",
    text: hasSearch ? "Criar nova ideia" : "Criar primeiro bloco",
    attrs: {
      type: "button",
      "data-action": "create-block",
    },
  });

  emptyState.append(icon, heading, paragraph, button);
  boardCanvas.append(emptyState);
}

function renderFreeMode(boardCanvas, state) {
  const visibleBlocks = getVisibleBlocks(state);

  if (visibleBlocks.length === 0) {
    renderEmptyState(boardCanvas, state);
    return;
  }

  visibleBlocks.forEach((block) => {
    const isSelected = state.selectedBlockIds.includes(block.id);
    const blockElement = renderBlock(block, { isSelected });

    boardCanvas.append(blockElement);
  });
}

function renderModePlaceholder(boardCanvas, state) {
  const modeLabel = MODE_LABELS[state.board.activeMode] || "Modo";

  const placeholder = createElement("div", {
    className: "mode-placeholder",
  });

  const content = createElement("div");

  const title = createElement("h2", {
    text: `${modeLabel} em construção`,
  });

  const paragraph = createElement("p", {
    className: "muted-text",
    text: "Por enquanto, os blocos estão disponíveis no Mural livre. Este modo será conectado nas próximas etapas.",
  });

  content.append(title, paragraph);
  placeholder.append(content);
  boardCanvas.append(placeholder);
}

export function renderBoard(state) {
  const boardCanvas = qs("#boardCanvas");

  if (!boardCanvas) {
    return;
  }

  updateBoardMeta(state);
  updateModeButtons(state.board.activeMode);
  renderTagFilters(state);

  if (lastRenderedMode !== state.board.activeMode) {
    setModeControlsOpen(false);
    lastRenderedMode = state.board.activeMode;
  }

  boardCanvas.dataset.mode = state.board.activeMode;
  renderBoardControlDock(state);

  clearElement(boardCanvas);

  if (state.board.activeMode !== "kanban") {
    clearKanbanModeToolbar();
  }

  if (state.board.activeMode !== "matrix") {
    clearMatrixModeToolbar();
  }

  if (state.board.activeMode !== "mindmap") {
    clearMindmapModeToolbar();
  }

  if (state.board.activeMode !== "timeline") {
    clearTimelineModeToolbar();
  }

  if (state.board.activeMode === "free") {
    renderFreeMode(boardCanvas, state);
    return;
  }

  if (state.board.activeMode === "kanban") {
    renderKanbanMode(boardCanvas, state);
    return;
  }

  if (state.board.activeMode === "matrix") {
    renderMatrixMode(boardCanvas, state);
    return;
  }

  if (state.board.activeMode === "mindmap") {
    renderMindmapMode(boardCanvas, state);
    return;
  }

  if (state.board.activeMode === "timeline") {
    renderTimelineMode(boardCanvas, state);
    return;
  }

  renderModePlaceholder(boardCanvas, state);
}

export function setupBoardControls() {
  document.addEventListener("keydown", handleModeSwitcherKeydown);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (!isModeControlsOpen) {
      return;
    }

    setModeControlsOpen(false);
  });

  document.addEventListener("click", (event) => {
    const modeButton = event.target.closest(".mode-switcher__button");

    const modeControlsButton = event.target.closest(
      "[data-action='toggle-mode-controls']"
    );

    if (modeControlsButton) {
      setModeControlsOpen(!isModeControlsOpen);
      return;
    }

    const clickedInsideModePanel = event.target.closest(
      ".kanban-mode-toolbar-slot, .matrix-mode-toolbar-slot, .mindmap-mode-toolbar-slot, .timeline-mode-toolbar-slot"
    );

    const clickedInsideControlDock = event.target.closest("[data-board-control-dock]");

    if (
      isModeControlsOpen &&
      !clickedInsideModePanel &&
      !clickedInsideControlDock
    ) {
      setModeControlsOpen(false);
    }

    if (modeButton) {
      activateModeButton(modeButton);
      return;
    }

    const sidebarButton = event.target.closest(
      "[data-action='toggle-sidebar']"
    );

    if (sidebarButton) {
      const app = qs("#app");
      const isOpen = app?.classList.toggle("is-sidebar-open") || false;

      sidebarButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
      return;
    }

    const exportButton = event.target.closest("[data-action='export-json']");

    if (exportButton) {
      exportBoardAsJson();
      return;
    }

    const importButton = event.target.closest("[data-action='import-json']");

    if (importButton) {
      importBoardFromJson();
      return;
    }

    const clearTagsButton = event.target.closest(
      "[data-action='clear-tag-filters']"
    );

    if (clearTagsButton) {
      clearTagFilters();
    }
  });

  document.addEventListener("change", (event) => {
    const typeCheckbox = event.target.closest("[data-filter-type]");

    if (typeCheckbox) {
      setTypeFilter(typeCheckbox.dataset.filterType, typeCheckbox.checked);
      return;
    }

    const tagCheckbox = event.target.closest("[data-filter-tag]");

    if (tagCheckbox) {
      setTagFilter(tagCheckbox.dataset.filterTag, tagCheckbox.checked);
    }
  });

  const searchInput = qs("[data-filter='search']");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      setSearchQuery(event.target.value);
    });
  }
}
