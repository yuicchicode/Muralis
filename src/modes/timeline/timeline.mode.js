import {
  createBlock,
  getState,
  selectBlock,
  setActiveMode,
  updateBlock,
} from "../../app/state.js";

import { focusBlockInViewport } from "../../features/board/board.viewport.js";
import { showToast } from "../../ui/toast.js";
import { clearElement, createElement, qs } from "../../utils/dom.js";

const TYPE_LABELS = {
  idea: "Ideia",
  task: "Tarefa",
  reference: "Referência",
  goal: "Meta",
  quote: "Citação",
  link: "Link",
};

const TYPE_ICONS = {
  idea: "💡",
  task: "✓",
  reference: "📎",
  goal: "🎯",
  quote: "❝",
  link: "🔗",
};

const timelineViewOptions = {
  period: "all",
  type: "all",
  completion: "all",
  sort: "asc",
};

const PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const STATUS_LABELS = {
  ideas: "Ideias",
  todo: "A fazer",
  doing: "Fazendo",
  done: "Concluída",
};

function ensureTimelineToolbarSlot() {
  let slot = qs("[data-timeline-toolbar-slot]");
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
    className: "timeline-mode-toolbar-slot",
    attrs: {
      "data-timeline-toolbar-slot": "",
      id: "modeControlsPanel",
    },
  });

  boardViewport.append(slot);

  return slot;
}

export function clearTimelineModeToolbar() {
  const slot = qs("[data-timeline-toolbar-slot]");

  if (!slot) {
    return;
  }

  clearElement(slot);
  slot.hidden = true;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getInputDateValue(value) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  return getDateKey(date);
}

function getTodayInputValue() {
  return getDateKey(new Date());
}

function normalizePromptDate(value) {
  const safeValue = String(value || "").trim();

  if (!safeValue) {
    return "";
  }

  const parsedDate = parseDate(safeValue);

  if (!parsedDate) {
    return "";
  }

  return getDateKey(parsedDate);
}

function createTimelineQuickField(label, input) {
  const wrapper = createElement("label", {
    className: "timeline-card__quick-field",
  });

  wrapper.append(
    createElement("span", {
      text: label,
    }),
    input
  );

  return wrapper;
}

function isToday(date) {
  const today = new Date();

  return getDateKey(date) === getDateKey(today);
}

function isPastDate(date) {
  const today = new Date();
  const todayKey = getDateKey(today);

  return getDateKey(date) < todayKey;
}

function addDays(date, days) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function isWithinNextDays(date, days) {
  const today = new Date();
  const todayKey = getDateKey(today);
  const limitKey = getDateKey(addDays(today, days));
  const dateKey = getDateKey(date);

  return dateKey >= todayKey && dateKey <= limitKey;
}

function matchesTimelinePeriodFilter(entry) {
  if (timelineViewOptions.period === "all") {
    return true;
  }

  if (timelineViewOptions.period === "overdue") {
    return (
      entry.kind === "due" &&
      entry.block.status !== "done" &&
      isPastDate(entry.date)
    );
  }

  if (timelineViewOptions.period === "today") {
    return (
      entry.kind === "due" &&
      entry.block.status !== "done" &&
      isToday(entry.date)
    );
  }

  if (timelineViewOptions.period === "next-7") {
    return (
      entry.kind === "due" &&
      entry.block.status !== "done" &&
      isWithinNextDays(entry.date, 7)
    );
  }

  if (timelineViewOptions.period === "no-due") {
    return entry.kind === "created";
  }

  return true;
}

function matchesTimelineTypeFilter(entry) {
  if (timelineViewOptions.type === "all") {
    return true;
  }

  return entry.block.type === timelineViewOptions.type;
}

function matchesTimelineCompletionFilter(entry) {
  if (timelineViewOptions.completion === "all") {
    return true;
  }

  const isDone = entry.block.status === "done";

  if (timelineViewOptions.completion === "done") {
    return isDone;
  }

  if (timelineViewOptions.completion === "open") {
    return !isDone;
  }

  return true;
}

function hasActiveTimelineFilters() {
  return (
    timelineViewOptions.period !== "all" ||
    timelineViewOptions.type !== "all" ||
    timelineViewOptions.completion !== "all" ||
    timelineViewOptions.sort !== "asc"
  );
}

function resetTimelineViewOptions() {
  timelineViewOptions.period = "all";
  timelineViewOptions.type = "all";
  timelineViewOptions.completion = "all";
  timelineViewOptions.sort = "asc";
}

function getTimelineEntryForBlock(block) {
  const dueDate = parseDate(block.dueDate);

  if (dueDate) {
    return {
      id: `${block.id}:due`,
      block,
      date: dueDate,
      dateKey: getDateKey(dueDate),
      kind: "due",
      label: "Prazo",
    };
  }

  const createdAt = parseDate(block.createdAt);

  if (createdAt) {
    return {
      id: `${block.id}:created`,
      block,
      date: createdAt,
      dateKey: getDateKey(createdAt),
      kind: "created",
      label: "Criado",
    };
  }

  return null;
}

function sortTimelineEntries(entries) {
  return [...entries].sort((a, b) => {
    const difference = a.date.getTime() - b.date.getTime();

    return timelineViewOptions.sort === "desc"
      ? difference * -1
      : difference;
  });
}

function getAllTimelineEntries(state) {
  const entries = state.blocks
    .map(getTimelineEntryForBlock)
    .filter(Boolean);

  return sortTimelineEntries(entries);
}

function getTimelineEntries(state) {
  const entries = getAllTimelineEntries(state).filter((entry) => {
    return (
      matchesTimelinePeriodFilter(entry) &&
      matchesTimelineTypeFilter(entry) &&
      matchesTimelineCompletionFilter(entry)
    );
  });

  return sortTimelineEntries(entries);
}


function groupTimelineEntries(entries) {
  const groupsByDate = new Map();

  entries.forEach((entry) => {
    if (!groupsByDate.has(entry.dateKey)) {
      groupsByDate.set(entry.dateKey, {
        date: entry.date,
        dateKey: entry.dateKey,
        entries: [],
      });
    }

    groupsByDate.get(entry.dateKey).entries.push(entry);
  });

  return [...groupsByDate.values()].sort((a, b) => {
    const difference = a.date.getTime() - b.date.getTime();

    return timelineViewOptions.sort === "desc"
      ? difference * -1
      : difference;
  });
}

function getTimelineSummary(entries) {
  const dueEntries = entries.filter((entry) => entry.kind === "due");

  const overdueEntries = dueEntries.filter((entry) => {
    return entry.block.status !== "done" && isPastDate(entry.date);
  });

  const todayEntries = dueEntries.filter((entry) => {
    return entry.block.status !== "done" && isToday(entry.date);
  });

  return {
    total: entries.length,
    due: dueEntries.length,
    overdue: overdueEntries.length,
    today: todayEntries.length,
  };
}

function createTimelineFilterSelect(label, field, value, options) {
  const wrapper = createElement("label", {
    className: "timeline-filter",
  });

  const labelElement = createElement("span", {
    className: "timeline-filter__label",
    text: label,
  });

  const select = createElement("select", {
    className: "timeline-filter__select",
    attrs: {
      "data-timeline-filter": field,
    },
  });

  Object.entries(options).forEach(([optionValue, optionLabel]) => {
    const option = document.createElement("option");

    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = value === optionValue;

    select.append(option);
  });

  wrapper.append(labelElement, select);

  return wrapper;
}

function renderTimelineFilters(entries, allEntries) {
  const filters = createElement("div", {
    className: "mode-toolbar__filters timeline-toolbar__filters",
  });

  filters.append(
    createTimelineFilterSelect(
      "Período",
      "period",
      timelineViewOptions.period,
      {
        all: "Todos",
        overdue: "Atrasados",
        today: "Hoje",
        "next-7": "Próximos 7 dias",
        "no-due": "Sem prazo",
      }
    ),
    createTimelineFilterSelect(
      "Tipo",
      "type",
      timelineViewOptions.type,
      {
        all: "Todos",
        task: "Tarefas",
        goal: "Metas",
        idea: "Ideias",
        reference: "Referências",
        quote: "Citações",
        link: "Links",
      }
    ),
    createTimelineFilterSelect(
      "Status",
      "completion",
      timelineViewOptions.completion,
      {
        all: "Todos",
        open: "Abertos",
        done: "Concluídos",
      }
    ),
    createTimelineFilterSelect(
      "Ordem",
      "sort",
      timelineViewOptions.sort,
      {
        asc: "Mais antigos primeiro",
        desc: "Mais recentes primeiro",
      }
    )
  );

  if (hasActiveTimelineFilters()) {
    filters.append(
      createElement("button", {
        className: "ghost-button timeline-toolbar__clear",
        text: "Limpar filtros",
        attrs: {
          type: "button",
          "data-timeline-action": "clear-filters",
        },
      })
    );
  }

  filters.append(
    createElement("span", {
      className: "timeline-toolbar__visible-count",
      text: `${entries.length} de ${allEntries.length} visível${
        entries.length === 1 ? "" : "is"
      }`,
    })
  );

  return filters;
}

function renderTimelineToolbar(state, entries, allEntries) {
  const slot = ensureTimelineToolbarSlot();

  if (!slot) {
    return;
  }

  clearElement(slot);
  slot.hidden = false;

  const summary = getTimelineSummary(entries);
  const allSummary = getTimelineSummary(allEntries);

  const toolbar = createElement("div", {
    className: "mode-toolbar timeline-mode-toolbar",
  });

  const heading = createElement("div", {
    className: "mode-toolbar__heading timeline-toolbar__heading",
  });

  heading.append(
    createElement("p", {
      className: "eyebrow",
      text: "Modo Linha do Tempo",
    }),
    createElement("h2", {
      text: "Linha do Tempo",
    }),
    createElement("p", {
      className: "timeline-toolbar__description",
      text: "Veja prazos, criações e marcos do mural em ordem temporal.",
    })
  );

  const stats = createElement("div", {
    className: "mode-toolbar__meta timeline-toolbar__stats",
  });

  const actions = createElement("div", {
    className: "mode-toolbar__actions timeline-toolbar__actions",
  });
  
  actions.append(
    createElement("button", {
      className: "ghost-button",
      text: "+ Tarefa com prazo",
      attrs: {
        type: "button",
        "data-timeline-action": "create-task",
      },
    }),
    createElement("button", {
      className: "primary-button",
      text: "+ Marco",
      attrs: {
        type: "button",
        "data-timeline-action": "create-milestone",
      },
    })
  );
  
  stats.append(
    createElement("span", {
      className: "timeline-toolbar__stat",
      text: `${summary.total}/${allSummary.total} eventos`,
    }),
    createElement("span", {
      className: "timeline-toolbar__stat",
      text: `${summary.due}/${allSummary.due} prazos`,
    }),
    createElement("span", {
      className: `timeline-toolbar__stat${
        summary.overdue > 0 ? " timeline-toolbar__stat--danger" : ""
      }`,
      text: `${summary.overdue} atrasado${summary.overdue === 1 ? "" : "s"}`,
    }),
    createElement("span", {
      className: "timeline-toolbar__stat timeline-toolbar__stat--today",
      text: `${summary.today} hoje`,
    })
  );

  const main = createElement("div", {
    className: "mode-toolbar__main",
  });

  main.append(heading, actions);
  toolbar.append(main, stats, renderTimelineFilters(entries, allEntries));
  slot.append(toolbar);
}

function renderTimelineEmptyState(options = {}) {
  const { isFiltered = false } = options;

  const empty = createElement("section", {
    className: "timeline-empty",
  });

  empty.append(
    createElement("div", {
      className: "timeline-empty__icon",
      text: isFiltered ? "🔎" : "🗓️",
    }),
    createElement("h2", {
      text: isFiltered
        ? "Nenhum evento encontrado"
        : "Nada para mostrar ainda",
    }),
    createElement("p", {
      text: isFiltered
        ? "Os filtros atuais esconderam todos os eventos da Linha do Tempo."
        : "Crie blocos no mural ou adicione prazos às tarefas para alimentar a Linha do Tempo.",
    }),
    createElement("button", {
      className: isFiltered ? "ghost-button" : "primary-button",
      text: isFiltered ? "Limpar filtros" : "Voltar ao mural",
      attrs: {
        type: "button",
        "data-timeline-action": isFiltered ? "clear-filters" : "go-free",
      },
    })
  );

  return empty;
}

function renderEntryMeta(entry) {
  const { block } = entry;

  const meta = createElement("div", {
    className: "timeline-card__meta",
  });

  meta.append(
    createElement("span", {
      className: "timeline-card__chip",
      text: `${TYPE_ICONS[block.type] || "•"} ${TYPE_LABELS[block.type] || "Bloco"}`,
    }),
    createElement("span", {
      className: `timeline-card__chip timeline-card__chip--${entry.kind}`,
      text: entry.label,
    })
  );

  if (block.type === "task") {
    meta.append(
      createElement("span", {
        className: "timeline-card__chip",
        text: STATUS_LABELS[block.status] || "A fazer",
      }),
      createElement("span", {
        className: `timeline-card__chip timeline-card__chip--priority-${block.priority || "medium"}`,
        text: PRIORITY_LABELS[block.priority] || "Média",
      })
    );
  }

  return meta;
}

function renderTimelineQuickEdit(entry) {
  const { block } = entry;

  const quickEdit = createElement("div", {
    className: "timeline-card__quick-edit",
  });

  const dueDateInput = createElement("input", {
    className: "timeline-card__quick-input",
    attrs: {
      type: "date",
      value: getInputDateValue(block.dueDate),
      "data-timeline-edit": "dueDate",
      "data-block-id": block.id,
    },
  });

  quickEdit.append(
    createTimelineQuickField("Prazo", dueDateInput)
  );

  if (block.type === "task") {
    const statusSelect = createElement("select", {
      className: "timeline-card__quick-input",
      attrs: {
        "data-timeline-edit": "status",
        "data-block-id": block.id,
      },
    });

    Object.entries({
      ideas: "Ideias",
      todo: "A fazer",
      doing: "Fazendo",
      done: "Concluída",
    }).forEach(([value, label]) => {
      const option = document.createElement("option");

      option.value = value;
      option.textContent = label;
      option.selected = (block.status || "todo") === value;

      statusSelect.append(option);
    });

    const prioritySelect = createElement("select", {
      className: "timeline-card__quick-input",
      attrs: {
        "data-timeline-edit": "priority",
        "data-block-id": block.id,
      },
    });

    Object.entries({
      low: "Baixa",
      medium: "Média",
      high: "Alta",
    }).forEach(([value, label]) => {
      const option = document.createElement("option");

      option.value = value;
      option.textContent = label;
      option.selected = (block.priority || "medium") === value;

      prioritySelect.append(option);
    });

    quickEdit.append(
      createTimelineQuickField("Status", statusSelect),
      createTimelineQuickField("Prioridade", prioritySelect)
    );
  }

  return quickEdit;
}

function renderTimelineCard(entry) {
  const { block } = entry;

  const isOverdue =
    entry.kind === "due" &&
    block.status !== "done" &&
    isPastDate(entry.date);

  const isDueToday =
    entry.kind === "due" &&
    block.status !== "done" &&
    isToday(entry.date);

  const card = createElement("article", {
    className: [
      "timeline-card",
      entry.kind === "due" ? "timeline-card--due" : "",
      entry.kind === "created" ? "timeline-card--created" : "",
      block.type === "goal" ? "timeline-card--milestone" : "",
      isOverdue ? "timeline-card--overdue" : "",
      isDueToday ? "timeline-card--today" : "",
      block.status === "done" ? "timeline-card--done" : "",
    ]
      .filter(Boolean)
      .join(" "),
    attrs: {
      "data-block-id": block.id,
      "data-block-type": block.type,
      tabindex: "0",
      role: "button",
      "aria-label": `Evento: ${block.title || "Sem tÃ­tulo"}`,
    },
  });

  const header = createElement("div", {
    className: "timeline-card__header",
  });

  header.append(
    createElement("strong", {
      className: "timeline-card__date",
      text: formatShortDate(entry.date),
    }),
    renderEntryMeta(entry)
  );

  const title = createElement("h3", {
    className: "timeline-card__title",
    text: block.title || "Sem título",
  });

  const content = block.content
    ? createElement("p", {
        className: "timeline-card__content",
        text: block.content,
      })
    : null;

  const footer = createElement("div", {
    className: "timeline-card__footer",
  });

  const tags = Array.isArray(block.tags) ? block.tags.slice(0, 4) : [];

  tags.forEach((tag) => {
    footer.append(
      createElement("span", {
        className: "timeline-card__tag",
        text: `#${tag}`,
      })
    );
  });

  const actions = createElement("div", {
    className: "timeline-card__actions",
  });

  actions.append(
    createElement("button", {
      className: "ghost-button",
      text: "Ver no mural",
      attrs: {
        type: "button",
        "data-timeline-action": "open-block",
        "data-block-id": block.id,
      },
    })
  );

  card.append(header, title);
  
  if (content) {
  card.append(content);
  }
  
  card.append(renderTimelineQuickEdit(entry));
  
  if (tags.length > 0) {
  card.append(footer);
  }
  
  card.append(actions);

  card.addEventListener("click", (event) => {
    const isInteractive = event.target.closest("button, input, select, a");

    if (isInteractive) {
      return;
    }

    selectBlock(block.id);
  });

  return card;
}

function renderTimelineGroup(group) {
  const section = createElement("section", {
    className: "timeline-group",
  });

  const marker = createElement("div", {
    className: "timeline-group__marker",
  });

  const heading = createElement("header", {
    className: "timeline-group__header",
  });

  const statusText = isToday(group.date)
    ? "Hoje"
    : isPastDate(group.date)
      ? "Passado"
      : "Próximo";

  heading.append(
    createElement("div", {
      className: "timeline-group__dot",
    }),
    createElement("div", {
      className: "timeline-group__title",
      children: [
        createElement("h3", {
          text: formatDate(group.date),
        }),
        createElement("span", {
          text: `${statusText} · ${group.entries.length} evento${
            group.entries.length === 1 ? "" : "s"
          }`,
        }),
      ],
    })
  );

  const list = createElement("div", {
    className: "timeline-group__list",
  });

  group.entries.forEach((entry) => {
    list.append(renderTimelineCard(entry));
  });

  section.append(marker, heading, list);

  return section;
}

function renderTimelineContent(entries, allEntries) {
  const wrapper = createElement("div", {
    className: "timeline-mode",
  });

  if (entries.length === 0) {
    wrapper.append(
      renderTimelineEmptyState({
        isFiltered: allEntries.length > 0 && hasActiveTimelineFilters(),
      })
    );
  
    return wrapper;
  }

  const groups = groupTimelineEntries(entries);

  const rail = createElement("div", {
    className: "timeline-rail",
  });

  groups.forEach((group) => {
    rail.append(renderTimelineGroup(group));
  });

  wrapper.append(rail);

  return wrapper;
}

function rerenderTimelineMode() {
  const boardCanvas = qs("#boardCanvas");
  const state = getState();

  if (!boardCanvas || state.board.activeMode !== "timeline") {
    return;
  }

  clearElement(boardCanvas);
  renderTimelineMode(boardCanvas, state);
}

function createTimelineBlock(type = "task") {
  const isTask = type === "task";

  const title = window.prompt(
    isTask ? "Título da tarefa:" : "Título do marco:",
    isTask ? "Nova tarefa" : "Novo marco"
  );

  if (title === null) {
    return;
  }

  const safeTitle = title.trim();

  if (!safeTitle) {
    showToast("Digite um título válido.", {
      type: "warning",
    });

    return;
  }

  const dateInput = window.prompt(
    isTask ? "Prazo da tarefa (AAAA-MM-DD):" : "Data do marco (AAAA-MM-DD):",
    getTodayInputValue()
  );

  if (dateInput === null) {
    return;
  }

  const dueDate = normalizePromptDate(dateInput);

  if (!dueDate) {
    showToast("Digite uma data válida no formato AAAA-MM-DD.", {
      type: "warning",
    });

    return;
  }

  const content = window.prompt(
    isTask ? "Descrição da tarefa (opcional):" : "Descrição do marco (opcional):",
    ""
  );

  if (content === null) {
    return;
  }

  const block = createBlock(isTask ? "task" : "goal", {
    title: safeTitle,
    content: content.trim(),
    dueDate,
    status: isTask ? "todo" : undefined,
    priority: isTask ? "medium" : undefined,
  });

  if (!block) {
    showToast("Não foi possível criar o item na Linha do Tempo.", {
      type: "error",
    });

    return;
  }

  selectBlock(block.id);

  showToast(isTask ? "Tarefa criada na Timeline." : "Marco criado na Timeline.", {
    type: "success",
  });
}

function updateTimelineCardField(blockId, field, value) {
  const state = getState();

  const block = state.blocks.find((item) => item.id === blockId);

  if (!block) {
    showToast("Este bloco não existe mais.", {
      type: "error",
    });

    return;
  }

  const updates = {};

  if (field === "dueDate") {
    updates.dueDate = value || "";
  }

  if (field === "status" && block.type === "task") {
    updates.status = value || "todo";
  }

  if (field === "priority" && block.type === "task") {
    updates.priority = value || "medium";
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  updateBlock(block.id, updates);

  showToast("Timeline atualizada.", {
    type: "success",
  });
}

function openBlockInFreeBoard(blockId) {
  const state = getState();

  const blockExists = state.blocks.some((block) => {
    return block.id === blockId;
  });

  if (!blockExists) {
    showToast("Este bloco não existe mais no mural.", {
      type: "error",
    });

    return;
  }

  setActiveMode("free");
  selectBlock(blockId);

  window.requestAnimationFrame(() => {
    focusBlockInViewport(blockId);
  });

  showToast("Bloco aberto no mural.", {
    type: "success",
  });
}

export function renderTimelineMode(boardCanvas, state) {
  const allEntries = getAllTimelineEntries(state);
  const entries = getTimelineEntries(state);

  renderTimelineToolbar(state, entries, allEntries);

  boardCanvas.append(renderTimelineContent(entries, allEntries));
}

export function setupTimelineControls() {
  document.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-timeline-action]");

    if (!actionElement) {
      return;
    }

    const action = actionElement.dataset.timelineAction;

    if (action === "create-task") {
      createTimelineBlock("task");
      return;
    }
  
    if (action === "create-milestone") {
      createTimelineBlock("goal");
      return;
    }

    if (action === "open-block") {
      openBlockInFreeBoard(actionElement.dataset.blockId);
      return;
    }

    if (action === "go-free") {
      setActiveMode("free");
    }

    if (action === "clear-filters") {
      resetTimelineViewOptions();
      rerenderTimelineMode();
      return;
    }
  });

  document.addEventListener("change", (event) => {
    const input = event.target.closest("[data-timeline-edit]");
  
    if (!input) {
      return;
    }
  
    updateTimelineCardField(
      input.dataset.blockId,
      input.dataset.timelineEdit,
      input.value
    );
  });

  document.addEventListener("change", (event) => {
    const select = event.target.closest("[data-timeline-filter]");
  
    if (!select) {
      return;
    }
  
    const field = select.dataset.timelineFilter;
  
    if (!Object.prototype.hasOwnProperty.call(timelineViewOptions, field)) {
      return;
    }
  
    timelineViewOptions[field] = select.value;
  
    rerenderTimelineMode();
  });
}
