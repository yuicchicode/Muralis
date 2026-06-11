import {
  createBlock,
  getState,
  selectBlock,
  setActiveMode,
} from "../../app/state.js";
import { focusBlockInViewport } from "../../features/board/board.viewport.js";
import { showToast } from "../../ui/toast.js";
import { clearElement, createElement, qs } from "../../utils/dom.js";
import { refreshMatrixDrag } from "./matrix.drag.js";

import {
  getBlockTypeMeta,
  getTaskPriorityMeta,
} from "../../models/block.model.js";

const MATRIX_ALLOWED_TYPES = new Set(["task", "idea", "goal"]);
const MATRIX_SCORE_BY_LEVEL = {
  high: 5,
  low: 2,
};

const MATRIX_QUADRANTS = [
  {
    id: "high-impact-low-effort",
    title: "Priorizar",
    subtitle: "Alto impacto · Baixo esforço",
    description: "Ganhos rápidos que valem atenção primeiro.",
    icon: "⚡",
    impact: "high",
    effort: "low",
  },

  {
    id: "high-impact-high-effort",
    title: "Planejar",
    subtitle: "Alto impacto · Alto esforço",
    description: "Iniciativas relevantes que exigem preparação.",
    icon: "🧭",
    impact: "high",
    effort: "high",
  },

  {
    id: "low-impact-low-effort",
    title: "Fazer depois",
    subtitle: "Baixo impacto · Baixo esforço",
    description: "Ações simples, mas menos estratégicas.",
    icon: "🫧",
    impact: "low",
    effort: "low",
  },

  {
    id: "low-impact-high-effort",
    title: "Repensar",
    subtitle: "Baixo impacto · Alto esforço",
    description: "Talvez não compense investir energia aqui.",
    icon: "🪨",
    impact: "low",
    effort: "high",
  },
];

let activeMatrixCreateMenuId = null;

const matrixViewOptions = {
  type: "all",
  priority: "all",
};

function ensureMatrixToolbarSlot() {
  let slot = qs("[data-matrix-toolbar-slot]");
  const boardViewport = qs(".board-viewport");

  if (slot) {
    if (boardViewport && slot.parentElement !== boardViewport) {
      boardViewport.append(slot);
    }

    return slot;
  }

  if (!boardViewport) {
    return null;
  }

  slot = createElement("div", {
    className: "matrix-mode-toolbar-slot",
    attrs: {
      "data-matrix-toolbar-slot": "",
      id: "modeControlsPanel",
    },
  });

  boardViewport.append(slot);

  return slot;
}

export function clearMatrixModeToolbar() {
  const slot = qs("[data-matrix-toolbar-slot]");

  if (!slot) {
    return;
  }

  clearElement(slot);
  slot.hidden = true;
}

function createMatrixFilterSelect(label, field, value, options) {
  const wrapper = createElement("label", {
    className: "matrix-filter",
  });

  const labelElement = createElement("span", {
    className: "matrix-filter__label",
    text: label,
  });

  const select = createElement("select", {
    className: "matrix-filter__select",
    attrs: {
      "data-matrix-filter": field,
    },
  });

  options.forEach((optionData) => {
    const option = document.createElement("option");

    option.value = optionData.value;
    option.textContent = optionData.label;
    option.selected = optionData.value === value;

    select.append(option);
  });

  wrapper.append(labelElement, select);

  return wrapper;
}

function renderMatrixFilters(visibleCount) {
  const filters = createElement("div", {
    className: "mode-toolbar__filters matrix-toolbar__filters",
  });

  filters.append(
    createMatrixFilterSelect("Tipo", "type", matrixViewOptions.type, [
      {
        value: "all",
        label: "Todos",
      },
      {
        value: "task",
        label: "Tarefas",
      },
      {
        value: "idea",
        label: "Ideias",
      },
      {
        value: "goal",
        label: "Metas",
      },
    ]),

    createMatrixFilterSelect(
      "Prioridade das tarefas",
      "priority",
      matrixViewOptions.priority,
      [
        {
          value: "all",
          label: "Todas",
        },
        {
          value: "high",
          label: "Alta",
        },
        {
          value: "medium",
          label: "Média",
        },
        {
          value: "low",
          label: "Baixa",
        },
      ]
    ),

    createElement("span", {
      className: "matrix-filter__counter",
      text:
        visibleCount === 1
          ? "1 bloco visível"
          : `${visibleCount} blocos visíveis`,
    })
  );

  if (hasActiveMatrixFilters()) {
    filters.append(
      createElement("button", {
        className: "ghost-button matrix-filter__clear",
        text: "Limpar filtros",
        attrs: {
          type: "button",
          "data-matrix-action": "clear-matrix-filters",
        },
      })
    );
  }

  return filters;
}

function renderMatrixToolbar(visibleCount) {
  const slot = ensureMatrixToolbarSlot();

  if (!slot) {
    return;
  }

  clearElement(slot);
  slot.hidden = false;

  const toolbar = createElement("div", {
    className: "mode-toolbar matrix-mode-toolbar",
  });

  const heading = createElement("div", {
    className: "mode-toolbar__heading matrix-toolbar__heading",
  });

  heading.append(
    createElement("p", {
      className: "eyebrow",
      text: "Modo Matriz",
    }),
    createElement("h2", {
      text: "Esforço x impacto",
    }),
    createElement("p", {
      className: "matrix-toolbar__description",
      text: "Arraste cards entre quadrantes ou ajuste impacto e esforço no inspector.",
    })
  );

  const actions = createElement("div", {
    className: "mode-toolbar__actions matrix-toolbar__actions",
  });

  actions.append(
    createElement("button", {
      className: "ghost-button",
      text: "+ Ideia",
      attrs: {
        type: "button",
        "data-matrix-action": "create-idea",
      },
    }),
    createElement("button", {
      className: "ghost-button",
      text: "+ Meta",
      attrs: {
        type: "button",
        "data-matrix-action": "create-goal",
      },
    }),
    createElement("button", {
      className: "primary-button",
      text: "+ Tarefa",
      attrs: {
        type: "button",
        "data-matrix-action": "create-task",
      },
    })
  );

  const legend = createElement("div", {
    className: "mode-toolbar__meta matrix-toolbar__legend",
  });

  legend.append(
    createElement("span", {
      className: "matrix-toolbar__legend-item",
      text: "↑ Impacto",
    }),
    createElement("span", {
      className: "matrix-toolbar__legend-item",
      text: "→ Esforço",
    }),
    createElement("span", {
      className: "matrix-toolbar__legend-item",
      text: "Valores 1–3 = baixo · 4–5 = alto",
    })
  );

  const main = createElement("div", {
    className: "mode-toolbar__main",
  });

  main.append(heading, actions);
  toolbar.append(main, legend, renderMatrixFilters(visibleCount));
  
  slot.append(toolbar);
}

function getImpactLevel(block) {
  const impact = Number(block.impact || 3);

  return impact >= 4 ? "high" : "low";
}

function getEffortLevel(block) {
  const effort = Number(block.effort || 3);

  return effort >= 4 ? "high" : "low";
}

function matchesMatrixTypeFilter(block) {
  if (matrixViewOptions.type === "all") {
    return true;
  }

  return block.type === matrixViewOptions.type;
}

function matchesMatrixPriorityFilter(block) {
  if (matrixViewOptions.priority === "all") {
    return true;
  }

  if (block.type !== "task") {
    return false;
  }

  return block.priority === matrixViewOptions.priority;
}

function hasActiveMatrixFilters() {
  return (
    matrixViewOptions.type !== "all" ||
    matrixViewOptions.priority !== "all"
  );
}

function resetMatrixViewOptions() {
  matrixViewOptions.type = "all";
  matrixViewOptions.priority = "all";
}

function rerenderMatrixMode() {
  const state = getState();
  const boardCanvas = qs("#boardCanvas");

  if (!boardCanvas || state.board.activeMode !== "matrix") {
    return;
  }

  clearElement(boardCanvas);
  renderMatrixMode(boardCanvas, state);
}

function matchesMatrixQuadrant(block, quadrant) {
  return (
    getImpactLevel(block) === quadrant.impact &&
    getEffortLevel(block) === quadrant.effort
  );
}

function getVisibleMatrixBlocks(state) {
  const query = state.filters.query;
  const visibleTypes = state.filters.types;
  const selectedTags = state.filters.tags || new Set();

  return state.blocks.filter((block) => {
    if (!MATRIX_ALLOWED_TYPES.has(block.type)) {
      return false;
    }

    if (!visibleTypes.has(block.type)) {
      return false;
    }

    const blockTags = Array.isArray(block.tags) ? block.tags : [];

    const searchableContent = [
      block.title,
      block.content,
      block.type,
      block.priority,
      block.effort,
      block.impact,
      ...blockTags,
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery =
      query.length === 0 || searchableContent.includes(query);

    const matchesTags =
      selectedTags.size === 0 ||
      [...selectedTags].every((tag) => blockTags.includes(tag));

    return (
      matchesQuery &&
      matchesTags &&
      matchesMatrixTypeFilter(block) &&
      matchesMatrixPriorityFilter(block)
    );
  });
}

function renderMatrixTags(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  const wrapper = createElement("div", {
    className: "matrix-card__tags",
  });

  tags.slice(0, 4).forEach((tag) => {
    wrapper.append(
      createElement("span", {
        className: "matrix-card__tag",
        text: `#${tag}`,
      })
    );
  });

  if (tags.length > 4) {
    wrapper.append(
      createElement("span", {
        className: "matrix-card__tag matrix-card__tag--extra",
        text: `+${tags.length - 4}`,
      })
    );
  }

  return wrapper;
}

function renderPriorityChip(block) {
  if (block.type !== "task") {
    return null;
  }

  const priorityMeta = getTaskPriorityMeta(block.priority);

  return createElement("span", {
    className: `matrix-chip matrix-chip--priority matrix-chip--${priorityMeta.value}`,
    text: priorityMeta.label,
  });
}

function renderMatrixCard(block, state) {
  const meta = getBlockTypeMeta(block.type);
  const isSelected = state.selectedBlockIds.includes(block.id);

  const card = createElement("article", {
    className: `matrix-card${isSelected ? " is-selected" : ""}`,
    attrs: {
      tabindex: "0",
      role: "button",
      "aria-label": `${meta.label}: ${block.title}`,
    },
    dataset: {
      blockId: block.id,
      matrixCard: "",
      type: block.type,
    },
  });

  const header = createElement("div", {
    className: "matrix-card__header",
  });

  const type = createElement("span", {
    className: "matrix-card__type",
    text: `${meta.icon} ${meta.label}`,
  });

  const title = createElement("h3", {
    className: "matrix-card__title",
    text: block.title,
  });

  header.append(type, title);

  const content = createElement("p", {
    className: "matrix-card__content",
    text: block.content,
  });

  const metrics = createElement("div", {
    className: "matrix-card__metrics",
  });

  metrics.append(
    createElement("span", {
      className: "matrix-chip",
      text: `Impacto ${block.impact ?? 3}`,
    }),
    createElement("span", {
      className: "matrix-chip",
      text: `Esforço ${block.effort ?? 3}`,
    })
  );

  const priorityChip = renderPriorityChip(block);

  if (priorityChip) {
    metrics.append(priorityChip);
  }

  const tags = renderMatrixTags(block.tags);

  const actions = createElement("div", {
      className: "matrix-card__actions",
  });

  const openInBoardButton = createElement("button", {
    className: "matrix-card__open-board",
    text: "Ver no mural",
    attrs: {
      type: "button",
      title: "Abrir este bloco no mural livre",
      "data-matrix-action": "open-block-in-board",
      "data-block-id": block.id,
    },
  });

  actions.append(openInBoardButton);

  card.append(header, content, metrics);

  if (tags) {
    card.append(tags);
  }

  card.append(actions);

  card.addEventListener("click", (event) => {
    const isInteractive = event.target.closest("button, input, a");
  
    if (isInteractive) {
      return;
    }
  
    selectBlock(block.id);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectBlock(block.id);
    }
  });

  return card;
}

function renderMatrixEmptyState() {
  const empty = createElement("div", {
    className: "matrix-quadrant__empty",
  });

  empty.append(
    createElement("strong", {
      text: "Nenhum item aqui",
    }),
    createElement("p", {
      text: "Use o botão + deste quadrante para criar algo nesta área.",
    })
  );

  return empty;
}

function renderQuadrantCreateMenu(quadrant) {
  const wrapper = createElement("div", {
    className: "matrix-quadrant__create",
    attrs: {
      "data-matrix-create-root": quadrant.id,
    },
  });

  const button = createElement("button", {
    className: "matrix-quadrant__add",
    text: "+",
    attrs: {
      type: "button",
      title: `Criar bloco em ${quadrant.title}`,
      "aria-label": `Criar bloco em ${quadrant.title}`,
      "data-matrix-action": "toggle-quadrant-create-menu",
      "data-quadrant-id": quadrant.id,
    },
  });

  const menu = createElement("div", {
    className: "matrix-quadrant__create-menu",
    attrs: {
      "data-matrix-create-menu": quadrant.id,
    },
  });

  if (activeMatrixCreateMenuId !== quadrant.id) {
    menu.hidden = true;
  }

  const taskButton = createElement("button", {
    className: "matrix-quadrant__create-item",
    text: "Nova tarefa",
    attrs: {
      type: "button",
      "data-matrix-action": "create-in-quadrant",
      "data-block-type": "task",
      "data-impact-level": quadrant.impact,
      "data-effort-level": quadrant.effort,
    },
  });

  const ideaButton = createElement("button", {
    className: "matrix-quadrant__create-item",
    text: "Nova ideia",
    attrs: {
      type: "button",
      "data-matrix-action": "create-in-quadrant",
      "data-block-type": "idea",
      "data-impact-level": quadrant.impact,
      "data-effort-level": quadrant.effort,
    },
  });

  const goalButton = createElement("button", {
    className: "matrix-quadrant__create-item",
    text: "Nova meta",
    attrs: {
      type: "button",
      "data-matrix-action": "create-in-quadrant",
      "data-block-type": "goal",
      "data-impact-level": quadrant.impact,
      "data-effort-level": quadrant.effort,
    },
  });

  menu.append(taskButton, ideaButton, goalButton);
  wrapper.append(button, menu);

  return wrapper;
}

function renderMatrixQuadrant(quadrant, blocks, state) {
  const quadrantElement = createElement("section", {
    className: "matrix-quadrant",
    dataset: {
      matrixQuadrant: quadrant.id,
      impact: quadrant.impact,
      effort: quadrant.effort,
    },
  });

  const header = createElement("div", {
    className: "matrix-quadrant__header",
  });

  const heading = createElement("div", {
    className: "matrix-quadrant__heading",
  });

  heading.append(
    createElement("span", {
      className: "matrix-quadrant__icon",
      text: quadrant.icon,
    }),
    createElement("div", {
      className: "matrix-quadrant__title-group",
    })
  );

  const titleGroup = heading.lastElementChild;

  titleGroup.append(
    createElement("h3", {
      className: "matrix-quadrant__title",
      text: quadrant.title,
    }),
    createElement("p", {
      className: "matrix-quadrant__subtitle",
      text: quadrant.subtitle,
    })
  );

  const headerActions = createElement("div", {
    className: "matrix-quadrant__header-actions",
  });
  
  const count = createElement("span", {
    className: "matrix-quadrant__count",
    text: `${blocks.length}`,
  });
  
  headerActions.append(
    count,
    renderQuadrantCreateMenu(quadrant)
  );
  
  header.append(heading, headerActions);

  const description = createElement("p", {
    className: "matrix-quadrant__description",
    text: quadrant.description,
  });

  const list = createElement("div", {
    className: "matrix-quadrant__list",
    attrs: {
        "data-matrix-drop-list": "",
        "data-impact": quadrant.impact,
        "data-effort": quadrant.effort,
    },
  });

  if (blocks.length === 0) {
    list.append(renderMatrixEmptyState());
  } else {
    blocks.forEach((block) => {
      list.append(renderMatrixCard(block, state));
    });
  }

  quadrantElement.append(header, description, list);

  return quadrantElement;
}

function createMatrixBlockInQuadrant(type, impactLevel, effortLevel) {
  const impact = MATRIX_SCORE_BY_LEVEL[impactLevel];
  const effort = MATRIX_SCORE_BY_LEVEL[effortLevel];

  if (!impact || !effort) {
    return;
  }

  const block = createBlock(type, {
    impact,
    effort,
  });

  if (!block) {
    return;
  }

  activeMatrixCreateMenuId = null;

  showToast("Bloco criado neste quadrante.", {
    type: "success",
  });
}

function createMatrixBlock(type) {
  const block = createBlock(type);

  if (!block) {
    return;
  }

  showToast("Bloco criado para a Matriz.", {
    type: "success",
  });
}

function openBlockInFreeBoard(blockId) {
  const state = getState();

  const block = state.blocks.find((item) => item.id === blockId);

  if (!block) {
    showToast("Não foi possível localizar este bloco no mural.", {
      type: "error",
    });

    return;
  }

  setActiveMode("free");
  selectBlock(blockId);

  window.requestAnimationFrame(() => {
    focusBlockInViewport(blockId);
  });

  showToast(`"${block.title}" aberto no mural livre.`, {
    type: "info",
    duration: 2200,
  });
}

export function setupMatrixControls() {
  document.addEventListener("click", (event) => {
    const toggleCreateMenuButton = event.target.closest(
      "[data-matrix-action='toggle-quadrant-create-menu']"
    );
    
    if (toggleCreateMenuButton) {
      const quadrantId = toggleCreateMenuButton.dataset.quadrantId;
    
      activeMatrixCreateMenuId =
        activeMatrixCreateMenuId === quadrantId ? null : quadrantId;
    
      const state = getState();
      const boardCanvas = qs("#boardCanvas");
    
      if (boardCanvas && state.board.activeMode === "matrix") {
        clearElement(boardCanvas);
        renderMatrixMode(boardCanvas, state);
      }
    
      return;
    }

    const clearMatrixFiltersButton = event.target.closest(
      "[data-matrix-action='clear-matrix-filters']"
    );
    
    if (clearMatrixFiltersButton) {
      resetMatrixViewOptions();
      rerenderMatrixMode();
      return;
    }
    
    const createInQuadrantButton = event.target.closest(
      "[data-matrix-action='create-in-quadrant']"
    );
    
    if (createInQuadrantButton) {
      createMatrixBlockInQuadrant(
        createInQuadrantButton.dataset.blockType,
        createInQuadrantButton.dataset.impactLevel,
        createInQuadrantButton.dataset.effortLevel
      );
    
      return;
    }

    const createIdeaButton = event.target.closest(
      "[data-matrix-action='create-idea']"
    );

    if (createIdeaButton) {
      createMatrixBlock("idea");
      return;
    }

    const createGoalButton = event.target.closest(
      "[data-matrix-action='create-goal']"
    );

    if (createGoalButton) {
      createMatrixBlock("goal");
      return;
    }

    const createTaskButton = event.target.closest(
      "[data-matrix-action='create-task']"
    );

    if (createTaskButton) {
      createMatrixBlock("task");
      return;
    }

    const openInBoardButton = event.target.closest(
      "[data-matrix-action='open-block-in-board']"
    );

    if (openInBoardButton) {
      openBlockInFreeBoard(openInBoardButton.dataset.blockId);
    }
    
    const clickedInsideQuadrantCreate = event.target.closest(
      "[data-matrix-create-root]"
    );
    
    if (!clickedInsideQuadrantCreate && activeMatrixCreateMenuId !== null) {
      activeMatrixCreateMenuId = null;
    
      const state = getState();
      const boardCanvas = qs("#boardCanvas");
    
      if (boardCanvas && state.board.activeMode === "matrix") {
        clearElement(boardCanvas);
        renderMatrixMode(boardCanvas, state);
      }
    }
  });

  document.addEventListener("change", (event) => {
    const matrixFilter = event.target.closest("[data-matrix-filter]");
  
    if (!matrixFilter) {
      return;
    }
  
    const field = matrixFilter.dataset.matrixFilter;
  
    if (!(field in matrixViewOptions)) {
      return;
    }
  
    matrixViewOptions[field] = matrixFilter.value;
  
    rerenderMatrixMode();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || activeMatrixCreateMenuId === null) {
      return;
    }
  
    activeMatrixCreateMenuId = null;
  
    const state = getState();
    const boardCanvas = qs("#boardCanvas");
  
    if (boardCanvas && state.board.activeMode === "matrix") {
      clearElement(boardCanvas);
      renderMatrixMode(boardCanvas, state);
    }
  });
}

export function renderMatrixMode(boardCanvas, state) {
  const visibleBlocks = getVisibleMatrixBlocks(state);

  renderMatrixToolbar(visibleBlocks.length);

  const wrapper = createElement("div", {
    className: "matrix-mode",
  });

  const frame = createElement("section", {
    className: "matrix-frame",
  });

  const impactAxis = createElement("div", {
    className: "matrix-axis matrix-axis--impact",
    text: "Impacto ↑",
  });

  const effortAxis = createElement("div", {
    className: "matrix-axis matrix-axis--effort",
    text: "Esforço →",
  });

  const grid = createElement("div", {
    className: "matrix-grid",
  });

  MATRIX_QUADRANTS.forEach((quadrant) => {
    const blocks = visibleBlocks.filter((block) => {
      return matchesMatrixQuadrant(block, quadrant);
    });

    grid.append(renderMatrixQuadrant(quadrant, blocks, state));
  });

  frame.append(impactAxis, effortAxis, grid);
  wrapper.append(frame);
  boardCanvas.append(wrapper);

  window.requestAnimationFrame(() => {
    refreshMatrixDrag();
  });
}
