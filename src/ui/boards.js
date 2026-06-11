import {
  createBoard,
  getState,
  renameBoard,
  setActiveBoard,
  subscribe,
} from "../app/state.js";

import { openTextPrompt } from "./modal.js";
import { showToast } from "./toast.js";
import { clearElement, createElement, qs } from "../utils/dom.js";

let isBoardPickerOpen = false;

function ensureBoardControls() {
  let controls = qs("[data-board-controls]");

  if (controls) {
    return controls;
  }

  const title = qs("[data-board-title]");

  if (!title) {
    return null;
  }

  controls = createElement("div", {
    className: "board-controls",
    attrs: {
      "data-board-controls": "",
    },
  });

  const picker = createElement("div", {
    className: "board-picker",
    attrs: {
      "data-board-picker": "",
    },
  });

  const pickerButton = createElement("button", {
    className: "board-picker__button",
    attrs: {
      type: "button",
      "data-board-picker-button": "",
      "aria-haspopup": "listbox",
      "aria-expanded": "false",
    },
  });

  const pickerLabel = createElement("span", {
    className: "board-picker__label",
    attrs: {
      "data-board-picker-label": "",
    },
  });

  const pickerIcon = createElement("span", {
    className: "board-picker__icon",
    text: "⌄",
    attrs: {
      "aria-hidden": "true",
    },
  });

  const pickerMenu = createElement("div", {
    className: "board-picker__menu",
    attrs: {
      "data-board-picker-menu": "",
      role: "listbox",
      hidden: "",
    },
  });

  pickerButton.append(pickerLabel, pickerIcon);
  picker.append(pickerButton, pickerMenu);

  const renameButton = createElement("button", {
    className: "ghost-button board-controls__button",
    text: "Renomear",
    attrs: {
      type: "button",
      "data-action": "rename-board",
    },
  });

  const newButton = createElement("button", {
    className: "ghost-button board-controls__button",
    text: "+ Novo mural",
    attrs: {
      type: "button",
      "data-action": "create-board",
    },
  });

  controls.append(picker, renameButton, newButton);
  title.insertAdjacentElement("afterend", controls);

  return controls;
}

function closeBoardPicker() {
  const controls = qs("[data-board-controls]");

  if (!controls) {
    return;
  }

  const button = qs("[data-board-picker-button]", controls);
  const menu = qs("[data-board-picker-menu]", controls);

  isBoardPickerOpen = false;

  button?.setAttribute("aria-expanded", "false");

  if (menu) {
    menu.hidden = true;
  }
}

function openBoardPicker() {
  const controls = qs("[data-board-controls]");

  if (!controls) {
    return;
  }

  const button = qs("[data-board-picker-button]", controls);
  const menu = qs("[data-board-picker-menu]", controls);

  isBoardPickerOpen = true;

  button?.setAttribute("aria-expanded", "true");

  if (menu) {
    menu.hidden = false;

    window.requestAnimationFrame(() => {
      const activeItem = qs(".board-picker__item.is-active", menu);
      const firstItem = qs(".board-picker__item", menu);

      (activeItem || firstItem)?.focus();
    });
  }
}

function toggleBoardPicker() {
  if (isBoardPickerOpen) {
    closeBoardPicker();
    return;
  }

  openBoardPicker();
}

function renderBoardControls(state) {
  const controls = ensureBoardControls();

  if (!controls) {
    return;
  }

  const label = qs("[data-board-picker-label]", controls);
  const menu = qs("[data-board-picker-menu]", controls);

  if (!label || !menu) {
    return;
  }

  label.textContent = state.board.name;

  clearElement(menu);

  state.boards.forEach((board) => {
    const isActive = board.id === state.activeBoardId;

    const item = createElement("button", {
      className: `board-picker__item${isActive ? " is-active" : ""}`,
      attrs: {
        type: "button",
        role: "option",
        "aria-selected": isActive ? "true" : "false",
        "data-board-option": board.id,
      },
    });

    const name = createElement("span", {
      className: "board-picker__item-name",
      text: board.name,
    });

    const meta = createElement("span", {
      className: "board-picker__item-meta",
      text: isActive ? "Atual" : "Abrir",
    });

    item.append(name, meta);
    menu.append(item);
  });

  if (!isBoardPickerOpen) {
    menu.hidden = true;
  }
}

async function createNewBoardFromModal() {
  const name = await openTextPrompt({
    title: "Criar novo mural",
    description: "Crie um espaço separado para outro conjunto de ideias, tarefas e referências.",
    label: "Nome do mural",
    placeholder: "Ex: Estudos, Projetos, Ideias soltas...",
    initialValue: "Novo mural",
    confirmText: "Criar mural",
  });

  if (name === null) {
    return;
  }

  const board = createBoard(name);

  showToast(`Mural "${board.name}" criado.`, {
    type: "success",
  });
}

async function renameCurrentBoardFromModal() {
  const state = getState();

  const nextName = await openTextPrompt({
    title: "Renomear mural",
    description: "Altere o nome do mural atual para encontrar ele com mais facilidade.",
    label: "Nome do mural",
    placeholder: "Digite o novo nome",
    initialValue: state.board.name,
    confirmText: "Salvar nome",
  });

  if (nextName === null) {
    return;
  }

  const renamedBoard = renameBoard(state.activeBoardId, nextName);

  if (!renamedBoard) {
    showToast("Digite um nome válido para o mural.", {
      type: "warning",
    });

    return;
  }

  showToast(`Mural renomeado para "${renamedBoard.name}".`, {
    type: "success",
  });
}

function setupBoardControlsEvents() {
  document.addEventListener("click", (event) => {
    const pickerButton = event.target.closest("[data-board-picker-button]");

    if (pickerButton) {
      toggleBoardPicker();
      return;
    }

    const boardOption = event.target.closest("[data-board-option]");

    if (boardOption) {
      setActiveBoard(boardOption.dataset.boardOption);
      closeBoardPicker();
      return;
    }

    const createButton = event.target.closest("[data-action='create-board']");

    if (createButton) {
      createNewBoardFromModal();
      return;
    }

    const renameButton = event.target.closest("[data-action='rename-board']");

    if (renameButton) {
      renameCurrentBoardFromModal();
      return;
    }

    const clickedInsidePicker = event.target.closest("[data-board-picker]");

    if (!clickedInsidePicker) {
      closeBoardPicker();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!isBoardPickerOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeBoardPicker();
      qs("[data-board-picker-button]")?.focus();
    }
  });

  window.addEventListener("resize", () => {
    closeBoardPicker();
  });
}

export function setupBoards() {
  subscribe(renderBoardControls);
  setupBoardControlsEvents();
}
