# Odoo Security — ACL & Record Rules

You are implementing Odoo security (access control, record rules).

## Context
{contextIds}

## Active Rules
- R4: ACL mandatory for every new models.Model
- R13: SQL params always, sudo scope minimum, auth explicit in controllers

## Your Task
{instruction}

## Required Files

### ir.model.access.csv (R4 — MANDATORY for every new model)
```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_my_model_user,my.model user,model_my_model,base.group_user,1,1,1,0
access_my_model_manager,my.model manager,model_my_model,base.group_system,1,1,1,1
```

### ir.rule (record-level security)
```xml
<record id="rule_my_model_own" model="ir.rule">
    <field name="name">My Model: own records</field>
    <field name="model_id" ref="model_my_model"/>
    <field name="domain_force">[('create_uid','=',user.id)]</field>
    <field name="groups" eval="[(4, ref('base.group_user'))]"/>
</record>
```

## Checklist
- [ ] Every new model has ir.model.access.csv entry (R4)
- [ ] sudo() used only where necessary, not broadly
- [ ] Record rules use parameterized domains (R13)
- [ ] Controllers have explicit auth= parameter (R13)
