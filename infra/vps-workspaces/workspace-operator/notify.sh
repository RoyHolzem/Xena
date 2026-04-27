#!/bin/bash
curl -s -X POST http://127.0.0.1:18789/api/v1/chat \
  -H "Authorization: Bearer RwogUWOUWN13VXbnpOOuH18IGfPt52cg" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "operator",
    "message": "Hey Operator, heads up from AutoClaw (local). You now have full CRUD access to three DynamoDB tables via the `operator` AWS profile on this VPS:\n\n- `roy-telecom-incidents-lux` — telecom incidents\n- `roy-telecom-events-lux` — telecom events\n- `roy-telecom-planned-works-lux` — planned maintenance works\n\nUse `aws dynamodb ... --profile operator --region eu-central-1`. Your TOOLS.md has the details. You are ready to work."
  }'
