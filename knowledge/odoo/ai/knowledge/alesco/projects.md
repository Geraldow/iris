---
title: Alesco — Projects in Scope
domain: governance
version: all
edition: both
source: native
status: active
---

# Alesco — Projects in Scope

## Active Projects

### 1. AECA (Asociación de Empresas de Correo del Perú)
- **Description:** Management system for postal and courier companies.
- **Modules:** `alesco_aeca`, `l10n_pe_aeca`.
- **Notes:** Focus on high-volume logistics and SUNAT integration for courier services.

### 2. Intiflow
- **Description:** Industrial automation and workflow management.
- **Modules:** `alesco_intiflow`, `mrp_intiflow`.
- **Notes:** Heavy usage of MRP and custom IoT integrations.

### 3. Conservial
- **Description:** Infrastructure and road maintenance management.
- **Modules:** `alesco_conservial`, `project_conservial`.
- **Notes:** Specialized in project costing and field service operations.

### 4. Benest
- **Description:** Health and wellness services platform.
- **Modules:** `alesco_benest`, `subscription_benest`.
- **Notes:** Recurring billing and patient management.

### 5. Omnia
- **Description:** Multi-industry commercial platform.
- **Modules:** `alesco_omnia`, `sale_omnia`.
- **Notes:** Generic core with multiple vertical extensions.

### 6. GPrinter
- **Description:** Specialized printing services and hardware management.
- **Modules:** `alesco_gprinter`, `stock_gprinter`.
- **Notes:** Inventory management for serialized hardware and print job tracking.

## Repository Structure
All projects follow a standardized repository structure:
- `/src/custom-modules`: Project-specific Odoo modules.
- `/src/oca`: Verified OCA modules.
- `/scripts`: Deployment and maintenance scripts.
- `/config`: Odoo configuration files per environment.
