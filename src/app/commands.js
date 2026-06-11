import {
  clearSelection,
  createBlock,
  createBoard,
  duplicateSelectedBlocks,
  getState,
  renameBoard,
} from "./state.js";

import { exportBoardAsJson } from "../features/import-export/export-json.js";
import { importBoardFromJson } from "../features/import-export/import-json.js";
import { getBlockTypeMeta } from "../models/block.model.js";
import { showToast } from "../ui/toast.js";
import { openTextPrompt } from "../ui/modal.js";

function createBlockCommand(type) {
  const block = createBlock(type);
  const meta = getBlockTypeMeta(block.type);

  showToast(`${meta.label} criado pela Command Palette.`, {
    type: "success",
  });
}

function duplicateSelectionCommand() {
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

async function createBoardCommand() {
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

async function renameBoardCommand() {
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

  const board = renameBoard(state.activeBoardId, nextName);

  if (!board) {
    showToast("Digite um nome válido para o mural.", {
      type: "warning",
    });

    return;
  }

  showToast(`Mural renomeado para "${board.name}".`, {
    type: "success",
  });
}

function clickAction(action) {
  const button = document.querySelector(`[data-action="${action}"]`);

  if (!button) {
    showToast("Esse comando ainda não está disponível.", {
      type: "warning",
    });

    return;
  }

  button.click();
}

export function getCommands() {
  return [
    {
      id: "create-idea",
      title: "Criar ideia",
      description: "Adiciona um novo bloco de ideia ao mural.",
      shortcut: "N",
      group: "Criação",
      keywords: ["ideia", "novo", "post-it", "bloco"],
      run: () => createBlockCommand("idea"),
    },

    {
      id: "create-task",
      title: "Criar tarefa",
      description: "Adiciona uma nova tarefa ao mural.",
      shortcut: "T",
      group: "Criação",
      keywords: ["tarefa", "todo", "fazer", "kanban"],
      run: () => createBlockCommand("task"),
    },

    {
      id: "create-link",
      title: "Criar link",
      description: "Adiciona um novo bloco de link.",
      shortcut: "L",
      group: "Criação",
      keywords: ["link", "url", "site", "referencia"],
      run: () => createBlockCommand("link"),
    },

    {
      id: "create-reference",
      title: "Criar referência",
      description: "Adiciona uma referência ou anotação.",
      shortcut: "",
      group: "Criação",
      keywords: ["referencia", "fonte", "anotacao"],
      run: () => createBlockCommand("reference"),
    },

    {
      id: "create-goal",
      title: "Criar meta",
      description: "Adiciona um objetivo ao mural.",
      shortcut: "",
      group: "Criação",
      keywords: ["meta", "objetivo", "goal"],
      run: () => createBlockCommand("goal"),
    },

    {
      id: "create-quote",
      title: "Criar frase",
      description: "Adiciona uma frase ou pensamento solto.",
      shortcut: "",
      group: "Criação",
      keywords: ["frase", "quote", "pensamento"],
      run: () => createBlockCommand("quote"),
    },

    {
      id: "duplicate-selection",
      title: "Duplicar selecionado",
      description: "Duplica o bloco ou os blocos selecionados.",
      shortcut: "Ctrl/Cmd D",
      group: "Edição",
      keywords: ["duplicar", "copiar", "clone"],
      run: duplicateSelectionCommand,
    },

    {
      id: "clear-selection",
      title: "Limpar seleção",
      description: "Remove a seleção atual do mural.",
      shortcut: "Esc",
      group: "Edição",
      keywords: ["limpar", "selecao", "desmarcar"],
      run: () => clearSelection(),
    },

    {
      id: "export-json",
      title: "Exportar mural",
      description: "Baixa um arquivo JSON com os dados do mural.",
      shortcut: "",
      group: "Arquivo",
      keywords: ["exportar", "json", "backup", "baixar"],
      run: () => exportBoardAsJson(),
    },

    {
      id: "import-json",
      title: "Importar mural",
      description: "Importa um arquivo JSON e substitui o mural atual.",
      shortcut: "",
      group: "Arquivo",
      keywords: ["importar", "json", "backup", "carregar"],
      run: () => importBoardFromJson(),
    },

    {
      id: "zoom-in",
      title: "Aproximar zoom",
      description: "Aumenta o zoom do canvas.",
      shortcut: "Ctrl/Cmd +",
      group: "Visualização",
      keywords: ["zoom", "aproximar", "aumentar"],
      run: () => clickAction("zoom-in"),
    },

    {
      id: "zoom-out",
      title: "Afastar zoom",
      description: "Diminui o zoom do canvas.",
      shortcut: "Ctrl/Cmd -",
      group: "Visualização",
      keywords: ["zoom", "afastar", "diminuir"],
      run: () => clickAction("zoom-out"),
    },

    {
      id: "reset-zoom",
      title: "Resetar zoom",
      description: "Volta o zoom para 100%.",
      shortcut: "Ctrl/Cmd 0",
      group: "Visualização",
      keywords: ["zoom", "resetar", "100"],
      run: () => clickAction("reset-zoom"),
    },

    {
      id: "center-view",
      title: "Centralizar mural",
      description: "Centraliza a visão nos blocos existentes.",
      shortcut: "",
      group: "Visualização",
      keywords: ["centralizar", "mural", "canvas", "visao"],
      run: () => clickAction("center-view"),
    },

    {
      id: "create-board",
      title: "Criar novo mural",
      description: "Cria um novo mural vazio e muda para ele.",
      shortcut: "",
      group: "Mural",
      keywords: ["mural", "novo", "board", "criar"],
      run: createBoardCommand,
    },

    {
      id: "rename-board",
      title: "Renomear mural atual",
      description: "Altera o nome do mural aberto.",
      shortcut: "",
      group: "Mural",
      keywords: ["mural", "renomear", "nome", "titulo"],
      run: renameBoardCommand,
    },
  ];
}