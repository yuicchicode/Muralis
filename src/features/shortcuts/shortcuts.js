import {
  clearSelection,
  createBlock,
  duplicateSelectedBlocks,
  getState,
} from "../../app/state.js";

import { getBlockTypeMeta } from "../../models/block.model.js";
import { showToast } from "../../ui/toast.js";

function isTypingTarget(target) {
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']")
  );
}

function hasModifier(event) {
  return event.ctrlKey || event.metaKey || event.altKey;
}

function createShortcutBlock(type) {
  const block = createBlock(type);
  const meta = getBlockTypeMeta(block.type);

  showToast(`${meta.label} criado pelo atalho.`, {
    type: "success",
  });
}

function duplicateShortcutSelection() {
  const state = getState();

  if (state.selectedBlockIds.length === 0) {
    showToast("Selecione um bloco antes de duplicar.", {
      type: "info",
    });

    return;
  }

  const duplicatedBlocks = duplicateSelectedBlocks();

  showToast(
    duplicatedBlocks.length === 1
      ? "Bloco duplicado."
      : `${duplicatedBlocks.length} blocos duplicados.`,
    {
      type: "success",
    }
  );
}

export function setupShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;

    if (event.key === "Escape") {
      event.preventDefault();
      clearSelection();
      return;
    }

    if (isCtrlOrCmd && key === "d") {
      event.preventDefault();
      duplicateShortcutSelection();
      return;
    }

    if (event.repeat) {
      return;
    }

    if (hasModifier(event)) {
      return;
    }

    if (key === "n") {
      event.preventDefault();
      createShortcutBlock("idea");
      return;
    }

    if (key === "i") {
      event.preventDefault();
      createShortcutBlock("idea");
      return;
    }

    if (key === "t") {
      event.preventDefault();
      createShortcutBlock("task");
      return;
    }

    if (key === "l") {
      event.preventDefault();
      createShortcutBlock("link");
    }
  });
}