# Odoo OWL — Frontend Components

You are implementing Odoo OWL components (JavaScript/XML frontend).

## Context
{contextIds}

## Active Rules
- R7: t-out not t-raw (XSS prevention), correct OWL hooks
- R13: t-out not t-raw, no direct DOM manipulation

## Your Task
{instruction}

## OWL 2 Patterns (Odoo 18)

```javascript
/** @odoo-module **/
import { Component, useState, useRef, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class MyWidget extends Component {
    static template = "my_module.MyWidget";
    static props = { record: Object, readonly: { type: Boolean, optional: true } };

    setup() {
        this.orm = useService("orm");
        this.state = useState({ loading: false, data: [] });

        onWillStart(async () => {
            await this._loadData();
        });
    }

    async _loadData() {
        this.state.data = await this.orm.searchRead(
            "res.partner", [], ["name", "email"], { limit: 10 }
        );
    }
}
```

```xml
<!-- my_module/static/src/components/my_widget/my_widget.xml -->
<templates>
    <t t-name="my_module.MyWidget">
        <div class="o_my_widget">
            <t t-foreach="state.data" t-as="item" t-key="item.id">
                <span t-out="item.name"/>  <!-- t-out, never t-raw -->
            </t>
        </div>
    </t>
</templates>
```

## Checklist
- [ ] `/** @odoo-module **/` at top of every JS file
- [ ] `t-out` not `t-raw` for all user-supplied content (R13)
- [ ] `useService('orm')` for RPC, not direct fetch
- [ ] Component registered in __manifest__.py assets
