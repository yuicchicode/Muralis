# LocalStorage

## Overview

Muralis saves data locally in the browser using `localStorage`.

This enables:

- usage without a backend;
- simple operation;
- GitHub Pages compatibility;
- local user control over data.

## Limitations

- clearing browser data may delete the board;
- another browser will not have the same data;
- another device will not sync automatically;
- backups are the user's responsibility.

## Persisted snapshot

The snapshot should contain:

```txt
boards
activeBoardId
blocks
kanbans
kanbanStages
kanbanItems
activeKanbanByBoardId
kanbanPreferencesById
mindmaps
mindmapNodes
mindmapEdges
activeMindmapByBoardId
```

## Good practices

When changing persistence:

1. keep compatibility with old data;
2. create normalization;
3. avoid breaking import/export;
4. test with old localStorage;
5. test empty app state;
6. test JSON import.
