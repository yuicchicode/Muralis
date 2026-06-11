import { clearElement, createElement, qs } from "../utils/dom.js";

let activeModal = null;

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

function closeModal(result = null) {
  const root = getModalRoot();

  activeModal = null;
  document.body.classList.remove("is-modal-open");
  clearElement(root);

  return result;
}

export function openTextPrompt(options = {}) {
  const {
    title = "Digite um valor",
    description = "",
    label = "Valor",
    placeholder = "",
    initialValue = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
  } = options;

  return new Promise((resolve) => {
    const root = getModalRoot();

    clearElement(root);
    document.body.classList.add("is-modal-open");

    const overlay = createElement("div", {
      className: "app-modal-overlay",
    });

    const modal = createElement("section", {
      className: "app-modal",
      attrs: {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": title,
      },
    });

    const header = createElement("div", {
      className: "app-modal__header",
    });

    const eyebrow = createElement("p", {
      className: "eyebrow",
      text: "Muralis",
    });

    const titleElement = createElement("h2", {
      text: title,
    });

    header.append(eyebrow, titleElement);

    if (description) {
      header.append(
        createElement("p", {
          className: "app-modal__description",
          text: description,
        })
      );
    }

    const field = createElement("label", {
      className: "app-modal__field",
    });

    const labelElement = createElement("span", {
      className: "app-modal__label",
      text: label,
    });

    const input = createElement("input", {
      className: "input app-modal__input",
      attrs: {
        type: "text",
        placeholder,
        value: initialValue,
      },
    });

    field.append(labelElement, input);

    const actions = createElement("div", {
      className: "app-modal__actions",
    });

    const cancelButton = createElement("button", {
      className: "ghost-button",
      text: cancelText,
      attrs: {
        type: "button",
      },
    });

    const confirmButton = createElement("button", {
      className: "primary-button",
      text: confirmText,
      attrs: {
        type: "button",
      },
    });

    actions.append(cancelButton, confirmButton);
    modal.append(header, field, actions);
    overlay.append(modal);
    root.append(overlay);

    activeModal = {
      resolve,
    };

    activeModal = {
      resolve,
      input,
    };

    function cancel() {
      closeModal();
      resolve(null);
    }

    function confirm() {
      const value = input.value.trim();

      closeModal();
      resolve(value);
    }

    cancelButton.addEventListener("click", cancel);
    confirmButton.addEventListener("click", confirm);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cancel();
      }
    });

    function handleKeydown(event) {
      if (!activeModal) {
        document.removeEventListener("keydown", handleKeydown, true);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        cancel();
        document.removeEventListener("keydown", handleKeydown, true);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();

        confirm();
        document.removeEventListener("keydown", handleKeydown, true);
      }
    }

    document.addEventListener("keydown", handleKeydown, true);

    window.requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  });
}

export function openConfirmDialog(options = {}) {
  const {
    title = "Confirmar ação",
    description = "Tem certeza que deseja continuar?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "default",
  } = options;

  return new Promise((resolve) => {
    const root = getModalRoot();

    clearElement(root);
    document.body.classList.add("is-modal-open");

    const overlay = createElement("div", {
      className: "app-modal-overlay",
    });

    const modal = createElement("section", {
      className: `app-modal${variant === "danger" ? " app-modal--danger" : ""}`,
      attrs: {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": title,
      },
    });

    const header = createElement("div", {
      className: "app-modal__header",
    });

    header.append(
      createElement("p", {
        className: "eyebrow",
        text: "Muralis",
      }),
      createElement("h2", {
        text: title,
      }),
      createElement("p", {
        className: "app-modal__description",
        text: description,
      })
    );

    const actions = createElement("div", {
      className: "app-modal__actions",
    });

    const cancelButton = createElement("button", {
      className: "ghost-button",
      text: cancelText,
      attrs: {
        type: "button",
      },
    });

    const confirmButton = createElement("button", {
      className: variant === "danger" ? "danger-button" : "primary-button",
      text: confirmText,
      attrs: {
        type: "button",
      },
    });

    actions.append(cancelButton, confirmButton);
    modal.append(header, actions);
    overlay.append(modal);
    root.append(overlay);

    function cancel() {
      closeModal();
      resolve(false);
    }

    function confirm() {
      closeModal();
      resolve(true);
    }

    cancelButton.addEventListener("click", cancel);
    confirmButton.addEventListener("click", confirm);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cancel();
      }
    });

    function handleKeydown(event) {
      if (!activeModal) {
        document.removeEventListener("keydown", handleKeydown, true);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        cancel();
        document.removeEventListener("keydown", handleKeydown, true);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();

        confirm();
        document.removeEventListener("keydown", handleKeydown, true);
      }
    }

    document.addEventListener("keydown", handleKeydown, true);

    window.requestAnimationFrame(() => {
      cancelButton.focus();
    });
  });
}
