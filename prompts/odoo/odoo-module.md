# Odoo Module — Manifest, Structure, OCA Conventions

You are creating or modifying an Odoo module skeleton.

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect target version from `__manifest__.py` BEFORE any code
- R4: Every new model needs `ir.model.access.csv` + menu/action/view
- R7: OCA conventions — explicit deps, semver, no implicit auto_install

## Your Task
{instruction}

## Required Patterns (Odoo 18)

```python
# __manifest__.py
{
    'name': "Module Display Name",
    'summary': "One-line summary",
    'description': """
        Longer description.
        Multi-line OK.
    """,
    'author': "Alesco Perú, OCA",
    'website': "https://alesco.pe",
    'category': 'Sales/Sales',
    'version': '18.0.1.0.0',      # <odoo_major>.<module_major>.<minor>.<patch>
    'license': 'LGPL-3',          # LGPL-3/AGPL-3 → Community, OEEL-1 → Enterprise
    'depends': [
        'base',
        'mail',
        'product',
        # NEVER add unused deps — they slow install + couple modules
    ],
    'data': [
        'security/security.xml',                 # groups, record rules
        'security/ir.model.access.csv',          # row-level ACL
        'data/sequence_data.xml',
        'data/mail_template_data.xml',
        'views/menus.xml',
        'views/my_model_views.xml',
        'wizards/my_wizard_views.xml',
        'reports/my_report.xml',
    ],
    'demo': [
        'demo/demo.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'my_module/static/src/**/*.js',
            'my_module/static/src/**/*.xml',
            'my_module/static/src/**/*.scss',
        ],
        'web.assets_frontend': [
            'my_module/static/src/portal/*.js',
        ],
    },
    'installable': True,
    'application': False,         # True only for top-level apps (menu in app menu)
    'auto_install': False,        # True ONLY for "glue" modules between two deps
    'pre_init_hook': 'pre_init_hook',
    'post_init_hook': 'post_init_hook',
}
```

```python
# __init__.py
from . import models
from . import controllers
from . import wizards
from . import reports

def pre_init_hook(env):
    """Run before module install — env is available in Odoo 17+."""
    pass

def post_init_hook(env):
    """Run after module install + data loaded."""
    pass
```

## Standard Module Skeleton (OCA)

```
my_module/
├── __init__.py
├── __manifest__.py
├── README.rst                    # OCA standard (oca-gen-addon-readme)
├── readme/
│   ├── DESCRIPTION.rst
│   ├── USAGE.rst
│   ├── ROADMAP.rst
│   ├── CONTRIBUTORS.rst
│   └── CREDITS.rst
├── controllers/
│   ├── __init__.py
│   └── main.py
├── data/
│   ├── sequence_data.xml
│   └── mail_template_data.xml
├── demo/
│   └── demo.xml
├── models/
│   ├── __init__.py
│   └── my_model.py
├── reports/
│   ├── __init__.py                # if AbstractModel reports
│   ├── my_report.xml
│   └── report_template.xml
├── security/
│   ├── security.xml               # res.groups + ir.rule
│   └── ir.model.access.csv        # ACL
├── static/
│   ├── description/
│   │   ├── icon.png               # 256x256
│   │   └── index.html             # for App store
│   └── src/
│       ├── components/
│       ├── js/
│       └── scss/
├── tests/
│   ├── __init__.py
│   └── test_my_model.py
├── views/
│   ├── menus.xml
│   └── my_model_views.xml
└── wizards/
    ├── __init__.py
    ├── my_wizard.py
    └── my_wizard_views.xml
```

## ir.model.access.csv (mandatory)
```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_my_model_user,my.model.user,model_my_model,base.group_user,1,1,1,0
access_my_model_manager,my.model.manager,model_my_model,my_module.group_manager,1,1,1,1
```
No row = NO access. Manager group must inherit user group for hierarchy.

## Versioning (OCA)
Format: `<odoo>.<module_major>.<minor>.<patch>` → `18.0.1.0.0`
- bump **major** for breaking changes / model removal
- bump **minor** for new features
- bump **patch** for fixes
- bump module_major ONLY for full rewrite (rare)

## depends vs auto_install vs application
| Flag | When |
|---|---|
| `depends` | Real runtime dependencies |
| `auto_install: True` | Glue module — installs ONLY if all deps are installed |
| `application: True` | Top-level app — gets its own icon in Apps menu |

## Pitfalls
- Missing `ir.model.access.csv` for a model → "no access" error in UI (silent until clicked)
- `auto_install: True` without all deps satisfied → never installs
- Circular dependency in `depends` → Odoo refuses to load
- Loading views BEFORE models in `data` → field reference errors
- Loading data BEFORE security → access errors during `noupdate` loads
- `pre_init_hook` in Odoo ≤16 took `cr`; Odoo 17+ takes `env`

## Checklist before responding
- [ ] __manifest__.py: version=18.0.x.y.z, license, depends, data, installable
- [ ] License matches edition (LGPL-3 / OEEL-1)
- [ ] security/ir.model.access.csv has a row per model
- [ ] data files ordered: security → data → views → wizards → reports
- [ ] No unused depends
- [ ] auto_install only for genuine glue modules
- [ ] Standard OCA folder layout
- [ ] static/description/icon.png present
- [ ] tests/ folder with at least one TransactionCase
