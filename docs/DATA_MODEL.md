# Data Model

## Main idea

Muralis uses blocks as the central entity.

Modes such as Kanban, Mind Map, and Timeline should prefer referencing existing blocks instead of duplicating content.

## Board

Represents a board.

Common fields:

```txt
id
name
activeMode
viewport
createdAt
updatedAt
```

## Block

Represents a unit of content.

Types:

```txt
idea
task
reference
goal
quote
link
```

Fields:

```txt
id
boardId
type
title
content
tags
x
y
width
height
createdAt
updatedAt
```

Optional fields:

```txt
status
priority
dueDate
impact
effort
```

## Task

Tasks are blocks with `type = "task"`.

Statuses:

```txt
ideas
todo
doing
done
```

Priorities:

```txt
low
medium
high
```

## Kanban

A board can have multiple Kanbans.

Structures:

```txt
kanbans
kanbanStages
kanbanItems
activeKanbanByBoardId
kanbanPreferencesById
```

## Mind Map

A board can have multiple mind maps.

Structures:

```txt
mindmaps
mindmapNodes
mindmapEdges
activeMindmapByBoardId
```

## Timeline

Timeline does not have its own persisted model.

It derives events from:

```txt
block.dueDate
block.createdAt
```

## Golden rule

> Persistent data must be included in both localStorage snapshots and import/export.
