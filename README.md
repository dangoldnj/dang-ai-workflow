# README.md

# dang-ai-workflow

Structured workflows for AI-assisted software engineering.

Created by Daniel Goldshlack
daniel@goldshlack.net
Initial version: 2026-05-15

A structured AI-assisted engineering workflow for transforming ambiguous ideas into validated implementations through staged reasoning, planning, execution, and verification.

This repository contains a modular workflow system designed for use with modern coding agents such as Claude Code, Cursor, Codex, ChatGPT, and related AI-assisted development environments.

The core philosophy is simple:

- Separate thinking stages explicitly
- Preserve reasoning artifacts
- Reduce hidden assumptions
- Improve reproducibility
- Enable cross-thread continuity
- Make agent collaboration inspectable
- Treat workflows as first-class engineering primitives

## Core Concepts

The workflow is intentionally staged.

Typical progression:

    Clarify
      ↓
    Research
      ↓
    Structure / Break Down
      ↓
    Plan
      ↓
    Prepare
      ↓
    Implement
      ↓
    Verify

Each stage produces explicit artifacts that become inputs to later stages.

The workflow is designed to:
- Reduce hallucinated implementation drift
- Preserve architectural intent
- Improve long-running agent continuity
- Enable resumable execution
- Support human oversight without micromanagement
- Scale from solo development to multi-agent orchestration

## Design Principles

### Explicit State Over Implicit Context

Important decisions should exist in artifacts, not only inside transient model context windows.

### Workflow As Infrastructure

The workflow itself is treated as a system deserving:
- invariants
- validation
- evolution
- tooling
- observability

### Human-Guided Agentic Development

The workflow is not intended to replace human judgment.

Instead, it creates a structured collaboration layer between:
- humans
- AI agents
- implementation artifacts
- validation systems

### Artifact-Centric Operation

Plans, research, execution notes, verification results, and implementation progress are all durable artifacts.

This enables:
- replayability
- auditing
- branch experimentation
- long-horizon continuity

## Intended Usage

This repository is primarily intended for:

- Software engineering workflows
- AI-assisted development
- Long-running implementation efforts
- Multi-threaded AI collaboration
- Research-to-implementation pipelines
- Architecture-heavy systems work
- Agent orchestration experimentation

## Repository Status

This project is exploratory and evolving.

Patterns, conventions, and structure may change significantly over time as the workflow matures through real-world usage.

## Philosophy

Large language models are powerful amplifiers, but raw generation alone is insufficient for reliable engineering.

Reliable outcomes require:
- staged reasoning
- constraint preservation
- explicit verification
- durable context
- architectural continuity

This repository explores what happens when those concerns are treated as core system design problems instead of prompt engineering afterthoughts.

## License

This work is licensed under the Creative Commons Attribution 4.0 International License.

See the `LICENSE` file for details.
