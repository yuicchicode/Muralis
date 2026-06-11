# UI/UX Guide

## Main principle

Muralis is a visual app. The board should be the center of the experience.

```txt
board first
controls second
primary actions visible
secondary actions on demand
```

## Visual direction

The UI should feel:

- clean;
- modern;
- calm;
- productivity-focused;
- low-noise;
- not overloaded with effects.

Avoid:

- too many gradients;
- heavy shadows;
- too many chips;
- huge toolbars;
- too many visible buttons at once.

## Board-first

In every mode, the board should use as much of the available area as possible.

Filters and secondary actions should live in:

- popovers;
- drawers;
- bottom sheets;
- contextual menus;
- compact docks.

## Desktop

On desktop:

- mode navigation should be clear;
- controls can appear as dock/popover;
- inspector can float;
- board should have generous space.

## Mobile

On mobile:

- filters should not be stacked above the board;
- primary actions can become a FAB/dock;
- panels should become bottom sheets;
- inspector should be easy to close;
- avoid full-page unwanted horizontal overflow.

## Dark mode

Every new component should be tested in dark mode.

## Accessibility

Keep:

- visible focus;
- labels on inputs;
- `aria-label` on icon-only buttons;
- Escape closing panels;
- outside click closing menus;
- adequate contrast.

## Practical rule

If a UI element takes more space than the content, it probably belongs in a menu, drawer, or bottom sheet.
