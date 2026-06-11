# Security Policy

Muralis is a local and static app. It has no backend by default and stores data in the user's browser.

Security still matters.

## Scope

Relevant issues include:

- risk of local data loss;
- malformed JSON imports;
- accidental exposure of exported data;
- external links;
- unsafe HTML manipulation;
- vulnerabilities introduced by external dependencies.

## User data

Muralis uses the browser's local storage. This means:

- data stays on the user's device;
- clearing browser data may delete boards;
- another browser will not have the same data;
- another device will not sync automatically;
- exported JSON may contain sensitive content;
- users should take care of backups.

## Reporting issues

When reporting a security issue, include:

```txt
problem description
steps to reproduce
impact
browser/system
affected file or area
suggested fix, if available
```

## Good practices in the project

- avoid `innerHTML` with user data;
- prefer `textContent`;
- validate imported JSON;
- never execute imported content;
- avoid unnecessary external dependencies;
- review any library before adding it.

## Out of scope

Because the project is static and local by default, topics such as authentication, authorization, and server infrastructure are not part of the standard scope.
