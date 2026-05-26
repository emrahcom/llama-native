# Tasks format

Conventions for entries in the root `TASKS.md` file.

## Task heading

Each task uses the form:

```
## T-NNN: Short title

Definition.
```

## Completion

After completing a task, append below its definition:

```
status: done

- change 1
- change 2

findings:
- observation 1
- observation 2
```

The `findings:` section is optional. Use it for observations made during the
task that were out of scope: bugs noticed, improvements suggested, missing
pieces, anything worth recording without implementing.
