import {
  clearSelection,
  getState,
  removeBlock,
  subscribe,
  updateBlock,
} from "../app/state.js";

import {
  BLOCK_COLORS,
  BLOCK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUS,
  getBlockColorMeta,
  getBlockTypeMeta,
} from "../models/block.model.js";

import { showToast } from "./toast.js";
import { clearElement, createElement, qs } from "../utils/dom.js";

const MATRIX_SCORE_OPTIONS = {
  1: {
    label: "1 · Muito baixo",
    value: "1",
  },

  2: {
    label: "2 · Baixo",
    value: "2",
  },

  3: {
    label: "3 · Médio",
    value: "3",
  },

  4: {
    label: "4 · Alto",
    value: "4",
  },

  5: {
    label: "5 · Muito alto",
    value: "5",
  },
};

const SIZE_LIMITS = {
  width: {
    min: 180,
    max: 720,
  },
  height: {
    min: 110,
    max: 520,
  },
};

function getSelectedBlocks() {
  const state = getState();

  return state.selectedBlockIds
    .map((blockId) => state.blocks.find((block) => block.id === blockId))
    .filter(Boolean);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeTag(tag) {
  return String(tag)
    .trim()
    .replace(/^#/, "")
    .toLowerCase();
}

function parseTags(value) {
  return [
    ...new Set(
      String(value)
        .split(",")
        .map(normalizeTag)
        .filter(Boolean)
    ),
  ].slice(0, 12);
}

function formatTags(tags = []) {
  if (!Array.isArray(tags)) {
    return "";
  }

  return tags.join(", ");
}

function normalizeUrl(value) {
  const rawValue = String(value).trim();

  if (!rawValue) {
    return "";
  }

  const valueWithProtocol = /^https?:\/\//i.test(rawValue)
    ? rawValue
    : `https://${rawValue}`;

  try {
    const url = new URL(valueWithProtocol);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function createInspectorField(label, field, value, options = {}) {
  const {
    type = "text",
    min = null,
    max = null,
    step = null,
    placeholder = null,
  } = options;

  const wrapper = createElement("label", {
    className: "inspector-field",
  });

  const labelElement = createElement("span", {
    className: "inspector-field__label",
    text: label,
  });

  const input = createElement("input", {
    className: "input inspector-field__control",
    attrs: {
      type,
      value: String(value ?? ""),
      "data-inspector-field": field,
    },
  });

  if (min !== null) {
    input.setAttribute("min", String(min));
  }

  if (max !== null) {
    input.setAttribute("max", String(max));
  }

  if (step !== null) {
    input.setAttribute("step", String(step));
  }

  if (placeholder !== null) {
    input.setAttribute("placeholder", placeholder);
  }

  wrapper.append(labelElement, input);

  return wrapper;
}

function createInspectorSelect(label, field, value, optionsMap) {
  const wrapper = createElement("label", {
    className: "inspector-field",
  });

  const labelElement = createElement("span", {
    className: "inspector-field__label",
    text: label,
  });

  const select = createElement("select", {
    className: "input inspector-field__control",
    attrs: {
      "data-inspector-field": field,
    },
  });

  Object.entries(optionsMap).forEach(([key, optionData]) => {
    const option = document.createElement("option");

    option.value = key;
    option.textContent = optionData.label;
    option.selected = String(value) === String(key);

    select.append(option);
  });

  wrapper.append(labelElement, select);

  return wrapper;
}

function createInspectorTextarea(label, field, value) {
  const wrapper = createElement("label", {
    className: "inspector-field",
  });

  const labelElement = createElement("span", {
    className: "inspector-field__label",
    text: label,
  });

  const textarea = createElement("textarea", {
    className: "input inspector-textarea",
    attrs: {
      rows: "5",
      "data-inspector-field": field,
    },
  });

  textarea.value = value ?? "";

  wrapper.append(labelElement, textarea);

  return wrapper;
}

function createTypeSelect(block) {
  const wrapper = createElement("label", {
    className: "inspector-field",
  });

  const labelElement = createElement("span", {
    className: "inspector-field__label",
    text: "Tipo",
  });

  const select = createElement("select", {
    className: "input inspector-field__control",
    attrs: {
      "data-inspector-field": "type",
    },
  });

  Object.entries(BLOCK_TYPES).forEach(([type, meta]) => {
    const option = document.createElement("option");

    option.value = type;
    option.textContent = `${meta.icon} ${meta.label}`;
    option.selected = block.type === type;

    select.append(option);
  });

  wrapper.append(labelElement, select);

  return wrapper;
}

function createColorPalette(block) {
  const currentColor = getBlockColorMeta(block.color).value;

  const wrapper = createElement("div", {
    className: "inspector-field",
  });

  const labelElement = createElement("span", {
    className: "inspector-field__label",
    text: "Cor",
  });

  const palette = createElement("div", {
    className: "color-palette",
    attrs: {
      role: "list",
      "aria-label": "Escolher cor do bloco",
    },
  });

  Object.entries(BLOCK_COLORS).forEach(([color, meta]) => {
    const button = createElement("button", {
      className: `color-swatch${color === currentColor ? " is-active" : ""}`,
      attrs: {
        type: "button",
        title: meta.label,
        "aria-label": `Cor ${meta.label}`,
        "data-color-option": color,
      },
      dataset: {
        color,
      },
    });

    palette.append(button);
  });

  wrapper.append(labelElement, palette);

  return wrapper;
}

function createTaskFields(block) {
  const wrapper = createElement("div", {
    className: "inspector-task-fields",
  });

  const title = createElement("div", {
    className: "inspector-subtitle",
    text: "Tarefa",
  });

  const statusField = createInspectorSelect(
    "Status",
    "status",
    block.status || "todo",
    TASK_STATUS
  );

  const priorityField = createInspectorSelect(
    "Prioridade",
    "priority",
    block.priority || "medium",
    TASK_PRIORITIES
  );

  const dueDateField = createInspectorField(
    "Prazo",
    "dueDate",
    block.dueDate || "",
    {
      type: "date",
    }
  );

  wrapper.append(
    title,
    statusField,
    priorityField,
    dueDateField
  );

  return wrapper;
}

function createMatrixFields(block) {
  const wrapper = createElement("div", {
    className: "inspector-matrix-fields",
  });

  const title = createElement("div", {
    className: "inspector-subtitle",
    text: "Matriz esforço/impacto",
  });

  const description = createElement("p", {
    className: "inspector-helper-text",
    text: "Esses valores definem em qual quadrante o bloco aparece na Matriz.",
  });

  const impactField = createInspectorSelect(
    "Impacto",
    "impact",
    block.impact ?? 3,
    MATRIX_SCORE_OPTIONS
  );

  const effortField = createInspectorSelect(
    "Esforço",
    "effort",
    block.effort ?? 3,
    MATRIX_SCORE_OPTIONS
  );

  wrapper.append(
    title,
    description,
    impactField,
    effortField
  );

  return wrapper;
}

function renderEmptyInspector(inspector) {
  inspector.hidden = true;
}

function renderMultipleSelection(inspector, selectedBlocks) {
  inspector.hidden = false;

  const title = qs(".inspector__header h2", inspector);
  const body = qs(".inspector__body", inspector);

  if (title) {
    title.textContent = `${selectedBlocks.length} blocos selecionados`;
  }

  if (!body) {
    return;
  }

  clearElement(body);

  const text = createElement("p", {
    className: "muted-text",
    text: "Você pode mover, duplicar ou excluir estes blocos juntos.",
  });

  const actions = createElement("div", {
    className: "inspector-actions",
  });

  const deleteButton = createElement("button", {
    className: "danger-button",
    text: "Excluir selecionados",
    attrs: {
      type: "button",
      "data-inspector-action": "delete-selected",
    },
  });

  const clearButton = createElement("button", {
    className: "ghost-button",
    text: "Limpar seleção",
    attrs: {
      type: "button",
      "data-inspector-action": "clear-selection",
    },
  });

  actions.append(deleteButton, clearButton);
  body.append(text, actions);
}

function renderSingleBlockInspector(inspector, block) {
  inspector.hidden = false;

  const meta = getBlockTypeMeta(block.type);
  const title = qs(".inspector__header h2", inspector);
  const body = qs(".inspector__body", inspector);

  if (title) {
    title.textContent = `${meta.icon} ${meta.label}`;
  }

  if (!body) {
    return;
  }

  clearElement(body);

  const form = createElement("div", {
    className: "inspector-form",
    dataset: {
      inspectorBlockId: block.id,
    },
  });

  const titleField = createInspectorField("Título", "title", block.title);

  const contentField = createInspectorTextarea(
    "Conteúdo",
    "content",
    block.content
  );

  const typeField = createTypeSelect(block);
  const colorField = createColorPalette(block);

  const urlField =
    block.type === "link"
      ? createInspectorField("URL", "url", block.url || "", {
          type: "url",
          placeholder: "https://exemplo.com",
        })
      : null;

  const taskFields = block.type === "task" ? createTaskFields(block) : null;
  const matrixFields =
    block.type === "task" ||
    block.type === "idea" ||
    block.type === "goal"
      ? createMatrixFields(block)
      : null;

  const tagsField = createInspectorField(
    "Tags",
    "tags",
    formatTags(block.tags),
    {
      placeholder: "portfolio, estudo, urgente",
    }
  );

  const positionGroup = createElement("div", {
    className: "inspector-grid",
  });

  positionGroup.append(
    createInspectorField("Posição X", "x", block.x, {
      type: "number",
      step: 1,
    }),
    createInspectorField("Posição Y", "y", block.y, {
      type: "number",
      step: 1,
    })
  );

  const sizeGroup = createElement("div", {
    className: "inspector-grid",
  });

  sizeGroup.append(
    createInspectorField("Largura", "width", block.width, {
      type: "number",
      min: SIZE_LIMITS.width.min,
      max: SIZE_LIMITS.width.max,
      step: 1,
    }),
    createInspectorField("Altura", "height", block.height, {
      type: "number",
      min: SIZE_LIMITS.height.min,
      max: SIZE_LIMITS.height.max,
      step: 1,
    })
  );

  const actions = createElement("div", {
    className: "inspector-actions",
  });

  const deleteButton = createElement("button", {
    className: "danger-button",
    text: "Excluir bloco",
    attrs: {
      type: "button",
      "data-inspector-action": "delete-current",
    },
  });

  const clearButton = createElement("button", {
    className: "ghost-button",
    text: "Limpar seleção",
    attrs: {
      type: "button",
      "data-inspector-action": "clear-selection",
    },
  });

  actions.append(deleteButton, clearButton);

  form.append(titleField, contentField, typeField, colorField);

  if (urlField) {
    form.append(urlField);
  }

  if (taskFields) {
    form.append(taskFields);
  }

  if (matrixFields) {
    form.append(matrixFields);
  }

  form.append(tagsField, positionGroup, sizeGroup, actions);

  body.append(form);
}

function renderInspector(state) {
  const inspector = qs("[data-inspector]");

  if (!inspector) {
    return;
  }

  const selectedBlocks = state.selectedBlockIds
    .map((blockId) => state.blocks.find((block) => block.id === blockId))
    .filter(Boolean);

  if (selectedBlocks.length === 0) {
    renderEmptyInspector(inspector);
    return;
  }

  if (selectedBlocks.length > 1) {
    renderMultipleSelection(inspector, selectedBlocks);
    return;
  }

  renderSingleBlockInspector(inspector, selectedBlocks[0]);
}

function normalizeInspectorValue(field, value) {
  if (["x", "y"].includes(field)) {
    const number = Number.parseInt(value, 10);

    return Number.isFinite(number) ? number : 0;
  }

  if (field === "width") {
    const number = Number.parseInt(value, 10);

    return clamp(
      Number.isFinite(number) ? number : SIZE_LIMITS.width.min,
      SIZE_LIMITS.width.min,
      SIZE_LIMITS.width.max
    );
  }

  if (field === "height") {
    const number = Number.parseInt(value, 10);

    return clamp(
      Number.isFinite(number) ? number : SIZE_LIMITS.height.min,
      SIZE_LIMITS.height.min,
      SIZE_LIMITS.height.max
    );
  }

  if (field === "type") {
    return BLOCK_TYPES[value] ? value : "idea";
  }

  if (field === "color") {
    return BLOCK_COLORS[value] ? value : "yellow";
  }

  if (field === "tags") {
    return parseTags(value);
  }

  if (field === "status") {
    return TASK_STATUS[value] ? value : "todo";
  }

  if (field === "priority") {
    return TASK_PRIORITIES[value] ? value : "medium";
  }

  if (field === "dueDate") {
    return value ? String(value) : null;
  }

  if (field === "impact" || field === "effort") {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      return 3;
    }

    return Math.min(5, Math.max(1, Math.round(numberValue)));
  }

  return String(value).trim();
}

function updateSelectedBlockField(field, value) {
  const selectedBlocks = getSelectedBlocks();

  if (selectedBlocks.length !== 1) {
    return;
  }

  const block = selectedBlocks[0];

  if (field === "url") {
    const normalizedUrl = normalizeUrl(value);

    if (normalizedUrl === null) {
      showToast("Digite uma URL válida.", {
        type: "warning",
      });

      return;
    }

    updateBlock(block.id, {
      url: normalizedUrl,
    });

    return;
  }

  const normalizedValue = normalizeInspectorValue(field, value);

  if (Array.isArray(normalizedValue) && Array.isArray(block[field])) {
    const currentValue = JSON.stringify(block[field]);
    const nextValue = JSON.stringify(normalizedValue);

    if (currentValue === nextValue) {
      return;
    }
  } else if (normalizedValue === block[field]) {
    return;
  }

  updateBlock(block.id, {
    [field]: normalizedValue,
  });
}

function deleteSelectedBlocks() {
  const selectedBlocks = getSelectedBlocks();

  if (selectedBlocks.length === 0) {
    return;
  }

  selectedBlocks.forEach((block) => {
    removeBlock(block.id);
  });

  showToast(
    selectedBlocks.length === 1
      ? "Bloco excluído pelo painel."
      : `${selectedBlocks.length} blocos excluídos pelo painel.`,
    {
      type: "warning",
    }
  );
}

function setupInspectorEvents() {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    const inspector = qs("[data-inspector]");

    if (!inspector || inspector.hidden) {
      return;
    }

    event.preventDefault();
    clearSelection();
    qs("#boardCanvas")?.focus();
  });

  document.addEventListener("change", (event) => {
    const fieldElement = event.target.closest("[data-inspector-field]");

    if (!fieldElement) {
      return;
    }

    const field = fieldElement.dataset.inspectorField;

    updateSelectedBlockField(field, fieldElement.value);
  });

  document.addEventListener("click", (event) => {
    const colorButton = event.target.closest("[data-color-option]");

    if (colorButton) {
      updateSelectedBlockField("color", colorButton.dataset.colorOption);
      return;
    }

    const closeButton = event.target.closest("[data-action='close-inspector']");

    if (closeButton) {
      clearSelection();
      return;
    }

    const actionButton = event.target.closest("[data-inspector-action]");

    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.inspectorAction;

    if (action === "clear-selection") {
      clearSelection();
      return;
    }

    if (action === "delete-current" || action === "delete-selected") {
      deleteSelectedBlocks();
    }
  });
}

export function setupInspector() {
  subscribe(renderInspector);
  setupInspectorEvents();
}
