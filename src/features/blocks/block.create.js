import { createBlock } from "../../app/state.js";
import { getBlockTypeMeta } from "../../models/block.model.js";
import { showToast } from "../../ui/toast.js";

function createBlockWithFeedback(type) {
  const block = createBlock(type);
  const meta = getBlockTypeMeta(block.type);

  showToast(`${meta.label} adicionado ao mural.`, {
    type: "success",
  });
}

export function setupBlockCreation() {
  document.addEventListener("click", (event) => {
    const createTypeButton = event.target.closest("[data-create-type]");

    if (createTypeButton) {
      const type = createTypeButton.dataset.createType;
      createBlockWithFeedback(type);
      return;
    }

    const createBlockButton = event.target.closest(
      "[data-action='create-block']"
    );

    if (createBlockButton) {
      createBlockWithFeedback("idea");
    }
  });
}