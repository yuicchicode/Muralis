import { subscribe } from "./app/state.js";

import {
  renderBoard,
  setupBoardControls,
} from "./features/board/board.render.js";

import { setupBoardViewport } from "./features/board/board.viewport.js";

import { setupBlockCreation } from "./features/blocks/block.create.js";
import { setupBlockSelection } from "./features/blocks/block.render.js";
import { setupBlockDrag } from "./features/blocks/block.drag.js";
import { setupBlockEditing } from "./features/blocks/block.edit.js";
import { setupBlockResize } from "./features/blocks/block.resize.js";
import { setupTaskControls } from "./features/blocks/block.task.js";
import { setupShortcuts } from "./features/shortcuts/shortcuts.js";

import { setupKanbanControls } from "./modes/kanban/kanban.mode.js";
import { setupKanbanDrag } from "./modes/kanban/kanban.drag.js";

import { setupAppMenu } from "./ui/app-menu.js";
import { setupBoards } from "./ui/boards.js";
import { setupCommandPalette } from "./ui/command-palette.js";
import { initTheme } from "./ui/theme.js";
import { setupInspector } from "./ui/inspector.js";
import { setupMatrixDrag } from "./modes/matrix/matrix.drag.js";
import { setupMatrixControls } from "./modes/matrix/matrix.mode.js";
import { setupMindmapControls } from "./modes/mindmap/mindmap.mode.js";
import { setupMindmapDrag } from "./modes/mindmap/mindmap.drag.js";
import { setupTimelineControls } from "./modes/timeline/timeline.mode.js";

function bootstrap() {
  initTheme();

  setupBlockCreation();
  setupBlockSelection();
  setupBlockDrag();
  setupBlockEditing();
  setupBlockResize();
  setupTaskControls();
  setupShortcuts();
  setupBoardControls();
  setupBoardViewport();
  setupKanbanControls();
  setupMatrixControls();
  setupKanbanDrag();
  setupMatrixDrag();
  setupInspector();
  setupCommandPalette();
  setupAppMenu();
  setupBoards();
  setupMindmapControls();
  setupMindmapDrag();
  setupTimelineControls();

  subscribe(renderBoard);

  console.info("Muralis iniciado com sucesso.");
}

document.addEventListener("DOMContentLoaded", bootstrap);
