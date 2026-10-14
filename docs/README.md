# Paperpost documentation

Start with the root [README](../README.md) for setup, configuration, API usage, and verification commands. Shared contributor and agent instructions live in [AGENTS.md](../AGENTS.md); [CLAUDE.md](../CLAUDE.md) imports those instructions.

| Document | Purpose |
| --- | --- |
| [Product requirements](product-requirements.md) | Intended product, MVP scope, priorities, and open decisions; not a list of completed features. |
| [Technical requirements](technical-requirements.md) | Current implementation contract and constraints, with additional production requirements identified separately. |
| [Design system](design-system.md) | Paperpost tokens, Mantine integration, styling ownership, and UI verification. |
| [Production readiness](production-readiness.md) | Prioritized implementation checklist, dependencies, and launch gate. |

## Maintenance

Keep detailed documentation in this directory with lowercase kebab-case filenames. Keep one top-level heading per file and use relative links. Add new documents to this index and update incoming links when files move.

Update the current implementation contract when behavior changes. Update the product requirements when product decisions change. Record unfinished launch work in the readiness checklist; a successful local check does not establish deployment readiness.
