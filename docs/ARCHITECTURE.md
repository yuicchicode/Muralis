# Architecture

## Overview

Muralis is a static application organized with JavaScript modules.

The architecture revolves around one idea:

> The central state defines the data; modes are different views of that data.

## Main layers

```txt
index.html
styles/
src/
  app/
  db/
  models/
  features/
  modes/
  ui/
```

## Central state

The main state lives in:

```txt
src/app/state.js
```

It contains:

- boards;
- blocks;
- kanbans;
- Kanban stages;
- Kanban items;
- Kanban preferences;
- mind maps;
- mind map nodes;
- mind map edges;
- selection;
- filters;
- viewport.

The state exposes public mutation functions such as:

```txt
createBlock
updateBlock
removeBlock
setActiveMode
setActiveBoard
createKanban
createMindmap
updateMindmapNode
```

UI code should prefer calling these functions instead of mutating data directly.

## Persistence

Persistence lives in:

```txt
src/db/storage.js
```

The app saves data to `localStorage`.

## Models

Models live in:

```txt
src/models/
```

They create standardized objects:

- `block.model.js`;
- `board.model.js`;
- `kanban.model.js`;
- `mindmap.model.js`.

## Features

The `features` folder contains cross-cutting behavior.

Examples:

```txt
features/board
features/blocks
features/import-export
features/shortcuts
```

## Modes

Each mode represents a specific view.

```txt
src/modes/kanban
src/modes/matrix
src/modes/mindmap
src/modes/timeline
```

Modes should avoid duplicating content when they can reference existing blocks.

## UI

The `ui` folder contains global components and behaviors:

```txt
app-menu
command-palette
inspector
modal
toast
theme
boards
```

## Rendering

Rendering is based on DOM APIs.

The general flow is:

```txt
state changes
notify()
subscribers receive snapshot
renderBoard(state)
active mode renders content
```

## CSS

CSS is organized by responsibility:

```txt
reset.css
tokens.css
base.css
layout.css
components.css
board.css
modes.css
utilities.css
```

## Dark mode

Dark mode uses an attribute on the HTML element:

```txt
html[data-theme="dark"]
```

The preference can be:

```txt
light
dark
system
```

## Architectural principle

> Muralis should grow through composition, not through uncontrolled accumulation.

Each new mode should ask:

1. Can I reuse existing blocks?
2. Do I need a new model?
3. Do I need to persist something?
4. How does this affect import/export?
5. How does it work on mobile?
6. How does it work in dark mode?
