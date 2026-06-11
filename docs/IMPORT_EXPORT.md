# Import and Export

## Goal

Muralis can export and import boards as JSON.

This is useful for:

- backup;
- manual transport;
- testing;
- recovery;
- sharing.

## Principle

Export should contain everything needed to rebuild the current board.

## Security

Exported JSON may contain sensitive information.

Examples:

- personal ideas;
- tasks;
- private links;
- notes;
- goals;
- references.

Users should treat exported files as private data.

## Tests

When changing import/export, test:

1. export empty board;
2. export board with blocks;
3. export with Kanban;
4. export with Mind Map;
5. import into clean app;
6. import over existing board;
7. reload page after import.
