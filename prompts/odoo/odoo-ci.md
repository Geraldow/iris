# Odoo CI — GitHub Actions, pylint-odoo, pytest-odoo

You are configuring or fixing Continuous Integration for an Odoo module.

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect target version from __manifest__.py BEFORE configuring CI
- R7: Lint with pylint-odoo (OCA preset); test with pytest-odoo or odoo-bin --test-enable
- R13: NEVER hardcode secrets in workflow YAML — use GitHub Secrets

## Your Task
{instruction}

## Required Patterns

### .github/workflows/ci.yml
```yaml
name: CI

on:
  push:
    branches: [main, 18.0]
  pull_request:
    branches: [main, 18.0]

jobs:
  test:
    runs-on: ubuntu-22.04
    strategy:
      fail-fast: false
      matrix:
        odoo-version: ['18.0']
        python-version: ['3.11']
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: odoo
          POSTGRES_PASSWORD: odoo
          POSTGRES_DB: odoo
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: pip

      - name: Cache Odoo source
        id: cache-odoo
        uses: actions/cache@v4
        with:
          path: odoo
          key: odoo-${{ matrix.odoo-version }}-${{ runner.os }}

      - name: Clone Odoo
        if: steps.cache-odoo.outputs.cache-hit != 'true'
        run: |
          git clone --depth 1 -b ${{ matrix.odoo-version }} \
            https://github.com/odoo/odoo.git odoo

      - name: Install system deps
        run: |
          sudo apt-get update
          sudo apt-get install -y wkhtmltopdf libldap2-dev libsasl2-dev

      - name: Install Odoo
        run: |
          pip install --upgrade pip wheel
          pip install -r odoo/requirements.txt
          pip install pylint-odoo pre-commit pytest-odoo coverage

      - name: Lint
        run: |
          pre-commit run --all-files
          pylint --rcfile=.pylintrc-odoo ./*/

      - name: Run tests
        env:
          PGHOST: localhost
          PGPORT: 5432
          PGUSER: odoo
          PGPASSWORD: odoo
        run: |
          coverage run --source=. -m pytest_odoo \
            --odoo-config=ci/odoo.cfg \
            -m "post_install" \
            ./*/tests/
          coverage report --fail-under=80
          coverage xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: coverage.xml
          token: ${{ secrets.CODECOV_TOKEN }}
```

### .pre-commit-config.yaml (OCA preset)
```yaml
repos:
  - repo: https://github.com/oca/oca-pre-commit
    rev: v0.0.34
    hooks:
      - id: oca-checks-odoo-module
      - id: oca-checks-po
  - repo: https://github.com/psf/black
    rev: 24.10.0
    hooks:
      - id: black
        args: [--line-length=88]
  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort
  - repo: https://github.com/oca/pylint-odoo
    rev: v9.2.6
    hooks:
      - id: pylint_odoo
        args: ['--rcfile=.pylintrc-odoo']
```

### .pylintrc-odoo
```ini
[MASTER]
load-plugins = pylint_odoo

[MESSAGES CONTROL]
disable = all
enable =
    odoolint,
    api-one-deprecated,
    attribute-deprecated,
    deprecated-odoo-model-method,
    duplicate-id-csv,
    duplicate-xml-fields,
    duplicate-xml-record-id,
    invalid-commit,
    missing-readme,
    no-write-in-compute,
    odoo-addons-relative-import,
    sql-injection,
    translation-required,
    xml-syntax-error

[ODOOLINT]
manifest_required_authors = Alesco Perú, Odoo Community Association (OCA)
manifest_required_keys = license
manifest_deprecated_keys = description
license_allowed = AGPL-3, LGPL-3, OEEL-1
valid_odoo_versions = 18.0
```

### ci/odoo.cfg
```ini
[options]
addons_path = odoo/addons,.
db_host = ${PGHOST}
db_port = ${PGPORT}
db_user = ${PGUSER}
db_password = ${PGPASSWORD}
without_demo = False
log_level = info
log_handler = :INFO,odoo.modules.loading:WARNING
```

## Test invocation styles
| Tool | Command |
|---|---|
| **odoo-bin** | `odoo-bin -d test_db -i my_module --test-enable --stop-after-init --test-tags=/my_module` |
| **pytest-odoo** | `pytest --odoo-config=odoo.cfg -m post_install ./my_module/tests/` |
| **coverage + odoo-bin** | `coverage run --source=. /usr/bin/odoo-bin -d test_db --test-enable --stop-after-init` |

## OCA Quality Gates
- pylint-odoo score: minimum **9.0** (OCA standard)
- Coverage: minimum **80%** on changed lines
- README.rst: generated via `oca-gen-addon-readme` from `readme/*.rst`
- POT files: regenerated and committed
- No `print()` / `pdb` / commented-out code

## Matrix versions (multi-version modules)
```yaml
matrix:
  include:
    - odoo-version: '16.0'
      python-version: '3.10'
    - odoo-version: '17.0'
      python-version: '3.10'
    - odoo-version: '18.0'
      python-version: '3.11'
```
Maintain a branch per Odoo version (`16.0`, `17.0`, `18.0`) — OCA convention.

## Common Pitfalls
- Forgetting `services.postgres` → tests crash on connect
- Caching `pip` but not Odoo source → 30s+ extra per run
- Running `--test-enable` WITHOUT `--stop-after-init` → infinite worker
- `pytest-odoo` requires `--odoo-config` flag (not env vars alone)
- `coverage` must wrap odoo-bin entry, not pytest, when using odoo-bin runner
- Secrets in YAML → leaked in logs forever; use `${{ secrets.NAME }}`

## Checklist before responding
- [ ] __manifest__.py version matches matrix.odoo-version
- [ ] PostgreSQL service declared with health check
- [ ] Odoo source cached between runs
- [ ] pre-commit + pylint-odoo configured
- [ ] Tests run with --test-enable --stop-after-init OR pytest-odoo
- [ ] Coverage threshold ≥ 80%
- [ ] Secrets via GitHub Secrets, never inline
- [ ] Matrix for multi-version maintenance
- [ ] License/author validated by pylint-odoo manifest checks
