import { clearSelection, selectBlock } from "../../app/state.js";

import {
  getBlockColorMeta,
  getBlockTypeMeta,
  getTaskPriorityMeta,
  getTaskStatusMeta,
} from "../../models/block.model.js";

import { createElement } from "../../utils/dom.js";

function renderBlockTags(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  const tagsElement = createElement("div", {
    className: "idea-block__tags",
  });

  tags.slice(0, 5).forEach((tag) => {
    const tagElement = createElement("span", {
      className: "idea-block__tag",
      text: `#${tag}`,
    });

    tagsElement.append(tagElement);
  });

  if (tags.length > 5) {
    const extraElement = createElement("span", {
      className: "idea-block__tag idea-block__tag--extra",
      text: `+${tags.length - 5}`,
    });

    tagsElement.append(extraElement);
  }

  return tagsElement;
}

function getUrlDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

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

function isTaskOverdue(block) {
  if (block.type !== "task" || !block.dueDate || block.status === "done") {
    return false;
  }

  const today = new Date();
  const dueDate = new Date(`${block.dueDate}T23:59:59`);

  return dueDate < today;
}

function renderTaskHeader(block, titleElement) {
  const row = createElement("div", {
    className: "idea-block__title-row",
  });

  const checkbox = createElement("input", {
    className: "idea-block__task-check",
    attrs: {
      type: "checkbox",
      "aria-label": "Marcar tarefa como concluída",
      "data-task-done-toggle": "",
    },
  });

  checkbox.checked = block.status === "done";

  row.append(checkbox, titleElement);

  return row;
}

function renderTaskMeta(block) {
  if (block.type !== "task") {
    return null;
  }

  const statusMeta = getTaskStatusMeta(block.status);
  const priorityMeta = getTaskPriorityMeta(block.priority);
  const dueDate = formatDate(block.dueDate);

  const meta = createElement("div", {
    className: "idea-block__task-meta",
  });

  const status = createElement("span", {
    className: "task-chip task-chip--status",
    text: statusMeta.label,
  });

  const priority = createElement("span", {
    className: `task-chip task-chip--priority task-chip--${priorityMeta.value}`,
    text: priorityMeta.label,
  });

  meta.append(status, priority);

  if (dueDate) {
    const due = createElement("span", {
      className: `task-chip task-chip--date${
        isTaskOverdue(block) ? " is-overdue" : ""
      }`,
      text: dueDate,
    });

    meta.append(due);
  }

  return meta;
}

function renderLinkPreview(block) {
  if (block.type !== "link" || !block.url) {
    return null;
  }

  const preview = createElement("div", {
    className: "idea-block__link-preview",
  });

  const domain = createElement("span", {
    className: "idea-block__link-domain",
    text: getUrlDomain(block.url),
  });

  const openLink = createElement("a", {
    className: "idea-block__link-open",
    text: "Abrir",
    attrs: {
      href: block.url,
      target: "_blank",
      rel: "noopener noreferrer",
      title: "Abrir link em nova aba",
    },
  });

  preview.append(domain, openLink);

  return preview;
}

export function renderBlock(block, options = {}) {
  const { isSelected = false } = options;
  const meta = getBlockTypeMeta(block.type);
  const color = getBlockColorMeta(block.color).value;

  const blockElement = createElement("article", {
    className: `idea-block${isSelected ? " is-selected" : ""}`,
    attrs: {
      tabindex: "0",
      role: "button",
      "aria-label": `${meta.label}: ${block.title}`,
    },
    dataset: {
      blockId: block.id,
      type: block.type,
      color,
      status: block.status || "",
    },
  });

  blockElement.style.left = `${block.x}px`;
  blockElement.style.top = `${block.y}px`;
  blockElement.style.width = `${block.width}px`;
  blockElement.style.minHeight = `${block.height}px`;

  const typeElement = createElement("div", {
    className: "idea-block__type",
    text: `${meta.icon} ${meta.label}`,
  });

  const titleElement = createElement("h3", {
    className: "idea-block__title",
    text: block.title,
    attrs: {
      "data-editable-field": "title",
      title: "Duplo clique para editar o título",
    },
  });

  const titleContent =
    block.type === "task" ? renderTaskHeader(block, titleElement) : titleElement;

  const contentElement = createElement("p", {
    className: "idea-block__content",
    text: block.content,
    attrs: {
      "data-editable-field": "content",
      title: "Duplo clique para editar o conteúdo",
    },
  });

  const taskMeta = renderTaskMeta(block);
  const linkPreview = renderLinkPreview(block);
  const tagsElement = renderBlockTags(block.tags);

  const resizeHandle = createElement("button", {
    className: "idea-block__resize-handle",
    attrs: {
      type: "button",
      "aria-label": "Redimensionar bloco",
      "data-resize-handle": "corner",
      title: "Arraste para redimensionar",
    },
  });

  blockElement.append(typeElement, titleContent, contentElement);

  if (taskMeta) {
    blockElement.append(taskMeta);
  }

  if (linkPreview) {
    blockElement.append(linkPreview);
  }

  if (tagsElement) {
    blockElement.append(tagsElement);
  }

  blockElement.append(resizeHandle);

  return blockElement;
}

export function setupBlockSelection() {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const isInteractiveElement = event.target.closest(
      "button, input, textarea, select, a, [contenteditable='true']"
    );

    if (isInteractiveElement) {
      return;
    }

    const blockElement = event.target.closest("[data-block-id]");

    if (!blockElement || blockElement.getAttribute("role") !== "button") {
      return;
    }

    event.preventDefault();

    selectBlock(blockElement.dataset.blockId, {
      append: event.shiftKey || event.metaKey || event.ctrlKey,
    });
  });

  document.addEventListener("click", (event) => {
    const isInteractiveElement = event.target.closest(
      "button, input, textarea, select, a, [contenteditable='true']"
    );

    if (isInteractiveElement) {
      return;
    }

    const blockElement = event.target.closest("[data-block-id]");

    if (blockElement) {
      const shouldAppend = event.shiftKey || event.metaKey || event.ctrlKey;

      selectBlock(blockElement.dataset.blockId, {
        append: shouldAppend,
      });

      return;
    }

    const clickedCanvas = event.target.closest("#boardCanvas");

    if (clickedCanvas) {
      clearSelection();
    }
  });
}
