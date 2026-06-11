import { getCommands } from "../app/commands.js";
import { clearElement, createElement, qs } from "../utils/dom.js";

let isOpen = false;
let query = "";
let activeIndex = 0;

function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getFilteredCommands() {
  const commands = getCommands();
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return commands;
  }

  return commands.filter((command) => {
    const searchableText = [
      command.title,
      command.description,
      command.group,
      command.shortcut,
      ...(command.keywords || []),
    ]
      .join(" ")
      .toLowerCase();

    return normalizeText(searchableText).includes(normalizedQuery);
  });
}

function getCommandPaletteRoot() {
  let root = qs("#commandPaletteRoot");

  if (!root) {
    root = createElement("div", {
      className: "command-palette-root",
      attrs: {
        id: "commandPaletteRoot",
      },
    });

    document.body.append(root);
  }

  return root;
}

function closeCommandPalette() {
  const root = getCommandPaletteRoot();

  isOpen = false;
  query = "";
  activeIndex = 0;

  clearElement(root);
  document.body.classList.remove("is-command-palette-open");
}

function runCommand(command) {
  if (!command) {
    return;
  }

  closeCommandPalette();
  command.run();
}

function renderEmptyState(listElement) {
  const empty = createElement("div", {
    className: "command-palette__empty",
  });

  const title = createElement("strong", {
    text: "Nenhum comando encontrado",
  });

  const text = createElement("p", {
    text: "Tente buscar por criar, exportar, zoom, tarefa ou seleção.",
  });

  empty.append(title, text);
  listElement.append(empty);
}

function renderCommandButton(command, index) {
  const button = createElement("button", {
    className: `command-item${index === activeIndex ? " is-active" : ""}`,
    attrs: {
      type: "button",
      "data-command-id": command.id,
    },
  });

  const main = createElement("span", {
    className: "command-item__main",
  });

  const title = createElement("strong", {
    className: "command-item__title",
    text: command.title,
  });

  const description = createElement("span", {
    className: "command-item__description",
    text: command.description,
  });

  main.append(title, description);

  const meta = createElement("span", {
    className: "command-item__meta",
  });

  const group = createElement("span", {
    className: "command-item__group",
    text: command.group,
  });

  meta.append(group);

  if (command.shortcut) {
    const shortcut = createElement("kbd", {
      text: command.shortcut,
    });

    meta.append(shortcut);
  }

  button.append(main, meta);

  button.addEventListener("click", () => {
    runCommand(command);
  });

  return button;
}

function renderCommandPalette() {
  const root = getCommandPaletteRoot();
  const commands = getFilteredCommands();

  if (activeIndex >= commands.length) {
    activeIndex = Math.max(commands.length - 1, 0);
  }

  clearElement(root);

  if (!isOpen) {
    return;
  }

  document.body.classList.add("is-command-palette-open");

  const overlay = createElement("div", {
    className: "command-palette-overlay",
  });

  const panel = createElement("section", {
    className: "command-palette",
    attrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Command Palette",
    },
  });

  const header = createElement("div", {
    className: "command-palette__header",
  });

  const eyebrow = createElement("p", {
    className: "eyebrow",
    text: "Comandos",
  });

  const title = createElement("h2", {
    text: "O que você quer fazer?",
  });

  header.append(eyebrow, title);

  const search = createElement("input", {
    className: "command-palette__search",
    attrs: {
      type: "search",
      placeholder: "Buscar comando, ação ou atalho...",
      "aria-label": "Buscar comando",
    },
  });

  search.value = query;

  const list = createElement("div", {
    className: "command-palette__list",
    attrs: {
      role: "listbox",
    },
  });

  if (commands.length === 0) {
    renderEmptyState(list);
  } else {
    commands.forEach((command, index) => {
      list.append(renderCommandButton(command, index));
    });
  }

  const footer = createElement("div", {
    className: "command-palette__footer",
  });

  footer.append(
    createElement("span", {
      text: "↑ ↓ navegar",
    }),
    createElement("span", {
      text: "Enter executar",
    }),
    createElement("span", {
      text: "Esc fechar",
    })
  );

  panel.append(header, search, list, footer);
  overlay.append(panel);
  root.append(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeCommandPalette();
    }
  });

  search.addEventListener("input", (event) => {
    query = event.target.value;
    activeIndex = 0;
    renderCommandPalette();
  });

  window.requestAnimationFrame(() => {
    search.focus();
    search.setSelectionRange(search.value.length, search.value.length);
  });
}

function openCommandPalette() {
  isOpen = true;
  query = "";
  activeIndex = 0;

  renderCommandPalette();
}

function toggleCommandPalette() {
  if (isOpen) {
    closeCommandPalette();
    return;
  }

  openCommandPalette();
}

function setupCommandPaletteButtons() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest(
      "[data-action='open-command-palette']"
    );

    if (!button) {
      return;
    }

    openCommandPalette();
  });
}

function setupCommandPaletteKeyboard() {
  document.addEventListener(
    "keydown",
    (event) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (isCtrlOrCmd && key === "k") {
        event.preventDefault();
        event.stopPropagation();

        toggleCommandPalette();
        return;
      }

      if (!isOpen) {
        return;
      }

      const commands = getFilteredCommands();

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        closeCommandPalette();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();

        activeIndex = commands.length
          ? (activeIndex + 1) % commands.length
          : 0;

        renderCommandPalette();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();

        activeIndex = commands.length
          ? (activeIndex - 1 + commands.length) % commands.length
          : 0;

        renderCommandPalette();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();

        runCommand(commands[activeIndex]);
      }
    },
    true
  );
}

export function setupCommandPalette() {
  setupCommandPaletteButtons();
  setupCommandPaletteKeyboard();
}