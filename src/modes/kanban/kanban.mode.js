import {
  addTaskToActiveKanban,
  createBlock,
  createKanban,
  createKanbanStage,
  createTaskInKanbanStage,
  deleteKanban,
  deleteKanbanStage,
  getState,
  moveKanbanStage,
  removeTaskFromActiveKanban,
  renameKanban,
  resetActiveKanbanViewOptions,
  selectBlock,
  setActiveKanban,
  setActiveKanbanViewOption,
  setActiveMode,
  toggleActiveKanbanStageExpanded,
  updateKanbanStage,
} from "../../app/state.js";

import {
  TASK_STATUS,
  getTaskPriorityMeta,
  getTaskStatusMeta,
} from "../../models/block.model.js";

import {
  openConfirmDialog,
  openTextPrompt,
} from "../../ui/modal.js";

import { showToast } from "../../ui/toast.js";
import { refreshKanbanDrag } from "./kanban.drag.js";
import { clearElement, createElement, qs } from "../../utils/dom.js";
import { focusBlockInViewport } from "../../features/board/board.viewport.js";

let isKanbanPickerOpen = false;
const MAX_COLLAPSED_CARDS = 3;

function getKanbanViewOptions(state) {
  return (
    state.activeKanbanPreferences || {
      priority: "all",
      due: "all",
      completion: "all",
      sort: "manual",
      expandedStageIds: [],
    }
  );
}

const PRIORITY_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
};

const STAGE_COLORS = {
  purple: "Roxo",
  blue: "Azul",
  orange: "Laranja",
  green: "Verde",
  yellow: "Amarelo",
  pink: "Rosa",
  white: "Branco",
};

function formatDate(dateString) {
  if (!dateString) {
    return null;
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function isOverdue(task) {
  if (!task.dueDate || task.status === "done") {
    return false;
  }

  const today = new Date();
  const dueDate = new Date(`${task.dueDate}T23:59:59`);

  return dueDate < today;
}

function getDateOnly(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDueDate(task) {
  if (!task.dueDate) {
    return null;
  }

  const date = new Date(`${task.dueDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function isDueToday(task) {
  const dueDate = getDueDate(task);

  if (!dueDate) {
    return false;
  }

  return dueDate.getTime() === getDateOnly().getTime();
}

function isDueThisWeek(task) {
  const dueDate = getDueDate(task);

  if (!dueDate) {
    return false;
  }

  const today = getDateOnly();
  const sevenDaysFromNow = new Date(today);

  sevenDaysFromNow.setDate(today.getDate() + 7);

  return dueDate >= today && dueDate <= sevenDaysFromNow;
}

function matchesKanbanPriorityFilter(task, viewOptions) {
  if (viewOptions.priority === "all") {
    return true;
  }

  return task.priority === viewOptions.priority;
}

function matchesKanbanDueFilter(task, viewOptions) {
  if (viewOptions.due === "all") {
    return true;
  }

  if (viewOptions.due === "overdue") {
    return isOverdue(task);
  }

  if (viewOptions.due === "today") {
    return isDueToday(task);
  }

  if (viewOptions.due === "week") {
    return isDueThisWeek(task);
  }

  if (viewOptions.due === "no-date") {
    return !task.dueDate;
  }

  return true;
}

function matchesKanbanCompletionFilter(task, viewOptions) {
  if (viewOptions.completion === "all") {
    return true;
  }

  if (viewOptions.completion === "open") {
    return task.status !== "done";
  }

  if (viewOptions.completion === "done") {
    return task.status === "done";
  }

  return true;
}

function compareByDueDate(a, b) {
  const dateA = getDueDate(a);
  const dateB = getDueDate(b);

  if (!dateA && !dateB) {
    return a.kanbanOrder - b.kanbanOrder;
  }

  if (!dateA) {
    return 1;
  }

  if (!dateB) {
    return -1;
  }

  return dateA - dateB;
}

function compareByPriority(a, b) {
  const priorityA = PRIORITY_WEIGHT[a.priority] || PRIORITY_WEIGHT.medium;
  const priorityB = PRIORITY_WEIGHT[b.priority] || PRIORITY_WEIGHT.medium;

  if (priorityA === priorityB) {
    return a.kanbanOrder - b.kanbanOrder;
  }

  return priorityB - priorityA;
}

function compareByCreatedAt(a, b) {
  const dateA = new Date(a.createdAt || 0).getTime();
  const dateB = new Date(b.createdAt || 0).getTime();

  return dateB - dateA;
}

function sortKanbanTasks(tasks, viewOptions) {
  const sortedTasks = [...tasks];

  if (viewOptions.sort === "due") {
    return sortedTasks.sort(compareByDueDate);
  }

  if (viewOptions.sort === "priority") {
    return sortedTasks.sort(compareByPriority);
  }

  if (viewOptions.sort === "created") {
    return sortedTasks.sort(compareByCreatedAt);
  }

  return sortedTasks.sort((a, b) => a.kanbanOrder - b.kanbanOrder);
}

function hasActiveKanbanFilters(viewOptions) {
  return (
    viewOptions.priority !== "all" ||
    viewOptions.due !== "all" ||
    viewOptions.completion !== "all" ||
    viewOptions.sort !== "manual"
  );
}


function rerenderKanbanMode() {
  const state = getState();
  const boardCanvas = qs("#boardCanvas");

  if (!boardCanvas || state.board.activeMode !== "kanban") {
    return;
  }

  clearElement(boardCanvas);
  renderKanbanMode(boardCanvas, state);
}

function getVisibleKanbanTasks(state) {
  const viewOptions = getKanbanViewOptions(state);
  const query = state.filters.query;
  const visibleTypes = state.filters.types;
  const selectedTags = state.filters.tags || new Set();

  if (!visibleTypes.has("task")) {
    return [];
  }

  const taskById = new Map(
    state.blocks
      .filter((block) => block.type === "task")
      .map((block) => [block.id, block])
  );

  return state.kanbanItems
    .map((item) => {
      const task = taskById.get(item.blockId);

      if (!task) {
        return null;
      }

      return {
        ...task,
        kanbanItemId: item.id,
        kanbanStageId: item.stageId,
        kanbanOrder: item.order,
      };
    })
    .filter(Boolean)
    .filter((task) => {
      const blockTags = Array.isArray(task.tags) ? task.tags : [];

      const searchableContent = [
        task.title,
        task.content,
        task.status,
        task.priority,
        task.dueDate,
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
        matchesKanbanPriorityFilter(task, viewOptions) &&
        matchesKanbanDueFilter(task, viewOptions) &&
        matchesKanbanCompletionFilter(task, viewOptions)
      );
    });
}

function getTasksByStage(tasks, stageId, state) {
  const stageTasks = tasks.filter((task) => task.kanbanStageId === stageId);
  const viewOptions = getKanbanViewOptions(state);

  return sortKanbanTasks(stageTasks, viewOptions);
}

function renderKanbanTags(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  const wrapper = createElement("div", {
    className: "kanban-card__tags",
  });

  tags.slice(0, 4).forEach((tag) => {
    wrapper.append(
      createElement("span", {
        className: "kanban-card__tag",
        text: `#${tag}`,
      })
    );
  });

  if (tags.length > 4) {
    wrapper.append(
      createElement("span", {
        className: "kanban-card__tag kanban-card__tag--extra",
        text: `+${tags.length - 4}`,
      })
    );
  }

  return wrapper;
}

function renderKanbanCard(task, state) {
  const isSelected = state.selectedBlockIds.includes(task.id);
  const priorityMeta = getTaskPriorityMeta(task.priority);
  const statusMeta = getTaskStatusMeta(task.status);
  const dueDate = formatDate(task.dueDate);

  const card = createElement("article", {
    className: `kanban-card${isSelected ? " is-selected" : ""}`,
    attrs: {
      tabindex: "0",
      role: "button",
      "aria-label": `Tarefa: ${task.title}`,
    },
    dataset: {
      blockId: task.id,
      kanbanItemId: task.kanbanItemId,
      kanbanCard: "",
      status: task.status || "todo",
    },
  });

  const header = createElement("div", {
    className: "kanban-card__header",
  });

  const checkbox = createElement("input", {
    className: "kanban-card__check",
    attrs: {
      type: "checkbox",
      "aria-label": "Marcar tarefa como concluída",
      "data-task-done-toggle": "",
    },
  });

  checkbox.checked = task.status === "done";

  const title = createElement("h3", {
    className: "kanban-card__title",
    text: task.title,
  });

  const removeButton = createElement("button", {
    className: "kanban-card__remove",
    text: "×",
    attrs: {
      type: "button",
      title: "Remover deste Kanban",
      "aria-label": "Remover tarefa deste Kanban",
      "data-kanban-action": "remove-task-from-kanban",
      "data-kanban-item-id": task.kanbanItemId,
    },
  });

  header.append(checkbox, title, removeButton);

  const content = createElement("p", {
    className: "kanban-card__content",
    text: task.content,
  });

  const meta = createElement("div", {
    className: "kanban-card__meta",
  });

  meta.append(
    createElement("span", {
      className: "kanban-chip kanban-chip--status",
      text: statusMeta.label,
    }),
    createElement("span", {
      className: `kanban-chip kanban-chip--priority kanban-chip--${priorityMeta.value}`,
      text: priorityMeta.label,
    })
  );

  if (dueDate) {
    meta.append(
      createElement("span", {
        className: `kanban-chip kanban-chip--date${
          isOverdue(task) ? " is-overdue" : ""
        }`,
        text: dueDate,
      })
    );
  }

  const tags = renderKanbanTags(task.tags);

  const actions = createElement("div", {
    className: "kanban-card__actions",
  });

  const openInBoardButton = createElement("button", {
    className: "kanban-card__open-board",
    text: "Ver no mural",
    attrs: {
      type: "button",
      title: "Abrir esta tarefa no mural livre",
      "data-kanban-action": "open-task-in-board",
      "data-block-id": task.id,
    },
  });

  actions.append(openInBoardButton);

  card.append(header, content, meta);

  if (tags) {
    card.append(tags);
  }

  card.append(actions);

  card.addEventListener("click", (event) => {
    const isInteractive = event.target.closest("input, button, a");

    if (isInteractive) {
      return;
    }

    selectBlock(task.id);
  });

  return card;
}

function renderKanbanColumn(stage, tasks, state) {
  const expandedStageIds = state.activeKanbanPreferences?.expandedStageIds || [];

  const isExpanded = expandedStageIds.includes(stage.id);
  const hasHiddenCards = tasks.length > MAX_COLLAPSED_CARDS;

  const visibleTasks = isExpanded
    ? tasks
    : tasks.slice(0, MAX_COLLAPSED_CARDS);

  const hiddenCount = Math.max(tasks.length - MAX_COLLAPSED_CARDS, 0);

  const column = createElement("section", {
    className: `kanban-column${isExpanded ? " is-expanded" : " is-collapsed"}`,
    dataset: {
      kanbanColumn: stage.id,
      status: stage.status || "todo",
      color: stage.color || "blue",
    },
  });

  const header = createElement("div", {
    className: "kanban-column__header",
  });

  const titleGroup = createElement("div", {
    className: "kanban-column__title-group",
  });

  const title = createElement("h3", {
    className: "kanban-column__title",
    text: stage.name,
  });

  const count = createElement("span", {
    className: "kanban-column__count",
    text: `${tasks.length}`,
  });

  titleGroup.append(title, count);

  const addButton = createElement("button", {
    className: "kanban-column__add",
    text: "+",
    attrs: {
      type: "button",
      title: `Criar tarefa em ${stage.name}`,
      "aria-label": `Criar tarefa em ${stage.name}`,
      "data-kanban-action": "create-task",
      "data-kanban-stage-id": stage.id,
    },
  });

  header.append(titleGroup, addButton);

  const list = createElement("div", {
    className: "kanban-column__list",
    attrs: {
      "data-kanban-stage-list": "",
      "data-stage-id": stage.id,
    },
  });

  if (tasks.length === 0) {
    list.append(
      createElement("div", {
        className: "kanban-column__empty",
        text: "Nenhuma tarefa aqui.",
      })
    );
  } else {
    visibleTasks.forEach((task) => {
      list.append(renderKanbanCard(task, state));
    });
  }

  column.append(header, list);

  if (hasHiddenCards) {
    const footer = createElement("div", {
      className: "kanban-column__footer",
    });

    const toggleButton = createElement("button", {
      className: "kanban-column__show-more",
      text: isExpanded
        ? "Mostrar menos"
        : `Mostrar mais ${hiddenCount}`,
      attrs: {
        type: "button",
        "data-kanban-action": "toggle-stage-expanded",
        "data-kanban-stage-id": stage.id,
      },
    });

    footer.append(toggleButton);
    column.append(footer);
  }

  return column;
}

function renderKanbanPicker(state) {
  const picker = createElement("div", {
    className: "kanban-picker",
    attrs: {
      "data-kanban-picker": "",
    },
  });

  const button = createElement("button", {
    className: "kanban-picker__button",
    attrs: {
      type: "button",
      "data-kanban-picker-button": "",
      "aria-haspopup": "listbox",
      "aria-expanded": isKanbanPickerOpen ? "true" : "false",
    },
  });

  button.append(
    createElement("span", {
      className: "kanban-picker__label",
      text: state.activeKanban?.name || "Kanban",
    }),
    createElement("span", {
      className: "kanban-picker__icon",
      text: "⌄",
      attrs: {
        "aria-hidden": "true",
      },
    })
  );

  const menu = createElement("div", {
    className: "kanban-picker__menu",
    attrs: {
      role: "listbox",
      "data-kanban-picker-menu": "",
    },
  });

  if (!isKanbanPickerOpen) {
    menu.hidden = true;
  }

  state.kanbans.forEach((kanban) => {
    const isActive = kanban.id === state.activeKanbanId;

    const item = createElement("button", {
      className: `kanban-picker__item${isActive ? " is-active" : ""}`,
      attrs: {
        type: "button",
        role: "option",
        "aria-selected": isActive ? "true" : "false",
        "data-kanban-option": kanban.id,
      },
    });

    item.append(
      createElement("span", {
        className: "kanban-picker__item-name",
        text: kanban.name,
      }),
      createElement("span", {
        className: "kanban-picker__item-meta",
        text: isActive ? "Atual" : "Abrir",
      })
    );

    menu.append(item);
  });

  picker.append(button, menu);

  return picker;
}

function renderKanbanEmptyState(container) {
  const empty = createElement("div", {
    className: "kanban-empty",
  });

  empty.append(
    createElement("div", {
      className: "empty-state__icon",
      text: "✓",
      attrs: {
        "aria-hidden": "true",
      },
    }),
    createElement("h2", {
      text: "Nenhuma tarefa neste Kanban",
    }),
    createElement("p", {
      text: "Crie uma tarefa para começar a organizar este fluxo.",
    }),
    createElement("button", {
      className: "primary-button",
      text: "+ Criar tarefa",
      attrs: {
        type: "button",
        "data-kanban-action": "create-task",
      },
    })
  );

  container.append(empty);
}

function ensureKanbanToolbarSlot() {
  let slot = qs("[data-kanban-toolbar-slot]");
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
    className: "kanban-mode-toolbar-slot",
    attrs: {
      "data-kanban-toolbar-slot": "",
      id: "modeControlsPanel",
    },
  });

  boardViewport.append(slot);

  return slot;
}

export function clearKanbanModeToolbar() {
  const slot = qs("[data-kanban-toolbar-slot]");

  if (!slot) {
    return;
  }

  clearElement(slot);
  slot.hidden = true;
}

function createKanbanFilterSelect(label, field, value, options) {
  const wrapper = createElement("label", {
    className: "kanban-filter",
  });

  const labelElement = createElement("span", {
    className: "kanban-filter__label",
    text: label,
  });

  const select = createElement("select", {
    className: "kanban-filter__select",
    attrs: {
      "data-kanban-filter": field,
    },
  });

  options.forEach((optionData) => {
    const option = document.createElement("option");

    option.value = optionData.value;
    option.textContent = optionData.label;
    option.selected = value === optionData.value;

    select.append(option);
  });

  wrapper.append(labelElement, select);

  return wrapper;
}

function renderKanbanFilters() {
  const state = getState();
  const viewOptions = getKanbanViewOptions(state);
  const filters = createElement("div", {
    className: "mode-toolbar__filters kanban-toolbar__filters",
  });

  filters.append(
    createKanbanFilterSelect("Prioridade", "priority", viewOptions.priority, [
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
    ]),
    createKanbanFilterSelect("Prazo", "due", viewOptions.due, [
      {
        value: "all",
        label: "Todos",
      },
      {
        value: "overdue",
        label: "Atrasadas",
      },
      {
        value: "today",
        label: "Hoje",
      },
      {
        value: "week",
        label: "Próximos 7 dias",
      },
      {
        value: "no-date",
        label: "Sem prazo",
      },
    ]),
    createKanbanFilterSelect(
      "Conclusão",
      "completion",
      viewOptions.completion,
      [
        {
          value: "all",
          label: "Todas",
        },
        {
          value: "open",
          label: "Abertas",
        },
        {
          value: "done",
          label: "Concluídas",
        },
      ]
    ),
    createKanbanFilterSelect("Ordenar", "sort", viewOptions.sort, [
      {
        value: "manual",
        label: "Manual",
      },
      {
        value: "due",
        label: "Prazo",
      },
      {
        value: "priority",
        label: "Prioridade",
      },
      {
        value: "created",
        label: "Mais recentes",
      },
    ])
  );

  if (hasActiveKanbanFilters(viewOptions)) {
    filters.append(
      createElement("button", {
        className: "ghost-button kanban-filter__clear",
        text: "Limpar filtros",
        attrs: {
          type: "button",
          "data-kanban-action": "clear-view-filters",
        },
      })
    );
  }

  if (viewOptions.sort !== "manual") {
    filters.append(
      createElement("span", {
        className: "kanban-filter__hint",
        text: "Arraste disponível apenas na ordenação manual.",
      })
    );
  }

  return filters;
}

function renderKanbanModeToolbar(state) {
  const slot = ensureKanbanToolbarSlot();

  if (!slot) {
    return;
  }

  clearElement(slot);
  slot.hidden = false;

  const toolbar = createElement("div", {
    className: "mode-toolbar kanban-mode-toolbar",
  });

  const heading = createElement("div", {
    className: "mode-toolbar__heading kanban-toolbar__heading",
  });

  heading.append(
    createElement("p", {
      className: "eyebrow",
      text: "Modo Kanban",
    }),
    createElement("h2", {
      text: "Fluxo de tarefas",
    })
  );

  const main = createElement("div", {
    className: "mode-toolbar__main",
  });

  const actions = createElement("div", {
    className: "mode-toolbar__actions kanban-toolbar__actions",
  });

  actions.append(
    renderKanbanPicker(state),
    createElement("button", {
      className: "ghost-button",
      text: "Renomear",
      attrs: {
        type: "button",
        "data-kanban-action": "rename-kanban",
      },
    }),
    createElement("button", {
      className: "ghost-button mode-toolbar__danger-action",
      text: "Excluir",
      attrs: {
        type: "button",
        "data-kanban-action": "delete-kanban",
      },
    }),
    createElement("button", {
      className: "ghost-button",
      text: "Etapas",
      attrs: {
        type: "button",
        "data-kanban-action": "edit-stages",
      },
    }),
    createElement("button", {
      className: "ghost-button",
      text: "+ Novo Kanban",
      attrs: {
        type: "button",
        "data-kanban-action": "create-kanban",
      },
    }),
    createElement("button", {
      className: "ghost-button",
      text: "+ Tarefas existentes",
      attrs: {
        type: "button",
        "data-kanban-action": "add-existing-tasks",
      },
    }),
    createElement("button", {
      className: "primary-button",
      text: "+ Nova tarefa",
      attrs: {
        type: "button",
        "data-kanban-action": "create-task",
      },
    })
  );

  main.append(heading, actions);
  toolbar.append(main, renderKanbanFilters());
  slot.append(toolbar);
}

export function renderKanbanMode(boardCanvas, state) {
  renderKanbanModeToolbar(state);
  const viewOptions = getKanbanViewOptions(state);

  boardCanvas.dataset.kanbanSort = viewOptions.sort;

  const tasks = getVisibleKanbanTasks(state);

  const wrapper = createElement("div", {
    className: "kanban-mode",
  });

  const columns = createElement("div", {
    className: "kanban-columns",
  });

  state.kanbanStages.forEach((stage) => {
    const columnTasks = getTasksByStage(tasks, stage.id, state);
    columns.append(renderKanbanColumn(stage, columnTasks, state));
  });

  if (state.kanbanItems.length === 0) {
    renderKanbanEmptyState(wrapper);
  } else {
    wrapper.append(columns);
  }

  boardCanvas.append(wrapper);

  window.requestAnimationFrame(() => {
    refreshKanbanDrag();
  });
}

function closeKanbanPicker() {
  isKanbanPickerOpen = false;

  const menu = qs("[data-kanban-picker-menu]");
  const button = qs("[data-kanban-picker-button]");

  if (menu) {
    menu.hidden = true;
  }

  button?.setAttribute("aria-expanded", "false");
}

function toggleKanbanPicker() {
  isKanbanPickerOpen = !isKanbanPickerOpen;

  const menu = qs("[data-kanban-picker-menu]");
  const button = qs("[data-kanban-picker-button]");

  if (menu) {
    menu.hidden = !isKanbanPickerOpen;
  }

  button?.setAttribute("aria-expanded", isKanbanPickerOpen ? "true" : "false");
}

async function createKanbanFromModal() {
  const name = await openTextPrompt({
    title: "Criar novo Kanban",
    description: "Crie um fluxo separado dentro do mural atual.",
    label: "Nome do Kanban",
    placeholder: "Ex: Desenvolvimento, Estudos, Conteúdo...",
    initialValue: "Novo Kanban",
    confirmText: "Criar Kanban",
  });

  if (name === null) {
    return;
  }

  const kanban = createKanban(name);

  showToast(`Kanban "${kanban.name}" criado.`, {
    type: "success",
  });
}

async function renameCurrentKanbanFromModal() {
  const state = getState();

  if (!state.activeKanban) {
    return;
  }

  const nextName = await openTextPrompt({
    title: "Renomear Kanban",
    description: "Altere o nome do fluxo atual.",
    label: "Nome do Kanban",
    placeholder: "Digite o novo nome",
    initialValue: state.activeKanban.name,
    confirmText: "Salvar nome",
  });

  if (nextName === null) {
    return;
  }

  const renamedKanban = renameKanban(state.activeKanban.id, nextName);

  if (!renamedKanban) {
    showToast("Digite um nome válido para o Kanban.", {
      type: "warning",
    });

    return;
  }

  showToast(`Kanban renomeado para "${renamedKanban.name}".`, {
    type: "success",
  });
}

function getModalRoot() {
  let root = qs("#modalRoot");

  if (!root) {
    root = createElement("div", {
      className: "modal-root",
      attrs: {
        id: "modalRoot",
      },
    });

    document.body.append(root);
  }

  return root;
}

function closeStageEditor() {
  const root = getModalRoot();

  clearElement(root);
  document.body.classList.remove("is-modal-open");
}

function renderStatusOptions(currentStatus) {
  const select = createElement("select", {
    className: "input kanban-stage-editor__select",
    attrs: {
      "data-stage-field": "status",
    },
  });

  Object.entries(TASK_STATUS).forEach(([status, meta]) => {
    const option = document.createElement("option");

    option.value = status;
    option.textContent = meta.label;
    option.selected = status === currentStatus;

    select.append(option);
  });

  return select;
}

function renderColorOptions(currentColor) {
  const select = createElement("select", {
    className: "input kanban-stage-editor__select",
    attrs: {
      "data-stage-field": "color",
    },
  });

  Object.entries(STAGE_COLORS).forEach(([color, label]) => {
    const option = document.createElement("option");

    option.value = color;
    option.textContent = label;
    option.selected = color === currentColor;

    select.append(option);
  });

  return select;
}

function renderStageEditor() {
  const state = getState();
  const root = getModalRoot();

  clearElement(root);
  document.body.classList.add("is-modal-open");

  const overlay = createElement("div", {
    className: "app-modal-overlay",
  });

  const modal = createElement("section", {
    className: "app-modal kanban-stage-modal",
    attrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Editar etapas do Kanban",
    },
  });

  const header = createElement("div", {
    className: "app-modal__header",
  });

  header.append(
    createElement("p", {
      className: "eyebrow",
      text: "Kanban",
    }),
    createElement("h2", {
      text: "Editar etapas",
    }),
    createElement("p", {
      className: "app-modal__description",
      text: "Personalize as colunas deste Kanban. As mudanças são salvas automaticamente.",
    })
  );

  const list = createElement("div", {
    className: "kanban-stage-editor",
  });

  state.kanbanStages.forEach((stage, index) => {
    const row = createElement("div", {
      className: "kanban-stage-editor__row",
      dataset: {
        stageId: stage.id,
      },
    });

    const nameField = createElement("label", {
      className: "kanban-stage-editor__field kanban-stage-editor__field--name",
    });

    nameField.append(
      createElement("span", {
        className: "app-modal__label",
        text: "Nome",
      }),
      createElement("input", {
        className: "input",
        attrs: {
          type: "text",
          value: stage.name,
          "data-stage-field": "name",
        },
      })
    );

    const statusField = createElement("label", {
      className: "kanban-stage-editor__field",
    });

    statusField.append(
      createElement("span", {
        className: "app-modal__label",
        text: "Status-base",
      }),
      renderStatusOptions(stage.status || "todo")
    );

    const colorField = createElement("label", {
      className: "kanban-stage-editor__field",
    });

    colorField.append(
      createElement("span", {
        className: "app-modal__label",
        text: "Cor",
      }),
      renderColorOptions(stage.color || "blue")
    );

    const actions = createElement("div", {
      className: "kanban-stage-editor__actions",
    });

    const leftButton = createElement("button", {
      className: "icon-button",
      text: "←",
      attrs: {
        type: "button",
        title: "Mover para esquerda",
        "data-stage-action": "move-left",
        disabled: index === 0 ? "true" : null,
      },
    });

    const rightButton = createElement("button", {
      className: "icon-button",
      text: "→",
      attrs: {
        type: "button",
        title: "Mover para direita",
        "data-stage-action": "move-right",
        disabled: index === state.kanbanStages.length - 1 ? "true" : null,
      },
    });

    const deleteButton = createElement("button", {
      className: "icon-button icon-button--danger",
      text: "×",
      attrs: {
        type: "button",
        title: "Excluir etapa",
        "data-stage-action": "delete-stage",
      },
    });

    actions.append(leftButton, rightButton, deleteButton);
    row.append(nameField, statusField, colorField, actions);
    list.append(row);
  });

  const modalActions = createElement("div", {
    className: "app-modal__actions",
  });

  modalActions.append(
    createElement("button", {
      className: "ghost-button",
      text: "+ Nova etapa",
      attrs: {
        type: "button",
        "data-stage-action": "create-stage",
      },
    }),
    createElement("button", {
      className: "primary-button",
      text: "Concluir",
      attrs: {
        type: "button",
        "data-stage-action": "close-editor",
      },
    })
  );

  modal.append(header, list, modalActions);
  overlay.append(modal);
  root.append(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeStageEditor();
    }
  });
}

async function deleteCurrentKanbanFromModal() {
  const state = getState();

  if (!state.activeKanban) {
    return;
  }

  if (state.kanbans.length <= 1) {
    showToast("Você precisa manter pelo menos um Kanban neste mural.", {
      type: "warning",
    });

    return;
  }

  const shouldDelete = await openConfirmDialog({
    title: "Excluir Kanban?",
    description: `O Kanban "${state.activeKanban.name}" será removido deste mural. As tarefas não serão apagadas do mural, mas sairão deste Kanban.`,
    confirmText: "Excluir Kanban",
    cancelText: "Cancelar",
    variant: "danger",
  });

  if (!shouldDelete) {
    return;
  }

  const result = deleteKanban(state.activeKanban.id);

  if (!result.ok) {
    showToast("Não foi possível excluir este Kanban.", {
      type: "error",
    });

    return;
  }

  showToast(`Kanban "${result.deletedKanban.name}" excluído.`, {
    type: "warning",
  });
}

function getStageTaskCount(state, stageId) {
  return state.kanbanItems.filter((item) => item.stageId === stageId).length;
}

function openDeleteStageDialog(stage) {
  return new Promise((resolve) => {
    const state = getState();
    const itemCount = getStageTaskCount(state, stage.id);
    const availableStages = state.kanbanStages.filter((item) => {
      return item.id !== stage.id;
    });

    const root = getModalRoot();

    clearElement(root);
    document.body.classList.add("is-modal-open");

    const overlay = createElement("div", {
      className: "app-modal-overlay",
    });

    const modal = createElement("section", {
      className: "app-modal app-modal--danger",
      attrs: {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Excluir etapa",
      },
    });

    const header = createElement("div", {
      className: "app-modal__header",
    });

    header.append(
      createElement("p", {
        className: "eyebrow",
        text: "Kanban",
      }),
      createElement("h2", {
        text: `Excluir "${stage.name}"?`,
      }),
      createElement("p", {
        className: "app-modal__description",
        text:
          itemCount > 0
            ? `Esta etapa possui ${itemCount} card${itemCount === 1 ? "" : "s"}. Escolha para onde mover antes de excluir.`
            : "Esta etapa está vazia e pode ser excluída com segurança.",
      })
    );

    let targetSelect = null;

    if (itemCount > 0) {
      const field = createElement("label", {
        className: "app-modal__field",
      });

      field.append(
        createElement("span", {
          className: "app-modal__label",
          text: "Mover cards para",
        })
      );

      targetSelect = createElement("select", {
        className: "input app-modal__input",
      });

      availableStages.forEach((availableStage) => {
        const option = document.createElement("option");

        option.value = availableStage.id;
        option.textContent = availableStage.name;

        targetSelect.append(option);
      });

      field.append(targetSelect);
      modal.append(header, field);
    } else {
      modal.append(header);
    }

    const actions = createElement("div", {
      className: "app-modal__actions",
    });

    const cancelButton = createElement("button", {
      className: "ghost-button",
      text: "Cancelar",
      attrs: {
        type: "button",
      },
    });

    const confirmButton = createElement("button", {
      className: "danger-button",
      text: "Excluir etapa",
      attrs: {
        type: "button",
      },
    });

    actions.append(cancelButton, confirmButton);
    modal.append(actions);
    overlay.append(modal);
    root.append(overlay);

    function close(result = null) {
      clearElement(root);
      document.body.classList.remove("is-modal-open");
      resolve(result);
    }

    cancelButton.addEventListener("click", () => {
      close(null);
    });

    confirmButton.addEventListener("click", () => {
      close({
        targetStageId: targetSelect?.value || null,
      });
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        close(null);
      }
    });
  });
}

async function deleteStageFromModal(stageId) {
  const state = getState();

  if (state.kanbanStages.length <= 1) {
    showToast("Você precisa manter pelo menos uma etapa neste Kanban.", {
      type: "warning",
    });

    return;
  }

  const stage = state.kanbanStages.find((item) => item.id === stageId);

  if (!stage) {
    return;
  }

  const result = await openDeleteStageDialog(stage);

  if (!result) {
    return;
  }

  const deleteResult = deleteKanbanStage(stage.id, result.targetStageId);

  if (!deleteResult.ok) {
    showToast("Não foi possível excluir esta etapa.", {
      type: "error",
    });

    return;
  }

  showToast(
    deleteResult.movedItems > 0
      ? `Etapa excluída. ${deleteResult.movedItems} card${deleteResult.movedItems === 1 ? "" : "s"} movido${deleteResult.movedItems === 1 ? "" : "s"}.`
      : "Etapa excluída.",
    {
      type: "warning",
    }
  );

  renderStageEditor();
}

function closeExistingTasksModal() {
  const root = getModalRoot();

  clearElement(root);
  document.body.classList.remove("is-modal-open");
}

function getAvailableTasksForCurrentKanban() {
  const state = getState();

  const kanbanTaskIds = new Set(
    state.kanbanItems.map((item) => item.blockId)
  );

  return state.blocks.filter((block) => {
    return block.type === "task" && !kanbanTaskIds.has(block.id);
  });
}

function renderTaskPickerRow(task) {
  const row = createElement("label", {
    className: "kanban-task-picker__row",
  });

  const checkbox = createElement("input", {
    attrs: {
      type: "checkbox",
      "data-existing-task-checkbox": task.id,
    },
  });

  const content = createElement("span", {
    className: "kanban-task-picker__content",
  });

  const title = createElement("strong", {
    text: task.title,
  });

  const description = createElement("small", {
    text: task.content || "Sem descrição",
  });

  content.append(title, description);

  const meta = createElement("span", {
    className: "kanban-task-picker__meta",
    text: task.priority === "high"
      ? "Alta"
      : task.priority === "low"
        ? "Baixa"
        : "Média",
  });

  row.append(checkbox, content, meta);

  return row;
}

function renderStageSelectForExistingTasks(state) {
  const wrapper = createElement("label", {
    className: "app-modal__field",
  });

  wrapper.append(
    createElement("span", {
      className: "app-modal__label",
      text: "Adicionar na etapa",
    })
  );

  const select = createElement("select", {
    className: "input app-modal__input",
    attrs: {
      "data-existing-task-stage": "",
    },
  });

  state.kanbanStages.forEach((stage) => {
    const option = document.createElement("option");

    option.value = stage.id;
    option.textContent = stage.name;

    select.append(option);
  });

  wrapper.append(select);

  return wrapper;
}

function openExistingTasksModal() {
  const state = getState();
  const tasks = getAvailableTasksForCurrentKanban();
  const root = getModalRoot();

  clearElement(root);
  document.body.classList.add("is-modal-open");

  const overlay = createElement("div", {
    className: "app-modal-overlay",
  });

  const modal = createElement("section", {
    className: "app-modal kanban-task-picker-modal",
    attrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Adicionar tarefas existentes",
    },
  });

  const header = createElement("div", {
    className: "app-modal__header",
  });

  header.append(
    createElement("p", {
      className: "eyebrow",
      text: "Kanban",
    }),
    createElement("h2", {
      text: "Adicionar tarefas existentes",
    }),
    createElement("p", {
      className: "app-modal__description",
      text: "Escolha tarefas que já existem neste mural para aparecerem no Kanban atual.",
    })
  );

  modal.append(header);

  if (tasks.length === 0) {
    const empty = createElement("div", {
      className: "kanban-task-picker__empty",
    });

    empty.append(
      createElement("strong", {
        text: "Nenhuma tarefa disponível",
      }),
      createElement("p", {
        text: "Todas as tarefas deste mural já estão neste Kanban, ou ainda não existem tarefas no mural.",
      })
    );

    const actions = createElement("div", {
      className: "app-modal__actions",
    });

    actions.append(
      createElement("button", {
        className: "primary-button",
        text: "Entendi",
        attrs: {
          type: "button",
          "data-existing-task-action": "close",
        },
      })
    );

    modal.append(empty, actions);
    overlay.append(modal);
    root.append(overlay);

    return;
  }

  const stageSelect = renderStageSelectForExistingTasks(state);

  const list = createElement("div", {
    className: "kanban-task-picker__list",
  });

  tasks.forEach((task) => {
    list.append(renderTaskPickerRow(task));
  });

  const actions = createElement("div", {
    className: "app-modal__actions",
  });

  actions.append(
    createElement("button", {
      className: "ghost-button",
      text: "Cancelar",
      attrs: {
        type: "button",
        "data-existing-task-action": "close",
      },
    }),
    createElement("button", {
      className: "primary-button",
      text: "Adicionar selecionadas",
      attrs: {
        type: "button",
        "data-existing-task-action": "add",
      },
    })
  );

  modal.append(stageSelect, list, actions);
  overlay.append(modal);
  root.append(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeExistingTasksModal();
    }
  });
}

function addSelectedExistingTasks() {
  const selectedCheckboxes = [
    ...document.querySelectorAll("[data-existing-task-checkbox]:checked"),
  ];

  if (selectedCheckboxes.length === 0) {
    showToast("Selecione pelo menos uma tarefa.", {
      type: "warning",
    });

    return;
  }

  const stageSelect = qs("[data-existing-task-stage]");
  const stageId = stageSelect?.value || null;

  let addedCount = 0;

  selectedCheckboxes.forEach((checkbox) => {
    const result = addTaskToActiveKanban(
      checkbox.dataset.existingTaskCheckbox,
      stageId
    );

    if (result.ok) {
      addedCount += 1;
    }
  });

  closeExistingTasksModal();

  showToast(
    addedCount === 1
      ? "Tarefa adicionada ao Kanban."
      : `${addedCount} tarefas adicionadas ao Kanban.`,
    {
      type: "success",
    }
  );
}

async function removeTaskFromKanbanFromModal(kanbanItemId) {
  const state = getState();

  const item = state.kanbanItems.find((kanbanItem) => {
    return kanbanItem.id === kanbanItemId;
  });

  if (!item) {
    return;
  }

  const task = state.blocks.find((block) => block.id === item.blockId);

  const shouldRemove = await openConfirmDialog({
    title: "Remover do Kanban?",
    description: task
      ? `A tarefa "${task.title}" será removida apenas deste Kanban. Ela continuará existindo no mural livre.`
      : "Este card será removido apenas deste Kanban. A tarefa original continuará no mural.",
    confirmText: "Remover do Kanban",
    cancelText: "Cancelar",
    variant: "danger",
  });

  if (!shouldRemove) {
    return;
  }

  const result = removeTaskFromActiveKanban(kanbanItemId);

  if (!result.ok) {
    showToast("Não foi possível remover este card do Kanban.", {
      type: "error",
    });

    return;
  }

  showToast("Card removido deste Kanban.", {
    type: "warning",
  });
}

function openTaskInFreeBoard(blockId) {
  const state = getState();

  const task = state.blocks.find((block) => block.id === blockId);

  if (!task) {
    showToast("Não foi possível localizar esta tarefa no mural.", {
      type: "error",
    });

    return;
  }

  setActiveMode("free");
  selectBlock(blockId);

  window.requestAnimationFrame(() => {
    focusBlockInViewport(blockId);
  });

  showToast(`"${task.title}" aberto no mural livre.`, {
    type: "info",
    duration: 2200,
  });
}

export function setupKanbanControls() {
  document.addEventListener("click", async (event) => {
    const pickerButton = event.target.closest("[data-kanban-picker-button]");
    

    if (pickerButton) {
      toggleKanbanPicker();
      return;
    }

    const kanbanOption = event.target.closest("[data-kanban-option]");

    if (kanbanOption) {
      setActiveKanban(kanbanOption.dataset.kanbanOption);
      closeKanbanPicker();
      return;
    }

    const createKanbanButton = event.target.closest(
      "[data-kanban-action='create-kanban']"
    );

    if (createKanbanButton) {
      createKanbanFromModal();
      return;
    }

    const renameKanbanButton = event.target.closest(
      "[data-kanban-action='rename-kanban']"
    );

    if (renameKanbanButton) {
      renameCurrentKanbanFromModal();
      return;
    }

    const openTaskInBoardButton = event.target.closest(
      "[data-kanban-action='open-task-in-board']"
    );

    if (openTaskInBoardButton) {
      openTaskInFreeBoard(openTaskInBoardButton.dataset.blockId);
      return;
    }

    const deleteKanbanButton = event.target.closest(
      "[data-kanban-action='delete-kanban']"
    );

    if (deleteKanbanButton) {
      deleteCurrentKanbanFromModal();
      return;
    }

    const editStagesButton = event.target.closest(
      "[data-kanban-action='edit-stages']"
    );

    if (editStagesButton) {
      renderStageEditor();
      return;
    }

    const clearViewFiltersButton = event.target.closest(
      "[data-kanban-action='clear-view-filters']"
    );

    if (clearViewFiltersButton) {
      resetActiveKanbanViewOptions();
      return;
    }

    const toggleStageButton = event.target.closest(
      "[data-kanban-action='toggle-stage-expanded']"
    );

    if (toggleStageButton) {
      const stageId = toggleStageButton.dataset.kanbanStageId;

      toggleActiveKanbanStageExpanded(stageId);
      return;
    }

    const removeTaskButton = event.target.closest(
      "[data-kanban-action='remove-task-from-kanban']"
    );

    if (removeTaskButton) {
      removeTaskFromKanbanFromModal(removeTaskButton.dataset.kanbanItemId);
      return;
    }

    const addExistingTasksButton = event.target.closest(
      "[data-kanban-action='add-existing-tasks']"
    );

    if (addExistingTasksButton) {
      openExistingTasksModal();
      return;
    }

    const existingTaskAction = event.target.closest("[data-existing-task-action]");

    if (existingTaskAction) {
      const action = existingTaskAction.dataset.existingTaskAction;

      if (action === "close") {
        closeExistingTasksModal();
        return;
      }

      if (action === "add") {
        addSelectedExistingTasks();
        return;
      }
    }

    const createTaskButton = event.target.closest(
      "[data-kanban-action='create-task']"
    );

    if (createTaskButton) {
      const stageId = createTaskButton.dataset.kanbanStageId;
      const task = stageId
        ? createTaskInKanbanStage(stageId)
        : createBlock("task");

      if (!task) {
        return;
      }

      showToast("Tarefa criada no Kanban.", {
        type: "success",
      });

      return;
    }

    const stageActionButton = event.target.closest("[data-stage-action]");

    if (stageActionButton) {
      const action = stageActionButton.dataset.stageAction;
      const row = stageActionButton.closest("[data-stage-id]");
      const stageId = row?.dataset.stageId;

      if (action === "close-editor") {
        closeStageEditor();
        return;
      }

      if (action === "create-stage") {
        const stage = createKanbanStage("Nova etapa");

        if (stage) {
          showToast("Nova etapa criada.", {
            type: "success",
          });
        }

        renderStageEditor();
        return;
      }

      if (!stageId) {
        return;
      }

      if (action === "move-left") {
        moveKanbanStage(stageId, "left");
        renderStageEditor();
        return;
      }

      if (action === "move-right") {
        moveKanbanStage(stageId, "right");
        renderStageEditor();
        return;
      }

      if (action === "delete-stage") {
        deleteStageFromModal(stageId);
        return;
      }

      return;
    }

    const clickedInsidePicker = event.target.closest("[data-kanban-picker]");

    if (!clickedInsidePicker) {
      closeKanbanPicker();
    }
  });

  document.addEventListener("change", (event) => {
    const kanbanFilter = event.target.closest("[data-kanban-filter]");

    if (kanbanFilter) {
      const fieldName = kanbanFilter.dataset.kanbanFilter;

      if (fieldName) {
        setActiveKanbanViewOption(fieldName, kanbanFilter.value);
      }

      return;
    }

    const field = event.target.closest("[data-stage-field]");

    if (!field) {
      return;
    }

    const row = field.closest("[data-stage-id]");

    if (!row) {
      return;
    }

    updateKanbanStage(row.dataset.stageId, {
      [field.dataset.stageField]: field.value,
    });

    renderStageEditor();
  });

  document.addEventListener("keydown", (event) => {
    if (isKanbanPickerOpen && event.key === "Escape") {
      event.preventDefault();
      closeKanbanPicker();
      return;
    }

    const stageNameInput = event.target.closest("[data-stage-field='name']");

    if (stageNameInput && event.key === "Enter") {
      event.preventDefault();
      stageNameInput.blur();
      return;
    }

    const modalIsOpen = qs(".kanban-stage-modal");

    if (modalIsOpen && event.key === "Escape") {
      event.preventDefault();
      closeStageEditor();
    }
  });

  window.addEventListener("resize", () => {
    closeKanbanPicker();
  });
}
