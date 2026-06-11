# Muralis

**Muralis** is a visual web app for organizing ideas, tasks, references, goals, links, quotes, mind maps, priority matrices, kanbans, and timelines using only the fundamental technologies of the web:

```txt
HTML
CSS
JavaScript
```

No framework.  
No required backend.  
No required build step.  
No external database.  
No heavy dependency stack.

The project exists to test and demonstrate a simple idea:

> It is possible to build a complex, beautiful, and useful software/web app using only the native web platform.

## Why does this project exist?

Modern web development often assumes that any serious app must start with a large toolchain: framework, bundler, external state manager, component library, router, backend, database, authentication, and many layers before the product itself exists.

Muralis was created as an experiment in the opposite direction.

The question is:

> How far can we go with well-organized HTML, CSS, and JavaScript?

The goal is not to reject libraries forever. The goal is to remember that the web is already a powerful platform. Before adding abstractions, it is worth understanding what can be built with the browser's own capabilities.

## Core idea

Muralis is a local-first visual organizer. It lets users create blocks and view the same data through multiple modes:

- **Free Board** — a visual canvas with draggable blocks.
- **Kanban** — tasks organized by stages.
- **Matrix** — prioritization by effort and impact.
- **Mind Map** — visual connections between blocks.
- **Timeline** — time-based view of deadlines, milestones, and creation dates.

All modes share the same foundation: **blocks**.

That means a task created on the board can appear in Kanban, Timeline, and be referenced in a Mind Map. The app tries to avoid content duplication and favors different views over the same data.

## Philosophy

Muralis follows a few principles:

```txt
content first
lightweight interface
local data
controlled complexity
no unnecessary dependencies
no backend when one is not needed
progressive enhancement
simple and direct UX
```

The idea is to create an app that feels like a real product without abandoning technical simplicity.

## Features

### Free Board

- create blocks;
- inline editing;
- drag blocks;
- resize blocks;
- selection;
- side inspector;
- filters by type, search, and tags;
- zoom;
- pan;
- local persistence.

### Kanban

- multiple Kanbans per board;
- customizable stages;
- cards based on real task blocks;
- drag and drop;
- filters by priority, deadline, completion, and sorting;
- quick task creation;
- add existing tasks;
- open task on the board.

### Matrix

- organize blocks by impact and effort;
- quadrants;
- quick creation inside quadrants;
- drag between quadrants;
- filters;
- compact priority view.

### Mind Map

- multiple mind maps per board;
- nodes connected to existing blocks;
- create central node;
- create child node;
- create sibling node;
- add existing block;
- drag nodes;
- collapse and expand branches;
- remove node or entire branch;
- open original block on the board.

### Timeline

- events derived from blocks;
- deadlines;
- milestones;
- creation dates;
- filters;
- sorting;
- quick editing of deadline, status, and priority;
- quick creation of task with deadline;
- quick creation of milestone/goal;
- open item on the board.

### General

- multiple boards;
- dark mode;
- JSON import/export;
- local storage;
- command palette;
- app menu;
- responsive design;
- GitHub Pages compatible.

## Technologies

```txt
HTML5
CSS3
JavaScript Modules
LocalStorage
DOM APIs
Pointer Events
SVG
```

External dependencies should be avoided when possible. When used, they should have a clear reason.

## Running locally

Because the project uses ES Modules, it is recommended to open it through a simple local server.

With Python:

```bash
python -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```

With Node, if preferred:

```bash
npx serve .
```

or:

```bash
npx http-server .
```

No build step is required.

## General structure

```txt
src/
  app/
    state.js

  db/
    storage.js

  models/
    block.model.js
    board.model.js
    kanban.model.js
    mindmap.model.js

  features/
    board/
    blocks/
    import-export/
    shortcuts/

  modes/
    kanban/
    matrix/
    mindmap/
    timeline/

  ui/
    app-menu.js
    command-palette.js
    inspector.js
    modal.js
    toast.js

styles/
  reset.css
  tokens.css
  base.css
  layout.css
  components.css
  board.css
  modes.css
  utilities.css
```

## Documentation

The main documentation lives in `/docs`:

- [`docs/PROJECT_VISION.md`](docs/PROJECT_VISION.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/FEATURES.md`](docs/FEATURES.md)
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md)
- [`docs/UI_UX_GUIDE.md`](docs/UI_UX_GUIDE.md)
- [`docs/LOCAL_STORAGE.md`](docs/LOCAL_STORAGE.md)
- [`docs/IMPORT_EXPORT.md`](docs/IMPORT_EXPORT.md)
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Contributing

Contributions are welcome, but the project has one important rule:

> Before adding a dependency, try solving the problem with native HTML, CSS, and JavaScript.

Read:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)

## Status

Muralis is an experimental project with the ambition of becoming a real product.

It works both as a personal tool and as a study of frontend architecture without a framework.

## License

Choose a license before publishing the project as open source.  
A common suggestion for simple open source projects is MIT.

See `docs/LICENSING.md`.
