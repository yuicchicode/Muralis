import { getCommands } from "../app/commands.js";
import { showToast } from "./toast.js";
import { getThemePreference, setThemePreference } from "./theme.js";
import { clearElement, createElement, qs } from "../utils/dom.js";

const DESKTOP_MENU_WIDTH = 292;

let isOpen = false;

const MENU_COMMAND_IDS = [
  "create-board",
  "rename-board",
  "create-idea",
  "create-task",
  "create-link",
  "export-json",
  "import-json",
  "center-view",
  "reset-zoom",
  "clear-selection",
];

function isMobileLayout() {
  return window.matchMedia("(max-width: 860px)").matches;
}

function getMenuRoot() {
  let root = qs("#contextMenuRoot");

  if (!root) {
    root = createElement("div", {
      className: "context-menu-root",
      attrs: {
        id: "contextMenuRoot",
      },
    });

    document.body.append(root);
  }

  return root;
}

function getMenuButton() {
  return qs("[data-action='toggle-sidebar']");
}

function setMenuButtonExpanded(isExpanded) {
  getMenuButton()?.setAttribute("aria-expanded", isExpanded ? "true" : "false");
}

function getCommandById(commandId) {
  return getCommands().find((command) => command.id === commandId);
}

function closeAppMenu() {
  const root = getMenuRoot();

  isOpen = false;
  clearElement(root);
  setMenuButtonExpanded(false);

  root.style.left = "";
  root.style.top = "";

  document.body.classList.remove("is-app-menu-open");
}

function runMenuCommand(command) {
  if (!command) {
    return;
  }

  closeAppMenu();
  command.run();
}

function openCommandPaletteFromMenu() {
  closeAppMenu();

  window.requestAnimationFrame(() => {
    const commandButton = qs("[data-action='open-command-palette']");
    commandButton?.click();
  });
}

function showAboutMessage() {
  closeAppMenu();

  showToast("Muralis é um organizador visual local para ideias, tarefas e referências.", {
    type: "info",
    title: "Sobre o Muralis",
    duration: 5200,
  });
}

function renderDivider() {
  return createElement("div", {
    className: "app-menu__divider",
    attrs: {
      role: "separator",
    },
  });
}

function renderMenuItem(command) {
  const button = createElement("button", {
    className: "app-menu__item",
    attrs: {
      type: "button",
      role: "menuitem",
    },
  });

  const text = createElement("span", {
    className: "app-menu__item-text",
  });

  const title = createElement("strong", {
    text: command.title,
  });

  const description = createElement("small", {
    text: command.description,
  });

  text.append(title, description);

  const meta = createElement("span", {
    className: "app-menu__item-meta",
  });

  if (command.shortcut) {
    const shortcut = createElement("kbd", {
      text: command.shortcut,
    });

    meta.append(shortcut);
  }

  button.append(text, meta);

  button.addEventListener("click", () => {
    runMenuCommand(command);
  });

  return button;
}

function renderCustomItem(options) {
  const {
    title,
    description,
    shortcut = "",
    onClick,
  } = options;

  const button = createElement("button", {
    className: "app-menu__item",
    attrs: {
      type: "button",
      role: "menuitem",
    },
  });

  const text = createElement("span", {
    className: "app-menu__item-text",
  });

  text.append(
    createElement("strong", {
      text: title,
    }),
    createElement("small", {
      text: description,
    })
  );

  const meta = createElement("span", {
    className: "app-menu__item-meta",
  });

  if (shortcut) {
    meta.append(
      createElement("kbd", {
        text: shortcut,
      })
    );
  }

  button.append(text, meta);
  button.addEventListener("click", onClick);

  return button;
}

function renderThemeControl() {
  const wrapper = createElement("label", {
    className: "app-menu__theme",
  });

  const text = createElement("span", {
    className: "app-menu__item-text",
  });

  text.append(
    createElement("strong", {
      text: "Tema",
    }),
    createElement("small", {
      text: "Escolha claro, escuro ou sistema.",
    })
  );

  const select = createElement("select", {
    className: "app-menu__theme-select",
    attrs: {
      "aria-label": "Tema do Muralis",
    },
  });

  [
    ["system", "Sistema"],
    ["light", "Claro"],
    ["dark", "Escuro"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");

    option.value = value;
    option.textContent = label;
    option.selected = getThemePreference() === value;

    select.append(option);
  });

  select.addEventListener("change", () => {
    setThemePreference(select.value);
  });

  wrapper.append(text, select);

  return wrapper;
}

function positionMenu(anchorButton, root) {
  const rect = anchorButton.getBoundingClientRect();

  const left = Math.min(
    Math.max(rect.left, 16),
    window.innerWidth - DESKTOP_MENU_WIDTH - 16
  );

  const top = Math.min(
    rect.bottom + 10,
    window.innerHeight - 24
  );

  root.style.left = `${left}px`;
  root.style.top = `${top}px`;
}

function openAppMenu(anchorButton) {
  const root = getMenuRoot();

  clearElement(root);
  isOpen = true;
  anchorButton?.setAttribute("aria-expanded", "true");

  document.body.classList.add("is-app-menu-open");

  const menu = createElement("section", {
    className: "app-menu",
    attrs: {
      role: "menu",
      "aria-label": "Menu principal do Muralis",
    },
  });

  const header = createElement("div", {
    className: "app-menu__header",
  });

  header.append(
    createElement("p", {
      className: "eyebrow",
      text: "Muralis",
    }),
    createElement("h2", {
      text: "Menu principal",
    })
  );

  menu.append(header);

  MENU_COMMAND_IDS.forEach((commandId, index) => {
    const command = getCommandById(commandId);

    if (!command) {
      return;
    }

    if (index === 3 || index === 5) {
      menu.append(renderDivider());
    }

    menu.append(renderMenuItem(command));
  });

  menu.append(
    renderDivider(),
    renderThemeControl(),
    renderDivider(),
    renderCustomItem({
      title: "Abrir Command Palette",
      description: "Buscar e executar qualquer comando.",
      shortcut: "Ctrl/Cmd K",
      onClick: openCommandPaletteFromMenu,
    }),
    renderCustomItem({
      title: "Sobre o Muralis",
      description: "Ver uma descrição rápida do projeto.",
      onClick: showAboutMessage,
    })
  );

  root.append(menu);
  positionMenu(anchorButton, root);

  window.requestAnimationFrame(() => {
    qs(".app-menu__item", menu)?.focus();
  });
}

function toggleDesktopMenu(anchorButton) {
  if (isOpen) {
    closeAppMenu();
    return;
  }

  openAppMenu(anchorButton);
}

function toggleMobileSidebar() {
  const app = qs("#app");
  const isOpenSidebar = app?.classList.toggle("is-sidebar-open") || false;

  setMenuButtonExpanded(isOpenSidebar);
}

function setupMenuButton() {
  document.addEventListener(
    "click",
    (event) => {
      const menuButton = event.target.closest("[data-action='toggle-sidebar']");

      if (!menuButton) {
        return;
      }

      /*
        Intercepta o clique antes do listener antigo da sidebar.
        Desktop: abre menu principal.
        Mobile: mantém comportamento de sidebar.
      */
      event.preventDefault();
      event.stopPropagation();

      if (isMobileLayout()) {
        closeAppMenu();
        toggleMobileSidebar();
        return;
      }

      toggleDesktopMenu(menuButton);
    },
    true
  );
}

function setupOutsideClick() {
  document.addEventListener("click", (event) => {
    if (!isOpen) {
      return;
    }

    const clickedInsideMenu = event.target.closest(".app-menu");
    const clickedMenuButton = event.target.closest("[data-action='toggle-sidebar']");

    if (clickedInsideMenu || clickedMenuButton) {
      return;
    }

    closeAppMenu();
  });
}

function setupKeyboard() {
  document.addEventListener("keydown", (event) => {
    if (isMobileLayout() && event.key === "Escape") {
      const app = qs("#app");

      if (app?.classList.contains("is-sidebar-open")) {
        event.preventDefault();
        app.classList.remove("is-sidebar-open");
        setMenuButtonExpanded(false);
        getMenuButton()?.focus();
        return;
      }
    }

    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeAppMenu();
      getMenuButton()?.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (isOpen) {
      closeAppMenu();
    }
  });
}

export function setupAppMenu() {
  setupMenuButton();
  setupOutsideClick();
  setupKeyboard();
}
