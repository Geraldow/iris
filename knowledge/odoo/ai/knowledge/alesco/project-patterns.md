---
title: Alesco — Project Patterns
domain: governance
version: all
edition: both
source: native
status: active
---

# Alesco — Project Patterns

## Peruvian Localization (l10n_pe)
Alesco projects strictly follow the Peruvian localization standards, extending the official `l10n_pe` modules to meet specific business requirements.

### Extension Pattern
Instead of modifying core localization modules, we use the `alesco_l10n_pe` base module to house common customizations:
- **Taxes:** Automated calculation of Detractions and Retentions.
- **Documents:** Custom QWeb templates for Invoices, Credit Notes, and Delivery Guide (Guía de Remisión).
- **Validation:** Enhanced RUC/DNI validation via external API integrations.

## Multi-Company Configuration
Most Alesco clients operate in a multi-company environment.
- **Shared Partners:** Standardized configuration to share contacts while maintaining financial isolation.
- **Inter-Company Rules:** Automated creation of internal sales/purchases between related companies.

## Company-Specific Customizations
We utilize a "Core + Vertical" approach:
1. **Core:** Common logic across all Peruvian clients (in `alesco_base`).
2. **Vertical:** Industry-specific logic (e.g., `alesco_logistics` for AECA).
3. **Client-specific:** Minimal modules for branding and specific UI tweaks.

## Performance Patterns
- **Computed Fields:** Always prefer `store=True` for fields used in searches or reports, but carefully manage dependencies to avoid excessive recomputations.
- **Batch Processing:** Use `env.cr.copy_from` or `SQL()` builder for high-volume data imports to bypass the ORM overhead when necessary.
