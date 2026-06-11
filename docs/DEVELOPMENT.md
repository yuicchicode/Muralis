# Development

## Running locally

Use a simple local server.

With Python:

```bash
python -m http.server 8000
```

Open:

```txt
http://localhost:8000
```

## No required build step

The project should continue working without a build step.

Avoid introducing tools that become mandatory to run the app.

## Recommended change flow

1. Understand the affected mode.
2. Check required state.
3. Check persistence.
4. Update render.
5. Update CSS.
6. Test dark mode.
7. Test mobile.
8. Test import/export if data changed.

## Debugging

Use the browser console.

Common problems:

- broken function import/export;
- variable used before initialization;
- duplicated listeners;
- CSS conflicts due to order;
- `hidden` and `display` conflicting;
- local UI state lost after render.

## Quick manual checklist

After changes:

```txt
Free Board opens?
Kanban opens?
Matrix opens?
Mind Map opens?
Timeline opens?
Dark mode OK?
Mobile OK?
No console errors?
Reload keeps data?
Import/export OK?
```
