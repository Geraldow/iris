---
title: Alesco — Development Rules
domain: governance
version: all
edition: both
source: native
status: active
---

# Alesco — Development Rules

## Spec-Driven Development (SDD)
- **Mandatory:** For any task considered moderate or complex, SDD must be followed.
- **Process:** Proposal -> Specs -> Design -> Tasks -> Implementation -> Verification.
- **Persistence:** SDD artifacts must be saved in the `openspec` or `engram` backends as per project configuration.

## Commit and Branch Rules
- **No AI Attribution:** Never add "Co-Authored-By" or any AI-related attribution to commits.
- **Identity Verification:** Commits must reflect the real identity of the authorized developer.
- **Branch Safety:** Direct pushes to main branches (`14.0`, `15.0`, ..., `18.0`) are forbidden. All changes must go through a Pull Request.

## Code Standards
- **OCA Compliance:** All code must adhere to [OCA (Odoo Community Association)](https://odoo-community.org/page/development-guidelines) standards.
- **Linters:** Use `pre-commit` hooks with `pylint-odoo` and `flake8`.
- **Naming:** Follow Odoo's standard naming conventions for files, models, and fields (e.g., `res_partner.py`, `ir.actions.server`).

## Documentation
- **Memory Files:** Use `MEMORY.md` to index significant project-specific knowledge.
- **Docstrings:** All public methods and complex logic must be documented using the Google Python Style Guide for docstrings.

## Testing
- **TDD:** Write tests before or alongside implementation.
- **Coverage:** Aim for at least 80% coverage on business logic. Use `TransactionCase` for backend and `HttpCase` for frontend/tours.
