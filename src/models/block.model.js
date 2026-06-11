import { createId } from "../utils/id.js";

export const BLOCK_COLORS = {
  yellow: {
    label: "Amarelo",
    value: "yellow",
  },

  blue: {
    label: "Azul",
    value: "blue",
  },

  green: {
    label: "Verde",
    value: "green",
  },

  pink: {
    label: "Rosa",
    value: "pink",
  },

  orange: {
    label: "Laranja",
    value: "orange",
  },

  purple: {
    label: "Roxo",
    value: "purple",
  },

  white: {
    label: "Branco",
    value: "white",
  },
};

export const TASK_STATUS = {
  ideas: {
    label: "Ideias",
    value: "ideas",
  },

  todo: {
    label: "A fazer",
    value: "todo",
  },

  doing: {
    label: "Fazendo",
    value: "doing",
  },

  done: {
    label: "Feito",
    value: "done",
  },
};

export const TASK_PRIORITIES = {
  low: {
    label: "Baixa",
    value: "low",
  },

  medium: {
    label: "Média",
    value: "medium",
  },

  high: {
    label: "Alta",
    value: "high",
  },
};

export const BLOCK_TYPES = {
  idea: {
    label: "Ideia",
    icon: "💡",
    defaultTitle: "Nova ideia",
    defaultContent: "Escreva uma ideia solta, hipótese ou possibilidade.",
    defaultColor: "yellow",
    width: 260,
    height: 150,
  },

  task: {
    label: "Tarefa",
    icon: "✓",
    defaultTitle: "Nova tarefa",
    defaultContent: "Descreva uma ação clara para executar.",
    defaultColor: "green",
    width: 280,
    height: 170,
  },

  reference: {
    label: "Referência",
    icon: "📌",
    defaultTitle: "Nova referência",
    defaultContent: "Guarde uma fonte, anotação ou inspiração.",
    defaultColor: "blue",
    width: 280,
    height: 150,
  },

  goal: {
    label: "Meta",
    icon: "🎯",
    defaultTitle: "Nova meta",
    defaultContent: "Defina um objetivo que você quer alcançar.",
    defaultColor: "orange",
    width: 270,
    height: 150,
  },

  quote: {
    label: "Frase",
    icon: "“”",
    defaultTitle: "Nova frase",
    defaultContent: "Uma frase, pensamento ou lembrete importante.",
    defaultColor: "pink",
    width: 280,
    height: 150,
  },

  link: {
    label: "Link",
    icon: "🔗",
    defaultTitle: "Novo link",
    defaultContent: "Adicione uma URL no painel lateral.",
    defaultColor: "purple",
    width: 300,
    height: 170,
  },
};

export function getBlockTypeMeta(type) {
  return BLOCK_TYPES[type] || BLOCK_TYPES.idea;
}

export function getBlockColorMeta(color) {
  return BLOCK_COLORS[color] || BLOCK_COLORS.yellow;
}

export function getTaskStatusMeta(status) {
  return TASK_STATUS[status] || TASK_STATUS.todo;
}

export function getTaskPriorityMeta(priority) {
  return TASK_PRIORITIES[priority] || TASK_PRIORITIES.medium;
}

export function createBlockModel(type = "idea", overrides = {}) {
  const safeType = BLOCK_TYPES[type] ? type : "idea";
  const meta = getBlockTypeMeta(safeType);
  const now = new Date().toISOString();

  return {
    id: createId("block"),
    boardId: "board_main",

    type: safeType,

    title: meta.defaultTitle,
    content: meta.defaultContent,
    color: meta.defaultColor,

    x: 180,
    y: 120,
    width: meta.width,
    height: meta.height,

    status: safeType === "task" ? "todo" : "ideas",
    priority: "medium",
    dueDate: null,

    tags: [],

    effort: 3,
    impact: 3,

    startDate: null,
    endDate: null,

    url: null,
    imageData: null,

    createdAt: now,
    updatedAt: now,

    ...overrides,
  };
}