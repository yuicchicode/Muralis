import {
  getState,
  removeBlock,
  updateBlock,
} from "../../app/state.js";

import { showToast } from "../../ui/toast.js";

const DOUBLE_TAP_DELAY = 360;

let lastEditTap = {
  blockId: null,
  field: null,
  time: 0,
};

function isTypingTarget(target) {
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']")
  );
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function placeCaretAtEnd(element) {
  const selection = window.getSelection();
  const range = document.createRange();

  range.selectNodeContents(element);
  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);
}

function startInlineEdit(element) {
  const blockElement = element.closest("[data-block-id]");

  if (!blockElement) {
    return;
  }

  const field = element.dataset.editableField;

  if (!field) {
    return;
  }

  if (element.contentEditable === "true") {
    return;
  }

  const originalValue = element.textContent;

  element.dataset.originalValue = originalValue;
  element.contentEditable = "true";
  element.spellcheck = true;
  element.classList.add("is-editing");

  element.focus();
  placeCaretAtEnd(element);
}

function finishInlineEdit(element, options = {}) {
  const { shouldCancel = false } = options;

  const blockElement = element.closest("[data-block-id]");

  if (!blockElement) {
    return;
  }

  const blockId = blockElement.dataset.blockId;
  const field = element.dataset.editableField;
  const originalValue = element.dataset.originalValue ?? "";

  const nextValue = shouldCancel
    ? originalValue
    : normalizeText(element.textContent);

  const safeValue = nextValue.length > 0 ? nextValue : originalValue;

  element.textContent = safeValue;
  element.contentEditable = "false";
  element.spellcheck = false;
  element.classList.remove("is-editing");

  delete element.dataset.originalValue;

  if (shouldCancel) {
    return;
  }

  updateBlock(blockId, {
    [field]: safeValue,
  });
}

function deleteSelectedBlocks() {
  const state = getState();
  const selectedIds = state.selectedBlockIds;

  if (selectedIds.length === 0) {
    return;
  }

  selectedIds.forEach((blockId) => {
    removeBlock(blockId);
  });

  showToast(
    selectedIds.length === 1
      ? "Bloco removido."
      : `${selectedIds.length} blocos removidos.`,
    {
      type: "warning",
    }
  );
}

function handleInlineEditPointer(event) {
  const editableElement = event.target.closest("[data-editable-field]");

  if (!editableElement) {
    return;
  }

  const blockElement = editableElement.closest("[data-block-id]");

  if (!blockElement) {
    return;
  }

  const blockId = blockElement.dataset.blockId;
  const field = editableElement.dataset.editableField;
  const now = Date.now();

  const isSecondTap =
    lastEditTap.blockId === blockId &&
    lastEditTap.field === field &&
    now - lastEditTap.time <= DOUBLE_TAP_DELAY;

  lastEditTap = {
    blockId,
    field,
    time: now,
  };

  if (!isSecondTap) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  startInlineEdit(editableElement);
}

export function setupBlockEditing() {
  document.addEventListener("pointerdown", handleInlineEditPointer, true);

  document.addEventListener("dblclick", (event) => {
    const editableElement = event.target.closest("[data-editable-field]");

    if (!editableElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    startInlineEdit(editableElement);
  });

  document.addEventListener(
    "blur",
    (event) => {
      const editableElement = event.target.closest("[data-editable-field]");

      if (!editableElement) {
        return;
      }

      if (editableElement.contentEditable !== "true") {
        return;
      }

      finishInlineEdit(editableElement);
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    const editableElement = event.target.closest("[data-editable-field]");

    if (editableElement && editableElement.contentEditable === "true") {
      const field = editableElement.dataset.editableField;

      if (event.key === "Escape") {
        event.preventDefault();

        finishInlineEdit(editableElement, {
          shouldCancel: true,
        });

        editableElement.blur();
        return;
      }

      if (field === "title" && event.key === "Enter") {
        event.preventDefault();

        finishInlineEdit(editableElement);
        editableElement.blur();
        return;
      }

      if (
        field === "content" &&
        event.key === "Enter" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();

        finishInlineEdit(editableElement);
        editableElement.blur();
      }

      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelectedBlocks();
    }
  });
}