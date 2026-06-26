# Odoo Test — Unit, Integration & HTTP

You are implementing Odoo automated tests (TransactionCase / HttpCase / @tagged).

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R7: Odoo 18 — no DB mocks (use real DB), tags discriminate slow tests
- R10: Verify exact API signatures in source before asserting

## Your Task
{instruction}

## Required Patterns (Odoo 18)

```python
# tests/test_my_model.py
from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError, AccessError


@tagged('post_install', '-at_install')  # run after install, not at install
class TestMyModel(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.partner = cls.env['res.partner'].create({
            'name': 'Test Customer',
            'email': 'test@example.com',
        })
        cls.product = cls.env['product.product'].create({
            'name': 'Test Product',
            'type': 'consu',
            'list_price': 100.0,
        })

    def setUp(self):
        super().setUp()
        # Per-test fixtures (savepoint rolled back)

    def test_create_default_state(self):
        record = self.env['my.model'].create({
            'name': 'Order 1',
            'partner_id': self.partner.id,
        })
        self.assertEqual(record.state, 'draft')
        self.assertEqual(record.partner_id, self.partner)

    def test_action_confirm_sets_state(self):
        record = self.env['my.model'].create({
            'name': 'Order 2',
            'partner_id': self.partner.id,
        })
        record.action_confirm()
        self.assertEqual(record.state, 'confirmed')

    def test_constrains_blocks_invalid(self):
        with self.assertRaises(UserError):
            self.env['my.model'].create({
                'name': 'Bad',
                'partner_id': self.partner.id,
                'amount_total': -100,
            })

    def test_access_rule_blocks_other_user(self):
        other = self.env['res.users'].create({
            'name': 'Other', 'login': 'other_user',
            'groups_id': [(6, 0, [self.env.ref('base.group_user').id])],
        })
        record = self.env['my.model'].create({
            'name': 'Owned',
            'partner_id': self.partner.id,
            'user_id': self.env.user.id,
        })
        with self.assertRaises(AccessError):
            record.with_user(other).read(['name'])

    def test_query_count_bounded(self):
        # Detect N+1 regressions
        records = self.env['my.model'].create([
            {'name': f'O{i}', 'partner_id': self.partner.id}
            for i in range(50)
        ])
        with self.assertQueryCount(__system__=10):  # adjust threshold
            for r in records:
                _ = r.display_name
```

```python
# tests/test_my_controller.py
from odoo.tests import HttpCase, tagged
import json


@tagged('post_install', '-at_install')
class TestMyController(HttpCase):

    def setUp(self):
        super().setUp()
        self.user = self.env['res.users'].create({
            'name': 'API User',
            'login': 'api_user',
            'password': 'secret',
            'groups_id': [(6, 0, [self.env.ref('base.group_user').id])],
        })

    def test_json_endpoint(self):
        # Authenticate session
        self.authenticate('api_user', 'secret')
        result = self.url_open(
            '/my_module/api/data',
            data=json.dumps({
                'jsonrpc': '2.0',
                'method': 'call',
                'params': {'partner_id': self.env.user.partner_id.id},
            }),
            headers={'Content-Type': 'application/json'},
        )
        self.assertEqual(result.status_code, 200)
        body = result.json()
        self.assertTrue(body['result']['success'])

    def test_tour_my_flow(self):
        # Browser tour test
        self.start_tour('/web', 'my_module.tour_my_flow',
                        login='api_user')
```

## Test Classes
| Class | Purpose | DB |
|---|---|---|
| `TransactionCase` | Standard tests — rollback after test | Real |
| `SavepointCase` | (Odoo ≤16) — replaced by TransactionCase setUpClass | Real |
| `HttpCase` | HTTP requests, tours, browser via Chromium | Real |
| `SingleTransactionCase` | All tests in ONE transaction (use sparingly) | Real |
| `BaseCase` | Lowest-level — manual setup | Real |

## @tagged Conventions
- `post_install` → run after all modules installed
- `at_install` → run during module install (default — usually slower)
- `-at_install` → skip at-install run
- `standard` → default suite
- `slow` → marked slow, excluded by default
- `nightly` → only in nightly CI
- Custom tags filter: `odoo-bin --test-tags=post_install,my_module`

## Run Tests
```bash
# Single module
odoo-bin -d test_db -u my_module --test-enable --stop-after-init \
         --test-tags=/my_module

# Specific class
odoo-bin -d test_db --test-enable --stop-after-init \
         --test-tags=/my_module:TestMyModel

# Single test method
odoo-bin -d test_db --test-enable --stop-after-init \
         --test-tags=/my_module:TestMyModel.test_action_confirm_sets_state
```

## NO DB Mocks
Odoo philosophy: tests run against a real PostgreSQL with rollback isolation.
Reason: ORM behavior (cache, recompute, constraints, ir.rule) cannot be mocked
faithfully — mocked tests pass while production migrations break.

If you need to fake an external API → mock `requests.post` etc., NOT the ORM.

## Common Pitfalls
- `setUpClass` runs once per class — heavy fixtures here
- `setUp` runs per test — only per-test variants
- `with_user(other)` instead of `sudo()` to test access rules
- `self.cr.commit()` is FORBIDDEN in TransactionCase (breaks rollback)
- HttpCase: `authenticate()` BEFORE `url_open` for auth='user' routes
- Tours run in headless Chromium — requires `odoo[test]` extras

## Checklist before responding
- [ ] __manifest__.py version confirmed
- [ ] @tagged('post_install', '-at_install') for integration tests
- [ ] TransactionCase (not SavepointCase) — Odoo 18
- [ ] setUpClass for shared fixtures, setUp for per-test
- [ ] No DB mocks — real records via cls.env[...].create()
- [ ] with_user() for access rule testing
- [ ] assertQueryCount() on hot paths to catch N+1
- [ ] HttpCase.authenticate() before url_open on auth='user'
- [ ] No self.cr.commit() inside test methods
