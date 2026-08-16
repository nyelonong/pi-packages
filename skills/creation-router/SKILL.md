---
name: creation-router
description: Use when the user asks to create, automate, or extend Pi with a prompt template, skill, extension, slash command, custom tool, or Pi workflow; chooses the smallest appropriate form before implementation.
---

# Creation Router

Use this skill only for Pi customization. Do not use it to classify ordinary application
features, scripts, or project automation that happens not to use Pi.

## Choose the form

| Need | Destination |
| --- | --- |
| A user manually invokes a slash command that expands into reusable text, with optional arguments | Prompt template |
| The agent needs reusable instructions, references, or helper scripts for a recurring task | Skill |
| Pi must intercept input, register a command or custom tool, retain state, react to lifecycle events, alter active tools, or change the TUI | Extension |

Choose the smallest destination that meets the request. A skill may be invoked manually
with `/skill:<name>` but can also load from its description. A prompt template and a skill
do not provide deterministic input interception or runtime state; those requirements need
an extension.

## Route

If the request fits more than one form, ask one focused question only when its answer
changes the destination. Ask whether Pi must change its runtime behavior rather than
asking the user to select an implementation.

After selecting the destination, follow Pi's current documentation and use the matching
scope unless the user states otherwise:

| Destination | Global location | Project location |
| --- | --- | --- |
| Prompt template | `~/.pi/agent/prompts/<name>.md` | `.pi/prompts/<name>.md` |
| Skill | `~/.pi/agent/skills/<name>/SKILL.md` | `.pi/skills/<name>/SKILL.md` |
| Extension | `~/.pi/agent/extensions/<name>.ts` | `.pi/extensions/<name>.ts` |

Default to global only when the request is clearly intended for all projects; otherwise
ask whether the behavior belongs to one project or every project. Confirm the selected
form and scope in the implementation plan before changing files.
