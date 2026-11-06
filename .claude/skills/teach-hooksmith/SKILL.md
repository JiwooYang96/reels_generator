---
name: teach-hooksmith
description: One-time setup for Hooksmith. Use when the user wants to install, configure, teach, onboard, or set up Hooksmith for their niche, creator account, Instagram Reels, TikToks, Shorts, hooks, voice, proof, CTAs, or content formats. Gathers creator context, writes HOOKS.md, then routes future work to hooksmith.
user-invocable: true
version: 0.2.0
---

# Teach Hooksmith

Gather creator context, write `HOOKS.md`, and route future hook work to `hooksmith`.

## Workflow

1. Explore existing notes, docs, examples, or content files if available.
2. Ask only for context that cannot be inferred.
3. Write `HOOKS.md` using the template in the `hooksmith` skill's Init Flow section (installed beside this skill at `../hooksmith/SKILL.md`). Do not invent a different structure.
4. Tell the user to use `hooksmith generate`, `hooksmith audit`, `hooksmith identity`, or `hooksmith rewrite`.

## Required Context

Capture:

- creator name or handle, if provided
- niche
- target viewer
- viewer pain and desire
- proof allowed
- voice style
- formats
- CTA style
- forbidden claims
- hooks they like, if available

If the user gives enough context in one message, do not over-interview. Write the file.

## Questions

Ask these in a compact way when needed:

```text
To set up Hooksmith properly, I need:

1. What niche are you making Reels for?
2. Who is the exact viewer?
3. What can you truthfully prove right now?
4. What should the hooks sound like?
5. What claims should Hooksmith never make?
```

## Completion Message

After writing `HOOKS.md`, say:

```text
Hooksmith is set up. Use `hooksmith generate` for new hook systems, `hooksmith audit` for weak openings, or `hooksmith identity` for viewer-first openings.
```
