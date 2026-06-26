# Odoo Controller — HTTP Routes & API Endpoints

You are implementing an Odoo HTTP controller (@http.route).

## Context (Odoo)
{contextIds}

## Active Rules
- R1: Detect version from __manifest__.py BEFORE any code
- R7: Odoo 18 syntax, PEP8
- R13: SQL params always, sudo scope minimum, CSRF on POST (csrf=True)

## Your Task
{instruction}

## Required Patterns (Odoo 18)

```python
# controllers/main.py
import json
import logging
from odoo import http, _
from odoo.http import request, Response
from odoo.exceptions import AccessError, UserError

_logger = logging.getLogger(__name__)


class MyController(http.Controller):

    # JSON-RPC endpoint (auth=user, default CSRF off for type=json)
    @http.route('/my_module/api/data', type='json', auth='user', methods=['POST'])
    def get_data(self, partner_id, **kwargs):
        try:
            partner = request.env['res.partner'].browse(partner_id)
            partner.check_access_rights('read')
            partner.check_access_rule('read')
            return {
                'success': True,
                'data': {
                    'name': partner.name,
                    'email': partner.email,
                },
            }
        except AccessError:
            return {'success': False, 'error': 'Access denied'}
        except Exception as e:
            _logger.exception("get_data failed")
            return {'success': False, 'error': str(e)}

    # Public HTTP endpoint (csrf=False ONLY if webhook from trusted source)
    @http.route('/my_module/webhook', type='http', auth='public',
                methods=['POST'], csrf=False)
    def webhook(self, **kwargs):
        # Verify signature BEFORE any DB action
        signature = request.httprequest.headers.get('X-Signature')
        if not self._verify_signature(request.httprequest.data, signature):
            return Response('Unauthorized', status=401)

        payload = json.loads(request.httprequest.data)
        request.env['my.model'].sudo().create({
            'external_ref': payload['id'],
            'data': payload['data'],
        })
        return Response(json.dumps({'ok': True}),
                        content_type='application/json', status=200)

    # Portal-style HTTP route returning QWeb
    @http.route('/my_module/page/<int:record_id>',
                type='http', auth='user', website=True)
    def my_page(self, record_id, **kwargs):
        record = request.env['my.model'].browse(record_id)
        record.check_access_rights('read')
        return request.render('my_module.my_page_template', {
            'record': record,
        })

    def _verify_signature(self, body, signature):
        # HMAC verification — never reveal which step failed
        import hmac, hashlib
        secret = request.env['ir.config_parameter'].sudo().get_param(
            'my_module.webhook_secret')
        if not secret or not signature:
            return False
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
```

## Data Journey (Front → Back)

```
External client / browser
  ↓ HTTP POST /my_module/api/data  (JSON-RPC envelope)
nginx / Odoo workers
  ↓ http.WerkzeugServer → routing
@http.route dispatcher
  ↓ type='json' → unwrap params from {"jsonrpc","method","params"}
  ↓ auth='user' → check session cookie / api_key
Controller method (get_data)
  ↓ check_access_rights + check_access_rule
ORM (res.partner.browse → SELECT)
  ↓ ir.rule applied per record
Response dict → JSON envelope → HTTP 200
```

## Auth Modes
- `auth='user'` — requires logged-in user (session cookie)
- `auth='public'` — anonymous OK, uses public user record
- `auth='none'` — no session at all (use for health checks, webhooks)
- `auth='bearer'` — Bearer token (Odoo 18+)

## CSRF Rules
- `type='json'` → CSRF auto-skipped (uses session token check internally)
- `type='http'` POST → CSRF REQUIRED unless explicitly `csrf=False`
- `csrf=False` only with proper signature verification (HMAC, JWT, OAuth)

## Verify the flow with codegraph
Before declaring done, run:
```
codegraph_trace from="MyController.get_data" to="res.partner"
codegraph_callers "get_data"
```
to confirm the controller wires into ORM as expected and no caller bypasses access rules.

## Common Pitfalls
- Returning a Model recordset from JSON route → not serializable (use `.read()` or dict)
- `request.env.user` is public user in `auth='public'` — use `sudo()` carefully
- Never `eval()` request data
- Never log raw payloads with secrets — sanitize first
- Webhooks: always verify signature BEFORE any side effect
- `request.cr.commit()` is unsafe in HTTP context (transaction managed by framework)

## Checklist before responding
- [ ] __manifest__.py version confirmed
- [ ] Route prefix follows `/<module_name>/...` convention
- [ ] auth/methods/type explicit on every @http.route
- [ ] csrf=False ONLY paired with signature verification
- [ ] check_access_rights + check_access_rule on user-supplied IDs
- [ ] sudo() scope limited to specific ORM call
- [ ] No PII / secrets in _logger.info — only _logger.debug
- [ ] Recordsets serialized via .read() before JSON return
- [ ] Webhook routes verify signature with hmac.compare_digest
