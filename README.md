# Xena

A production-ready **standalone chat UI** for **Xena** that talks to an **OpenClaw Gateway**. This is **not** the OpenClaw dashboard — it is a custom Next.js frontend with a matrix-blue dark theme, streaming replies, and a real-time presence indicator (`idle`, `processing`, `typing`).

## Features

- **Pure IaC deployment** for Amplify Hosting via `amplify.yml`
- **Custom standalone chat UI** built with Next.js App Router
- **Server-side gateway proxy** so the OpenClaw auth token never reaches the browser
- **SSE streaming** from `POST /v1/chat/completions`
- **Real-time activity indicator**
- **Deployable by anyone** with environment variables + CloudFormation template

---

## Architecture

```text
Browser
  -> Next.js frontend on Amplify Hosting
  -> /api/chat route (server-side proxy)
  -> OpenClaw Gateway HTTP API
     POST /v1/chat/completions
```

The frontend never calls the gateway directly with a secret. The Next.js server route adds the gateway bearer token and streams the response back to the browser.

---

## Required environment variables

Copy `.env.example` to `.env.local` for local development, or configure the same variables in **AWS Amplify Hosting**.

| Variable | Required | Description |
|---|---:|---|
| `OPENCLAW_GATEWAY_URL` | yes | Public HTTPS base URL for your OpenClaw Gateway, e.g. `https://18.194.41.114` or your reverse-proxied domain |
| `OPENCLAW_GATEWAY_AUTH_TOKEN` | yes | Gateway bearer token |
| `OPENCLAW_GATEWAY_CHAT_PATH` | no | Defaults to `/v1/chat/completions` |
| `OPENCLAW_MODEL` | no | Defaults to `openai/gpt-5.4` |
| `SYSTEM_PROMPT` | no | Server-side persona prompt |
| `NEXT_PUBLIC_APP_NAME` | no | UI title |
| `NEXT_PUBLIC_ASSISTANT_NAME` | no | Display name in the chat UI |

> Important: `OPENCLAW_GATEWAY_URL` must be **publicly reachable from Amplify**. `http://127.0.0.1:18789` only works locally on the gateway host.

---

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

---

## One-click deploy with CloudFormation

Use the template in [`infra/amplify-app.template.yaml`](./infra/amplify-app.template.yaml) to provision:

- an Amplify app
- a production branch
- the required environment variables

### Deploy from the AWS Console

1. Open CloudFormation
2. Create stack with `infra/amplify-app.template.yaml`
3. Fill in the parameters:
   - GitHub repository URL
   - Amplify OAuth token / GitHub token secret reference
   - OpenClaw gateway public URL
   - OpenClaw gateway auth token
4. Deploy

### Quick-create URL pattern

Replace the URL below with your raw GitHub file URL once pushed:

```text
https://console.aws.amazon.com/cloudformation/home?region=eu-central-1#/stacks/quickcreate?templateURL=<RAW_TEMPLATE_URL>&stackName=xena
```

---

## OpenClaw gateway requirements

This app expects the gateway HTTP API to expose:

- `POST /v1/chat/completions`

OpenClaw docs: `docs/gateway/openai-http-api.md`

### Example request

```json
{
  "model": "openai/gpt-5.4",
  "stream": true,
  "messages": [
    {"role": "system", "content": "You are Xena..."},
    {"role": "user", "content": "Hey Xena"}
  ]
}
```

---

## Public gateway note

If your gateway is currently bound to loopback (`127.0.0.1`) you must expose it safely before Amplify can reach it. Recommended approaches:

- reverse proxy with HTTPS (Nginx / Caddy)
- trusted proxy mode if you want identity-aware access control
- firewall allowlist if exposing directly by IP

Do **not** expose the raw gateway to the public internet without understanding the auth/security model. The bearer token is effectively operator access.

---

## Styling

The UI uses a dark matrix-inspired palette with cyan/blue neon accents:

- deep black-blue background
- cyan glow borders
- glass panels
- animated typing state
- explicit status badges for `idle`, `processing`, `typing`, `error`

---

## License

MIT
