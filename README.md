# Pi packages

A small toolkit for people who use [Pi](https://pi.dev) to make decisions, explore code, and keep engineering work grounded in evidence.

It includes two extensions, practical workflow skills, and a few prompt shortcuts. Install the parts you want; Pi lets you enable or disable individual resources after installation.

## What you get

### Make a decision when it matters

`ask_decision` turns a blocking question into a small set of concrete options, with a recommendation. It is useful when an agent has reached a genuine product, scope, or technical choice and should not guess.

`council` is for the opposite case: you have a consequential design question and want several OpenRouter models to challenge the direction before you commit. It runs only in Pi's terminal interface and asks for confirmation before spending provider credits.

### Give your agent a better working rhythm

The workflow skills cover the normal engineering loop:

- `investigate` finds the cause before proposing a fix.
- `shape` turns an idea into an approved specification.
- `implement` chooses test-first work when the change needs protection.
- `verify` gathers fresh evidence before claiming completion.
- `go-engineering` provides a compact Go baseline for design, correctness, and validation.
- `route` picks the least process that covers a request, from a straight answer to the full loop.
- `domain-language` keeps the project's shared vocabulary in a one-line-per-term CONTEXT.md.
- `plan` decomposes an approved spec into ordered, testable tasks that survive a session break.

The package also includes skills for choosing the right Pi customization form and making Go calls to upstream services more resilient.

### Useful shortcuts

- `/feature-journey <scenario>` explains a feature's flow, states, and participants from the code.
- `/task-boundary [context]` resets the task after scope or branch changes.
- `/retry` retries a confirmed read-only transient failure once.
- `/repo-fit <owner/repo> [criteria]` helps evaluate an open-source repository before adoption.

## Install

Releases are the supported way to install this package. Choose a tag from the [releases page](https://github.com/nyelonong/pi-packages/releases), replace `RELEASE_TAG`, then install it for your user account:

```sh
pi install git:github.com/nyelonong/pi-packages@RELEASE_TAG
```

Or add the same release to one trusted project:

```sh
pi install -l git:github.com/nyelonong/pi-packages@RELEASE_TAG
```

Before the first release, use a local checkout for development:

```sh
pi install /absolute/path/to/pi-packages
```

If Pi reports that an extension name already exists, remove or disable the older copy before loading this package.

## A note about Council

Council sends up to 12,000 characters from the current Pi conversation to OpenRouter to make a concise brief, then sends that brief to the configured models. Do not use it for conversations you would not share with that provider. Configure it with `/council-settings`, then start one with `/council your question`.

## First try

After installing, open a new Pi session and try:

```text
/feature-journey sign-in flow
```

Or ask the agent to resolve a real decision. You should see `ask_decision` among the available tools.

## Safety

Read the release you install. Pi extensions execute code, and skills can direct an agent to use tools. This package does not make implicit remote writes; `/retry` deliberately refuses to repeat a potentially mutating operation.
