# Alesco Perú — Brand Color Palette

This file OVERRIDES `color-palette.md` for all iris-generated diagrams.
When SKILL.md instructs to read `references/color-palette.md`, read THIS file instead.

---

## Shape Colors (Semantic — Alesco Brand)

| Semantic Purpose | Fill | Stroke |
|------------------|------|--------|
| Primary/Neutral | `#5B87C5` | `#1E3A5F` |
| Secondary | `#7FA8D8` | `#1E3A5F` |
| Tertiary | `#A8C4E8` | `#1E3A5F` |
| Alesco Accent | `#F5A06A` | `#E8732A` |
| Start/Trigger | `#FDE8D4` | `#E8732A` |
| End/Success | `#A8E6C3` | `#27AE60` |
| Warning | `#FDE8A8` | `#F39C12` |
| Decision | `#FEF3C7` | `#E8732A` |
| Odoo/ORM | `#D4C0D6` | `#875A7B` |
| Inactive/Disabled | `#DBEAFE` | `#1E3A5F` (dashed) |
| Error | `#FECACA` | `#E74C3C` |

**Rule**: Always pair a darker stroke with a lighter fill. Alesco navy (#1E3A5F) is the universal border color for neutral elements.

---

## Text Colors (Hierarchy)

| Level | Color | Use For |
|-------|-------|---------|
| Title | `#1E3A5F` | Section headings — Alesco navy |
| Subtitle | `#E8732A` | Subheadings, module names — Alesco orange |
| Body/Detail | `#4A5568` | Descriptions, annotations, metadata |
| On light fills | `#1E3A5F` | Text inside light-colored shapes |
| On dark fills | `#FFFFFF` | Text inside dark-colored shapes |
| Odoo label | `#875A7B` | ORM models, XML IDs, Odoo-specific references |

---

## Evidence Artifact Colors

| Artifact | Background | Text Color |
|----------|-----------|------------|
| Code snippet (Python/JS) | `#1A252F` | `#E8732A` (Alesco orange) |
| XML/QWeb | `#1A252F` | `#875A7B` (Odoo purple) |
| JSON/data example | `#1A252F` | `#27AE60` (green) |
| SQL query | `#1A252F` | `#F39C12` (amber) |

---

## Default Stroke & Line Colors

| Element | Color |
|---------|-------|
| Arrows | Stroke color of the source element's semantic purpose |
| Structural lines (dividers, ERD connectors) | `#1E3A5F` (Alesco navy) |
| ORM relationship lines | `#875A7B` (Odoo purple) |
| Marker dots | `#E8732A` (Alesco orange fill + stroke) |

---

## Background

| Property | Value |
|----------|-------|
| Canvas background | `#FFFFFF` |
| Section background (subtle) | `#F8FAFC` |

---

## Alesco Brand Reference

| Brand Token | Hex | Usage |
|-------------|-----|-------|
| Alesco Navy | `#1E3A5F` | Primary, borders, titles |
| Alesco Orange | `#E8732A` | Accent, highlights, arrows |
| Odoo Purple | `#875A7B` | ORM, models, Odoo-specific |
| Success Green | `#27AE60` | End states, success indicators |
| Warning Amber | `#F39C12` | Warnings, decision nodes |
| Error Red | `#E74C3C` | Errors, blocked states |
| Evidence Dark | `#1A252F` | Code/SQL/XML artifact backgrounds |
