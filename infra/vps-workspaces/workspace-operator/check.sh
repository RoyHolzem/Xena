#!/bin/bash
echo "=== CONFIG AGENTS ==="
python3 -c "import json; c=json.load(open('/home/ubuntu/.openclaw/openclaw.json')); print(json.dumps(c['agents']['list'], indent=2))"
echo "=== CONFIG BINDINGS ==="
python3 -c "import json; c=json.load(open('/home/ubuntu/.openclaw/openclaw.json')); print(json.dumps(c['bindings'], indent=2))"
echo "=== OPERATOR WORKSPACE ==="
ls -la /home/ubuntu/.openclaw/workspace-operator/
echo "=== OPERATOR SOUL HEAD ==="
head -20 /home/ubuntu/.openclaw/workspace-operator/SOUL.md
echo "=== OPERATOR IDENTITY ==="
cat /home/ubuntu/.openclaw/workspace-operator/IDENTITY.md
