const DEFAULT_DURATION = 2800;

const TOAST_TYPES = {
  success: {
    icon: "✓",
    label: "Sucesso",
  },
  info: {
    icon: "i",
    label: "Informação",
  },
  warning: {
    icon: "!",
    label: "Atenção",
  },
  error: {
    icon: "×",
    label: "Erro",
  },
};

function getToastRoot() {
  let root = document.querySelector("#toastRoot");

  if (!root) {
    root = document.createElement("div");
    root.id = "toastRoot";
    root.className = "toast-root";
    root.setAttribute("aria-live", "polite");

    document.body.append(root);
  }

  return root;
}

function removeToast(toastElement) {
  if (!toastElement || toastElement.dataset.removing === "true") {
    return;
  }

  toastElement.dataset.removing = "true";
  toastElement.classList.add("is-leaving");

  window.setTimeout(() => {
    toastElement.remove();
  }, 220);
}

export function showToast(message, options = {}) {
  const {
    type = "info",
    duration = DEFAULT_DURATION,
    title = null,
  } = options;

  const root = getToastRoot();
  const toastType = TOAST_TYPES[type] || TOAST_TYPES.info;

  const toastElement = document.createElement("div");
  toastElement.className = `toast toast--${type}`;
  toastElement.setAttribute("role", type === "error" ? "alert" : "status");

  const iconElement = document.createElement("div");
  iconElement.className = "toast__icon";
  iconElement.textContent = toastType.icon;
  iconElement.setAttribute("aria-hidden", "true");

  const contentElement = document.createElement("div");
  contentElement.className = "toast__content";

  if (title) {
    const titleElement = document.createElement("strong");
    titleElement.className = "toast__title";
    titleElement.textContent = title;
    contentElement.append(titleElement);
  }

  const messageElement = document.createElement("p");
  messageElement.className = "toast__message";
  messageElement.textContent = message;

  const closeButton = document.createElement("button");
  closeButton.className = "toast__close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Fechar mensagem");

  contentElement.append(messageElement);
  toastElement.append(iconElement, contentElement, closeButton);
  root.append(toastElement);

  closeButton.addEventListener("click", () => {
    removeToast(toastElement);
  });

  if (duration > 0) {
    window.setTimeout(() => {
      removeToast(toastElement);
    }, duration);
  }

  return toastElement;
}