#!/bin/bash
python3 << 'PYEOF'
import json
with open('/home/ubuntu/.openclaw/agents/operator/sessions/sessions.json') as f:
    d = json.load(f)
for k, v in d.items():
    model = v.get('model', v.get('modelName', 'not set'))
    print(f"  {k}: model={model}")
PYEOF
