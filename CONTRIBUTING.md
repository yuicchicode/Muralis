# Contributing to Muralis

Thank you for considering contributing to Muralis.

This project has a specific purpose: building a complex visual web app mainly with native web technologies.

Before contributing, please read:

- `docs/PROJECT_VISION.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`

## Contribution principles

Contributions should respect these principles:

```txt
simplicity before abstraction
native HTML, CSS, and JS before libraries
clear UX before extra features
predictable state before magic
accessibility before pure aesthetics
GitHub Pages compatibility
```

## Before opening a change

Ask yourself:

1. Does this improve the user experience?
2. Does this keep the app simple?
3. Does this avoid data duplication?
4. Does this preserve existing modes?
5. Does this work without a backend?
6. Does this work without a build step?
7. Does this really need a dependency?

## Dependencies

Dependencies are not forbidden, but they must be justified.

A dependency should only be added if it:

- solves something that would be hard to maintain manually;
- is small;
- does not require a mandatory build step;
- does not compromise GitHub Pages compatibility;
- does not take over the project's architecture.

## Code style

### JavaScript

- use ES Modules;
- prefer small functions;
- avoid global state outside `state.js`, except local UI state;
- avoid duplicated DOM manipulation;
- use clear names;
- preserve domain separation.

### CSS

- use tokens from `styles/tokens.css`;
- avoid hardcoded colors;
- avoid excessive shadows and gradients;
- respect light/dark mode;
- keep responsive behavior in mind;
- avoid aggressive global rules.

### HTML

- use semantic structure where possible;
- keep `aria` attributes for important interactions;
- ensure basic keyboard navigation.

## Contribution checklist

Before considering a change complete:

- [ ] The app opens without console errors.
- [ ] Free Board works.
- [ ] Kanban works.
- [ ] Matrix works.
- [ ] Mind Map works.
- [ ] Timeline works.
- [ ] Dark mode remains readable.
- [ ] LocalStorage still works.
- [ ] JSON import/export still works.
- [ ] Mobile layout is not broken.
- [ ] No unnecessary dependency was added.

## Good areas for contribution

- accessibility;
- responsiveness;
- UX improvements;
- documentation;
- manual testing;
- import/export;
- canvas performance;
- CSS organization;
- dark mode improvements;
- new views based on existing blocks.

## What to avoid

Avoid:

- rewriting the project in a framework;
- adding a mandatory build step;
- adding a backend without discussion;
- breaking the data model;
- creating views that duplicate content;
- adding overly heavy UI;
- hiding essential features;
- changing too many areas at once without need.

## Proposing large changes

For large changes, describe:

```txt
problem
motivation
affected files
UX impact
data model impact
regression risk
manual test plan
```

## Project tone

Muralis is a technical experiment, but it should be treated like a product.

The best contribution is not just “more code”, but a real improvement in the experience of organizing ideas.
