import {
  createBlock,
  createMindmap,
  createMindmapEdge,
  createMindmapNodeForBlock,
  deleteMindmapBranch,
  deleteMindmapNode,
  getState,
  renameMindmap,
  selectBlock,
  setActiveMindmap,
  setActiveMode,
  updateMindmapNode,
} from "../../app/state.js";

import { focusBlockInViewport } from "../../features/board/board.viewport.js";

import { showToast } from "../../ui/toast.js";
import { clearElement, createElement, qs } from "../../utils/dom.js";

const MINDMAP_CANVAS_SIZE = {
  width: 2400,
  height: 1600,
};

const DEFAULT_NODE_SIZE = {
  width: 260,
  height: 92,
};

const NODE_LAYOUT = {
  childGapX: 360,
  childGapY: 128,
  siblingGapY: 128,
};

let recentlyDraggedNodeId = null;
let mindmapLibraryOpen = false; 
let mindmapLibraryParentNodeId = null; 
let mindmapLibraryQuery = "";


function getBlockById(state, blockId) {
  return state.blocks.find((block) => block.id === blockId) || null;
}

function getNodeById(state, nodeId) {
  return state.mindmapNodes.find((node) => node.id === nodeId) || null;
}

function getChildNodes(state, parentNodeId) {
  return state.mindmapNodes.filter((node) => {
    return node.parentNodeId === parentNodeId;
  });
}

function getSiblingNodes(state, node) {
  return state.mindmapNodes.filter((item) => {
    return item.parentNodeId === node.parentNodeId;
  });
}

function getDescendantNodes(state, nodeId) {
  const descendants = [];
  const pendingIds = [nodeId];

  while (pendingIds.length > 0) {
    const currentNodeId = pendingIds.shift();

    const children = state.mindmapNodes.filter((node) => {
      return node.parentNodeId === currentNodeId;
    });

    children.forEach((child) => {
      descendants.push(child);
      pendingIds.push(child.id);
    });
  }

  return descendants;
}

function getHiddenNodeIdsFromCollapsedNodes(state) {
  const hiddenNodeIds = new Set();

  state.mindmapNodes.forEach((node) => {
    if (!node.collapsed) {
      return;
    }

    const descendants = getDescendantNodes(state, node.id);

    descendants.forEach((descendant) => {
      hiddenNodeIds.add(descendant.id);
    });
  });

  return hiddenNodeIds;
}

function getVisibleMindmapNodes(state) {
  const hiddenNodeIds = getHiddenNodeIdsFromCollapsedNodes(state);

  return state.mindmapNodes.filter((node) => {
    return !hiddenNodeIds.has(node.id);
  });
}

function getHiddenDescendantCount(state, nodeId) {
  const descendants = getDescendantNodes(state, nodeId);

  return descendants.length;
}

function hasChildren(state, nodeId) {
  return state.mindmapNodes.some((node) => {
    return node.parentNodeId === nodeId;
  });
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getBlockSearchText(block) {
  const tags = Array.isArray(block.tags) ? block.tags.join(" ") : "";

  return normalizeText([
    block.title,
    block.content,
    block.type,
    tags,
  ].join(" "));
}

function getBlocksAvailableForMindmap(state) {
  const usedBlockIds = new Set(
    state.mindmapNodes.map((node) => node.blockId)
  );

  return state.blocks.filter((block) => {
    return !usedBlockIds.has(block.id);
  });
}

function getFilteredLibraryBlocks(state) {
  const availableBlocks = getBlocksAvailableForMindmap(state);
  const query = normalizeText(mindmapLibraryQuery);

  if (!query) {
    return availableBlocks;
  }

  return availableBlocks.filter((block) => {
    return getBlockSearchText(block).includes(query);
  });
}

function getSuggestedNodePosition(state, parentNode = null) {
  if (parentNode) {
    const children = getChildNodes(state, parentNode.id);

    return {
      x: parentNode.x + NODE_LAYOUT.childGapX,
      y: parentNode.y + children.length * NODE_LAYOUT.childGapY,
    };
  }

  if (state.mindmapNodes.length === 0) {
    return {
      x: 980,
      y: 720,
    };
  }

  const maxY = Math.max(
    ...state.mindmapNodes.map((node) => Number(node.y) || 0)
  );

  return {
    x: 980,
    y: maxY + NODE_LAYOUT.siblingGapY,
  };
}

function createNodeTitle(sourceBlock, relationship) {
  const baseTitle = sourceBlock?.title || "ideia";

  if (relationship === "child") {
    return `Nova ideia de ${baseTitle}`;
  }

  return "Nova ideia relacionada";
}

function ensureMindmapToolbarSlot() {
  let slot = qs("[data-mindmap-toolbar-slot]");
  const boardViewport = qs(".board-viewport");

  if (slot) {
    if (boardViewport && slot.parentElement !== boardViewport) {
      boardViewport.append(slot);
    }

    return slot;
  }

  if (!boardViewport) {
    return null;
  }

  slot = createElement("div", {
    className: "mindmap-mode-toolbar-slot",
    attrs: {
      "data-mindmap-toolbar-slot": "",
      id: "modeControlsPanel",
    },
  });

  boardViewport.append(slot);

  return slot;
}

export function clearMindmapModeToolbar() {
  const slot = qs("[data-mindmap-toolbar-slot]");

  if (!slot) {
    return;
  }

  clearElement(slot);
  slot.hidden = true;
}

function renderMindmapPicker(state) {
  const wrapper = createElement("label", {
    className: "mindmap-picker",
  });

  const label = createElement("span", {
    className: "mindmap-picker__label",
    text: "Mapa",
  });

  const select = createElement("select", {
    className: "mindmap-picker__select",
    attrs: {
      "data-mindmap-action": "select-map",
    },
  });

  state.mindmaps.forEach((mindmap) => {
    const option = document.createElement("option");

    option.value = mindmap.id;
    option.textContent = mindmap.name;
    option.selected = mindmap.id === state.activeMindmapId;

    select.append(option);
  });

  wrapper.append(label, select);

  return wrapper;
}

function renderMindmapToolbar(state) {
  const slot = ensureMindmapToolbarSlot();

  if (!slot) {
    return;
  }

  clearElement(slot);
  slot.hidden = false;

  const toolbar = createElement("div", {
    className: "mode-toolbar mindmap-mode-toolbar",
  });

  const heading = createElement("div", {
    className: "mode-toolbar__heading mindmap-toolbar__heading",
  });

  heading.append(
    createElement("p", {
      className: "eyebrow",
      text: "Modo Mapa Mental",
    }),
    createElement("h2", {
      text: state.activeMindmap?.name || "Mapa mental",
    }),
    createElement("p", {
      className: "mindmap-toolbar__description",
      text: "Organize ideias, tarefas e metas como uma rede visual conectada.",
    })
  );

  const actions = createElement("div", {
    className: "mode-toolbar__actions mindmap-toolbar__actions",
  });

  actions.append(
    renderMindmapPicker(state),
  
    createElement("button", {
      className: "ghost-button",
      text: "Renomear",
      attrs: {
        type: "button",
        "data-mindmap-action": "rename-map",
      },
    }),
  
    createElement("button", {
      className: "ghost-button",
      text: "+ Bloco existente",
      attrs: {
        type: "button",
        "data-mindmap-action": "open-library",
      },
    }),
  
    createElement("button", {
      className: "primary-button",
      text: "+ Novo mapa",
      attrs: {
        type: "button",
        "data-mindmap-action": "create-map",
      },
    })
  );

  const stats = createElement("div", {
    className: "mode-toolbar__meta mindmap-toolbar__stats",
  });

  stats.append(
    createElement("span", {
      className: "mindmap-toolbar__stat",
      text:
        state.mindmapNodes.length === 1
          ? "1 nó"
          : `${state.mindmapNodes.length} nós`,
    }),
    createElement("span", {
      className: "mindmap-toolbar__stat",
      text:
        state.mindmapEdges.length === 1
          ? "1 conexão"
          : `${state.mindmapEdges.length} conexões`,
    })
  );

  const main = createElement("div", {
    className: "mode-toolbar__main",
  });

  main.append(heading, actions);
  toolbar.append(main, stats);
  slot.append(toolbar);
}

function renderMindmapEmptyState() {
  const empty = createElement("section", {
    className: "mindmap-empty",
  });

  empty.append(
    createElement("div", {
      className: "mindmap-empty__icon",
      text: "🧠",
    }),
    createElement("h2", {
      text: "Comece pelo nó central",
    }),
    createElement("p", {
      text: "Crie a ideia principal deste mapa. Depois vamos adicionar filhos, irmãos e conexões.",
    }),
    createElement("button", {
      className: "primary-button",
      text: "Criar nó central",
      attrs: {
        type: "button",
        "data-mindmap-action": "create-central-node",
      },
    })
  );

  return empty;
}

function getBlockTypeLabel(type) {
  const labels = {
    idea: "Ideia",
    task: "Tarefa",
    reference: "Referência",
    goal: "Meta",
    quote: "Citação",
    link: "Link",
  };

  return labels[type] || "Bloco";
}

function renderMindmapLibraryPanel(state) {
  if (!mindmapLibraryOpen) {
    return null;
  }

  const parentNode = mindmapLibraryParentNodeId
    ? getNodeById(state, mindmapLibraryParentNodeId)
    : null;

  const parentBlock = parentNode
    ? getBlockById(state, parentNode.blockId)
    : null;

  const blocks = getFilteredLibraryBlocks(state);

  const panel = createElement("aside", {
    className: "mindmap-library",
    attrs: {
      "aria-label": "Biblioteca de blocos existentes",
    },
  });

  const header = createElement("div", {
    className: "mindmap-library__header",
  });

  const title = createElement("div", {
    className: "mindmap-library__title",
  });

  title.append(
    createElement("p", {
      className: "eyebrow",
      text: "Biblioteca",
    }),

    createElement("h3", {
      text: parentBlock
        ? `Adicionar filho em “${parentBlock.title || "Sem título"}”`
        : "Adicionar bloco existente",
    }),

    createElement("p", {
      text: "Escolha um bloco do mural para aparecer neste mapa mental.",
    })
  );

  header.append(
    title,

    createElement("button", {
      className: "icon-button",
      text: "×",
      attrs: {
        type: "button",
        "aria-label": "Fechar biblioteca",
        "data-mindmap-action": "close-library",
      },
    })
  );

  const search = createElement("input", {
    className: "mindmap-library__search",
    attrs: {
      type: "search",
      placeholder: "Buscar por título, conteúdo ou tag...",
      value: mindmapLibraryQuery,
      "data-mindmap-library-search": "",
    },
  });

  const list = createElement("div", {
    className: "mindmap-library__list",
  });

  if (blocks.length === 0) {
    list.append(
      createElement("div", {
        className: "mindmap-library__empty",
        text:
          getBlocksAvailableForMindmap(state).length === 0
            ? "Todos os blocos deste mural já estão neste mapa."
            : "Nenhum bloco encontrado para essa busca.",
      })
    );
  } else {
    blocks.forEach((block) => {
      const item = createElement("button", {
        className: "mindmap-library__item",
        attrs: {
          type: "button",
          "data-mindmap-action": "add-existing-block",
          "data-block-id": block.id,
        },
      });

      const itemTitle = createElement("strong", {
        text: block.title || "Sem título",
      });

      const itemMeta = createElement("span", {
        text: getBlockTypeLabel(block.type),
      });

      const itemContent = block.content
        ? createElement("p", {
            text: block.content,
          })
        : null;

      item.append(itemTitle, itemMeta);

      if (itemContent) {
        item.append(itemContent);
      }

      list.append(item);
    });
  }

  panel.append(header, search, list);

  return panel;
}

function getNodeCenter(node) {
  const width = Number(node.width) || DEFAULT_NODE_SIZE.width;

  return {
    x: node.x + width / 2,
    y: node.y + DEFAULT_NODE_SIZE.height / 2,
  };
}

function createEdgePath(fromNode, toNode) {
  const from = getNodeCenter(fromNode);
  const to = getNodeCenter(toNode);

  const distance = Math.max(120, Math.abs(to.x - from.x) * 0.45);

  const controlA = {
    x: from.x + distance,
    y: from.y,
  };

  const controlB = {
    x: to.x - distance,
    y: to.y,
  };

  return [
    `M ${from.x} ${from.y}`,
    `C ${controlA.x} ${controlA.y}`,
    `${controlB.x} ${controlB.y}`,
    `${to.x} ${to.y}`,
  ].join(" ");
}

function renderMindmapEdges(state, validNodes) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  svg.classList.add("mindmap-edges");
  svg.setAttribute("width", String(MINDMAP_CANVAS_SIZE.width));
  svg.setAttribute("height", String(MINDMAP_CANVAS_SIZE.height));
  svg.setAttribute("viewBox", `0 0 ${MINDMAP_CANVAS_SIZE.width} ${MINDMAP_CANVAS_SIZE.height}`);
  svg.setAttribute("aria-hidden", "true");

  state.mindmapEdges.forEach((edge) => {
    const fromNode = validNodes.find((node) => node.id === edge.fromNodeId);
    const toNode = validNodes.find((node) => node.id === edge.toNodeId);

    if (!fromNode || !toNode) {
      return;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    path.classList.add("mindmap-edge");
    path.setAttribute("d", createEdgePath(fromNode, toNode));

    svg.append(path);
  });

  return svg;
}

function renderMindmapNode(node, block, state) {
  const metaByType = {
    idea: {
      icon: "💡",
      label: "Ideia",
    },
    task: {
      icon: "✓",
      label: "Tarefa",
    },
    reference: {
      icon: "📎",
      label: "Referência",
    },
    goal: {
      icon: "🎯",
      label: "Meta",
    },
    quote: {
      icon: "❝",
      label: "Citação",
    },
    link: {
      icon: "🔗",
      label: "Link",
    },
  };

  const typeMeta = metaByType[block.type] || metaByType.idea;
  const isSelected = state.selectedBlockIds.includes(block.id);
  const nodeHasChildren = hasChildren(state, node.id);
  const hiddenDescendantCount = node.collapsed
  ? getHiddenDescendantCount(state, node.id)
  : 0;

  const nodeElement = createElement("article", {
    className: `mindmap-node${isSelected ? " is-selected" : ""}`,
    attrs: {
      "data-mindmap-node-id": node.id,
      "data-block-id": block.id,
      "data-block-type": block.type,
      tabindex: "0",
      role: "button",
      "aria-label": `Selecionar nó ${block.title}`,
    },
  });

  nodeElement.style.left = `${node.x}px`;
  nodeElement.style.top = `${node.y}px`;
  nodeElement.style.width = `${node.width || DEFAULT_NODE_SIZE.width}px`;

  const header = createElement("div", {
    className: "mindmap-node__header",
  });

  header.append(
    createElement("span", {
      className: "mindmap-node__type",
      text: `${typeMeta.icon} ${typeMeta.label}`,
    })
  );
  
  if (hiddenDescendantCount > 0) {
    header.append(
      createElement("span", {
        className: "mindmap-node__hidden-count",
        text:
          hiddenDescendantCount === 1
            ? "1 oculto"
            : `${hiddenDescendantCount} ocultos`,
      })
    );
  }

  const title = createElement("h3", {
    className: "mindmap-node__title",
    text: block.title || "Sem título",
  });

  const content = block.content
    ? createElement("p", {
        className: "mindmap-node__content",
        text: block.content,
      })
    : null;

  const footer = createElement("div", {
    className: "mindmap-node__footer",
  });

  const tags = Array.isArray(block.tags) ? block.tags.slice(0, 3) : [];

  tags.forEach((tag) => {
    footer.append(
      createElement("span", {
        className: "mindmap-node__tag",
        text: `#${tag}`,
      })
    );
  });

  const actions = createElement("div", {
    className: "mindmap-node__actions",
    });

    actions.append(
      createElement("button", {
        className: "mindmap-node__action",
        text: "+ Filho",
        attrs: {
          type: "button",
          title: "Criar nó filho",
          "data-mindmap-action": "create-child-node",
          "data-node-id": node.id,
        },
      }),
      createElement("button", {
        className: "mindmap-node__action",
        text: "+ Existente",
        attrs: {
          type: "button",
          title: "Adicionar bloco existente como filho",
          "data-mindmap-action": "open-library-for-parent",
          "data-node-id": node.id,
        },
      }),
      createElement("button", {
        className: "mindmap-node__action",
        text: "+ Irmão",
        attrs: {
          type: "button",
          title: "Criar nó irmão",
          "data-mindmap-action": "create-sibling-node",
          "data-node-id": node.id,
        },
      }),
      ...(nodeHasChildren
        ? [
            createElement("button", {
              className: "mindmap-node__action mindmap-node__action--collapse",
              text: node.collapsed ? "Expandir" : "Recolher",
              attrs: {
                type: "button",
                title: node.collapsed
                  ? "Mostrar descendentes"
                  : "Ocultar descendentes",
                "data-mindmap-action": "toggle-collapse-node",
                "data-node-id": node.id,
              },
            }),
          ]
        : []),
      createElement("button", {
        className: "mindmap-node__action",
        text: "Ver no mural",
        attrs: {
          type: "button",
          title: "Abrir este bloco no mural livre",
          "data-mindmap-action": "open-block-in-free-board",
          "data-block-id": block.id,
        },
      }),  
      createElement("button", {
        className: "mindmap-node__action mindmap-node__action--danger",
        text: "Remover nó",
        attrs: {
          type: "button",
          title: "Remove apenas este nó do mapa",
          "data-mindmap-action": "delete-node",
          "data-node-id": node.id,
        },
      }),
      createElement("button", {
        className: "mindmap-node__action mindmap-node__action--danger",
        text: "Remover ramo",
        attrs: {
          type: "button",
          title: "Remove este nó e todos os filhos do mapa",
          "data-mindmap-action": "delete-branch",
          "data-node-id": node.id,
        },
      })
    );

    nodeElement.append(header, title);

    if (content) {
    nodeElement.append(content);
    }

    if (tags.length > 0) {
    nodeElement.append(footer);
    }

    nodeElement.append(actions);

  nodeElement.addEventListener("click", (event) => {
    const isInteractive = event.target.closest("button, input, select, a");

    if (isInteractive) {
        return;
    }

    if (nodeElement.dataset.wasDragged === "true") {
        nodeElement.dataset.wasDragged = "false";
        return;
    }

    selectBlock(block.id);
  });

  nodeElement.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    selectBlock(block.id);
  });

  return nodeElement;
}

function renderMindmapNodes(state, validNodes) {
  const layer = createElement("div", {
    className: "mindmap-nodes",
  });

  validNodes.forEach((node) => {
    const block = getBlockById(state, node.blockId);

    if (!block) {
      return;
    }

    layer.append(renderMindmapNode(node, block, state));
  });

  return layer;
}

function renderMindmapSurface(state) {
  const surface = createElement("div", {
    className: "mindmap-surface",
  });

  surface.style.width = `${MINDMAP_CANVAS_SIZE.width}px`;
  surface.style.height = `${MINDMAP_CANVAS_SIZE.height}px`;

  const visibleNodes = getVisibleMindmapNodes(state);

  const validNodes = visibleNodes.filter((node) => {
    return Boolean(getBlockById(state, node.blockId));
  });

  if (validNodes.length === 0) {
    surface.append(renderMindmapEmptyState());
    return surface;
  }

  surface.append(
    renderMindmapEdges(state, validNodes),
    renderMindmapNodes(state, validNodes)
  );

  return surface;
}

export function renderMindmapMode(boardCanvas, state) {
  renderMindmapToolbar(state);

  const wrapper = createElement("div", {
    className: "mindmap-mode",
  });

  wrapper.append(renderMindmapSurface(state));

  const libraryPanel = renderMindmapLibraryPanel(state);
  
  if (libraryPanel) {
      wrapper.append(libraryPanel);
  }

  boardCanvas.append(wrapper);
}

function createCentralNode() {
  const block = createBlock("idea", {
    title: "Ideia central",
    content: "Descreva o tema principal deste mapa.",
    x: 420,
    y: 260,
  });

  if (!block) {
    showToast("Não foi possível criar o nó central.", {
      type: "error",
    });

    return;
  }

  createMindmapNodeForBlock(block.id, {
    x: 980,
    y: 720,
    width: 240,
    parentNodeId: null,
  });

  showToast("Nó central criado.", {
    type: "success",
  });
}

function createMindmapNodeFromSource(sourceNodeId, relationship) {
  const state = getState();
  const sourceNode = getNodeById(state, sourceNodeId);

  if (!sourceNode) {
    showToast("Não foi possível localizar o nó de origem.", {
      type: "error",
    });

    return;
  }

  const sourceBlock = getBlockById(state, sourceNode.blockId);

  if (!sourceBlock) {
    showToast("O bloco deste nó não existe mais.", {
      type: "error",
    });

    return;
  }

  const childNodes = getChildNodes(state, sourceNode.id);
  const siblingNodes = getSiblingNodes(state, sourceNode);

  let nodePosition = {
    x: sourceNode.x + NODE_LAYOUT.childGapX,
    y: sourceNode.y + childNodes.length * NODE_LAYOUT.childGapY,
  };

  let parentNodeId = sourceNode.id;
  let edgeFromNodeId = sourceNode.id;

  if (relationship === "sibling") {
    parentNodeId = sourceNode.parentNodeId || null;
    edgeFromNodeId = sourceNode.parentNodeId || null;

    nodePosition = {
      x: sourceNode.x,
      y: sourceNode.y + Math.max(1, siblingNodes.length) * NODE_LAYOUT.siblingGapY,
    };
  }

  const block = createBlock("idea", {
    title: createNodeTitle(sourceBlock, relationship),
    content: "",
    x: nodePosition.x,
    y: nodePosition.y,
  });

  if (!block) {
    showToast("Não foi possível criar o bloco do nó.", {
      type: "error",
    });

    return;
  }

  const node = createMindmapNodeForBlock(block.id, {
    x: nodePosition.x,
    y: nodePosition.y,
    width: DEFAULT_NODE_SIZE.width,
    parentNodeId,
  });

  if (!node) {
    showToast("Não foi possível criar o nó no mapa.", {
      type: "error",
    });

    return;
  }

  if (edgeFromNodeId) {
    createMindmapEdge(edgeFromNodeId, node.id);
  }

  showToast(
    relationship === "child" ? "Nó filho criado." : "Nó irmão criado.",
    {
      type: "success",
    }
  );
}

function rerenderMindmapMode() {
  const boardCanvas = qs("#boardCanvas");
  const state = getState();

  if (!boardCanvas || state.board.activeMode !== "mindmap") {
    return;
  }

  clearElement(boardCanvas);
  renderMindmapMode(boardCanvas, state);
}

function openMindmapLibrary(parentNodeId = null) {
  mindmapLibraryOpen = true;
  mindmapLibraryParentNodeId = parentNodeId;
  mindmapLibraryQuery = "";

  rerenderMindmapMode();

  window.requestAnimationFrame(() => {
    const searchInput = qs("[data-mindmap-library-search]");

    if (searchInput) {
      searchInput.focus();
    }
  });
}

function closeMindmapLibrary() {
  mindmapLibraryOpen = false;
  mindmapLibraryParentNodeId = null;
  mindmapLibraryQuery = "";

  rerenderMindmapMode();
}

function addExistingBlockToMindmap(blockId) {
  const state = getState();

  const block = state.blocks.find((item) => item.id === blockId);

  if (!block) {
    showToast("Este bloco não existe mais no mural.", {
      type: "error",
    });

    return;
  }

  const alreadyExists = state.mindmapNodes.some((node) => {
    return node.blockId === blockId;
  });

  if (alreadyExists) {
    showToast("Este bloco já está neste mapa.", {
      type: "warning",
    });

    return;
  }

  const parentNode = mindmapLibraryParentNodeId
    ? getNodeById(state, mindmapLibraryParentNodeId)
    : null;

  const position = getSuggestedNodePosition(state, parentNode);

  const node = createMindmapNodeForBlock(block.id, {
    x: position.x,
    y: position.y,
    width: DEFAULT_NODE_SIZE.width,
    parentNodeId: parentNode ? parentNode.id : null,
  });

  if (!node) {
    showToast("Não foi possível adicionar este bloco ao mapa.", {
      type: "error",
    });

    return;
  }

  if (parentNode) {
    createMindmapEdge(parentNode.id, node.id);
  }

  mindmapLibraryOpen = false;
  mindmapLibraryParentNodeId = null;
  mindmapLibraryQuery = "";

  selectBlock(block.id);

  showToast("Bloco adicionado ao mapa.", {
    type: "success",
  });
}

function openBlockInFreeBoard(blockId) {
  const state = getState();

  const blockExists = state.blocks.some((block) => {
    return block.id === blockId;
  });

  if (!blockExists) {
    showToast("Este bloco não existe mais no mural.", {
      type: "error",
    });

    return;
  }

  setActiveMode("free");
  selectBlock(blockId);

  window.requestAnimationFrame(() => {
    focusBlockInViewport(blockId);
  });

  showToast("Bloco aberto no mural.", {
    type: "success",
  });
}

function toggleMindmapNodeCollapse(nodeId) {
  const state = getState();
  const node = getNodeById(state, nodeId);

  if (!node) {
    showToast("Não foi possível localizar este nó.", {
      type: "error",
    });

    return;
  }

  const nodeHasChildren = hasChildren(state, node.id);

  if (!nodeHasChildren) {
    showToast("Este nó ainda não possui filhos.", {
      type: "warning",
    });

    return;
  }

  updateMindmapNode(node.id, {
    collapsed: !node.collapsed,
  });

  showToast(node.collapsed ? "Ramo expandido." : "Ramo recolhido.", {
    type: "success",
  });
}

function removeMindmapNode(nodeId) {
  const confirmed = window.confirm(
    "Remover apenas este nó do mapa mental?\n\nO bloco original continuará existindo no mural."
  );

  if (!confirmed) {
    return;
  }

  const result = deleteMindmapNode(nodeId);

  if (!result?.ok) {
    showToast("Não foi possível remover este nó.", {
      type: "error",
    });

    return;
  }

  showToast(
    result.reparentedChildren > 0
      ? `Nó removido. ${result.reparentedChildren} filho(s) subiram um nível.`
      : "Nó removido do mapa.",
    {
      type: "warning",
    }
  );
}

function removeMindmapBranch(nodeId) {
  const confirmed = window.confirm(
    "Remover este ramo inteiro do mapa mental?\n\nIsso remove o nó e todos os descendentes apenas do mapa. Os blocos originais continuarão existindo no mural."
  );

  if (!confirmed) {
    return;
  }

  const result = deleteMindmapBranch(nodeId);

  if (!result?.ok) {
    showToast("Não foi possível remover este ramo.", {
      type: "error",
    });

    return;
  }

  showToast(
    result.deletedNodesCount === 1
      ? "Ramo removido do mapa."
      : `${result.deletedNodesCount} nós removidos do mapa.`,
    {
      type: "warning",
    }
  );
}

function createNewMindmap() {
  const name = window.prompt("Nome do novo mapa mental:", "Novo mapa");

  if (name === null) {
    return;
  }

  const mindmap = createMindmap(name);

  if (!mindmap) {
    showToast("Não foi possível criar o mapa mental.", {
      type: "error",
    });

    return;
  }

  showToast("Mapa mental criado.", {
    type: "success",
  });
}

function renameActiveMindmap() {
  const state = getState();

  if (!state?.activeMindmap) {
    showToast("Nenhum mapa mental ativo para renomear.", {
      type: "warning",
    });

    return;
  }

  const name = window.prompt("Novo nome do mapa mental:", state.activeMindmap.name);

  if (name === null) {
    return;
  }

  const mindmap = renameMindmap(state.activeMindmap.id, name);

  if (!mindmap) {
    showToast("Digite um nome válido.", {
      type: "warning",
    });

    return;
  }

  showToast("Mapa mental renomeado.", {
    type: "success",
  });
}

export function setupMindmapControls() {

  document.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-mindmap-action]");

    if (!actionElement) {
      return;
    }

    const action = actionElement.dataset.mindmapAction;

    if (action === "create-central-node") {
      createCentralNode();
      return;
    }

    if (action === "create-child-node") {
       createMindmapNodeFromSource(actionElement.dataset.nodeId, "child");
       return;
    }

    if (action === "create-sibling-node") {
       createMindmapNodeFromSource(actionElement.dataset.nodeId, "sibling");
       return;
    }

    if (action === "open-block-in-free-board") {
      openBlockInFreeBoard(actionElement.dataset.blockId);
      return;
    }

    if (action === "toggle-collapse-node") {
        toggleMindmapNodeCollapse(actionElement.dataset.nodeId);
        return;
    }

    if (action === "delete-node") {
      removeMindmapNode(actionElement.dataset.nodeId);
      return;
    }
    
    if (action === "delete-branch") {
      removeMindmapBranch(actionElement.dataset.nodeId);
      return;
    }

    if (action === "open-library") {
      openMindmapLibrary();
      return;
    }
    
    if (action === "open-library-for-parent") {
      openMindmapLibrary(actionElement.dataset.nodeId);
      return;
    }
    
    if (action === "close-library") {
      closeMindmapLibrary();
      return;
    }
    
    if (action === "add-existing-block") {
      addExistingBlockToMindmap(actionElement.dataset.blockId);
      return;
    }

    if (action === "create-map") {
      createNewMindmap();
      return;
    }

    if (action === "rename-map") {
      renameActiveMindmap();
    }
  });

  document.addEventListener("change", (event) => {
    const select = event.target.closest("[data-mindmap-action='select-map']");

    if (!select) {
      return;
    }

    setActiveMindmap(select.value);
  });

  document.addEventListener("input", (event) => {
    const searchInput = event.target.closest("[data-mindmap-library-search]");
  
    if (!searchInput) {
      return;
    }
  
    mindmapLibraryQuery = searchInput.value;
  
    rerenderMindmapMode();
  
    window.requestAnimationFrame(() => {
      const nextInput = qs("[data-mindmap-library-search]");
  
      if (!nextInput) {
        return;
      }
  
      nextInput.focus();
  
      nextInput.setSelectionRange(
        nextInput.value.length,
        nextInput.value.length
      );
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !mindmapLibraryOpen) {
      return;
    }
  
    closeMindmapLibrary();
  });

}
