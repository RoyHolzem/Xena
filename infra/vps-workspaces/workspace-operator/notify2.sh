#!/bin/bash
# Send a system message to the operator agent via gateway WebSocket RPC
TOKEN="RwogUWOUWN13VXbnpOOuH18IGfPt52cg"
node -e "
const ws = require('ws');
const socket = new ws('ws://127.0.0.1:18789/ws?token=${TOKEN}');
socket.on('open', () => {
  socket.send(JSON.stringify({
    id: '1',
    method: 'chat.send',
    params: {
      agentId: 'operator',
      message: 'System notification: You have full CRUD access to DynamoDB tables via the operator AWS profile. Tables: roy-telecom-incidents-lux, roy-telecom-events-lux, roy-telecom-planned-works-lux. Use --profile operator --region eu-central-1. See TOOLS.md for examples.'
    }
  }));
});
socket.on('message', (data) => {
  console.log(data.toString());
  socket.close();
});
setTimeout(() => { process.exit(1); }, 10000);
"
