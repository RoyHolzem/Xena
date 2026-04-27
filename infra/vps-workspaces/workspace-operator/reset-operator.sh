#!/bin/bash
# Reset operator sessions
echo "Resetting operator sessions..."
cd /home/ubuntu/.openclaw/agents/operator/sessions
for f in *.jsonl; do
  if [ -f "$f" ]; then
    mv "$f" "${f}.reset.$(date -u +%Y-%m-%dT%H-%M-%S)Z"
  fi
done
# Reset the sessions.json to clear cached model
python3 -c "
import json
with open('sessions.json') as f:
    d = json.load(f)
for k in list(d.keys()):
    if 'model' in d[k]:
        del d[k]['model']
        print(f'  Cleared model for {k}')
with open('sessions.json', 'w') as f:
    json.dump(d, f, indent=2)
"
echo "Done. Restarting gateway..."
systemctl --user restart openclaw-gateway
sleep 3
echo "Gateway restarted."
journalctl --user -u openclaw-gateway --no-pager -n 5
