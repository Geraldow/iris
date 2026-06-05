---
title: Alesco — Authorized Contributors
domain: governance
version: all
edition: both
source: native
status: active
---

# Alesco — Authorized Contributors

## Contributor Guidelines

### Git Conventions
- **Main Branch:** `18.0` (or the current production version).
- **Development Branches:** `18.0-feature-name` or `18.0-fix-issue-description`.
- **Pull Requests:** Must always target the corresponding version branch.

### Branch Naming
Follow the pattern: `[version]-[type]-[short-description]`
- Example: `18.0-feat-peruvian-detractions`
- Example: `17.0-fix-invoice-rounding`

### Commit Message Format
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat`: A new feature.
- `fix`: A bug fix.
- `docs`: Documentation changes.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Changes to the build process or auxiliary tools and libraries.

**Example:**
`feat(l10n_pe): add support for detraction type 037`

## Authorized Contributors
The following individuals are authorized to contribute to Alesco Perú projects:

| Name | Role | GitHub Username |
| :--- | :--- | :--- |
| **Fabrizzio Hidalgo** | Senior Architect / CTO | `fhidalgo` |
| **Development Team** | (Placeholder) | `alesco-dev` |

## Identity Verification
Every contributor must sign their commits using GPG keys to ensure the integrity and origin of the code. "Co-Authored-By" or AI attribution tags are strictly prohibited in commit messages.
