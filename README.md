# Xena

**AI Assistant Interface** — a production-grade, voice-enabled chat UI deployed on AWS Amplify with Cognito authentication and a dedicated Operations API.

## What This Is

Xena is a Next.js 14 app that provides a real-time streaming chat interface to an OpenClaw gateway. It features:

- **Cognito Authentication** — login/signup with email + password (Google OAuth optional). No one sees the chat without authenticating.
- **SES Email Delivery** — verification, confirmation, and forgot-password emails sent via Amazon SES.
- **Server-side Gateway Proxy** — the browser never touches the gateway token. All chat and AWS API calls go through Next.js API routes that verify the Cognito JWT before forwarding. The gateway token is stored in AWS Secrets Manager and fetched at runtime.
- **Voice Interface** — push-to-talk using Whisper (STT) and GPT-4o-mini TTS. Record → transcribe → chat → speak the response in real-time, sentence by sentence.
- **Telecom Operations Dashboard** — browse Luxembourg telecom incidents, events, and planned maintenance from DynamoDB, with sortable tables and a focused detail panel.
- **Operations API** — a dedicated Lambda + API Gateway backend for safe, least-privilege access to operational data (no direct AWS credentials in the app or the LLM).
- **GitHub Status** — shows connected branch and latest commit SHA in the top nav.
- **Warmup Sequence** — on boot, the app warms the Lambda, loads secrets, connects to the gateway, and verifies the operator model is online before showing the chat.
- **Fully IaC** — CloudFormation templates provision everything: SES identity, IAM roles, Cognito User Pool, Secrets Manager, Amplify App, and the Operations API.

## Architecture

```
Browser (Next.js)
  ├── /                    → AuthWrapper (Cognito login screen)
  │                          └── ChatShell (post-auth chat UI)
  ├── /api/chat             → verifies JWT → reads secret → proxies SSE to OpenClaw gateway
  ├── /api/telecom          → verifies JWT → scans DynamoDB tables (incidents, events, planned-works)
  ├── /api/voice/stt        → verifies JWT → Whisper transcription
  ├── /api/voice/tts        → verifies JWT → GPT-4o-mini TTS
  ├── /api/voice/session    → verifies JWT → OpenAI Realtime client token
  ├── /api/warmup           → verifies JWT → warms Lambda + gateway + operator
  └── /api/health           → returns { ok: true }

AWS Infrastructure (CloudFormation):
  ├── Secrets Manager       → xena/gateway-token, xena/openai-key
  ├── SES Email Identity    → verified sender for Cognito emails
  ├── IAM Role              → Cognito → SES send permission
  ├── Cognito User Pool     → email auth, Google OAuth, SES email config
  ├── Cognito Domain        → hosted UI
  ├── Cognito App Client    → OAuth flows, callback URLs
  └── Amplify App           → 3 branches: main, staging, experimental

Xena Operations API (separate stack):
  ├── API Gateway (HTTP)    → 6 endpoints for telecom data
  ├── Lambda                → Node.js 20, reads DynamoDB
  └── IAM Role              → GetItem + Query + Scan on 3 tables only
```

**Secrets are never exposed to the browser.** Gateway token and API keys are stored in Secrets Manager and fetched server-side only. No `NEXT_PUBLIC_` prefix on secrets.

## Xena Operations API

A dedicated HTTPS API for safe access to operational data. The Lambda uses an IAM role with least-privilege DynamoDB permissions — no direct AWS credentials anywhere.

**Stack**: `xena-ops-api` (CloudFormation SAM)
**IaC**: `infra/xena-ops-api/template.yaml`

| Endpoint | Description |
|---|---|
| `GET /incidents/latest` | 20 most recent incidents |
| `GET /incidents/open` | All open incidents (not RESOLVED/CLOSED) |
| `GET /events/latest` | 20 most recent events |
| `GET /events/open` | All open events (not COMPLETED/CLOSED) |
| `GET /planned-works/today` | Maintenance scheduled today |
| `GET /planned-works/open` | All open planned works |

**IAM policy**: `dynamodb:GetItem`, `dynamodb:Query`, `dynamodb:Scan` on `roy-telecom-incidents-lux`, `roy-telecom-events-lux`, `roy-telecom-planned-works-lux` only.

### Deploy the Operations API

```bash
cd infra/xena-ops-api

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket aws-sam-cli-managed-default-samclisourcebucket-us9iunacpbqr \
  --s3-prefix xena-ops-api \
  --output-template-file packaged.yaml \
  --region eu-central-1

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name xena-ops-api \
  --capabilities CAPABILITY_AUTO_EXPAND CAPABILITY_IAM \
  --region eu-central-1
```

## Quick Deploy (Main Stack)

### Prerequisites
- AWS account
- GitHub personal access token (repo access)
- OpenClaw gateway URL
- An email address to use as sender (must be verified in SES)

### Step 1: Deploy CloudFormation

```bash
aws cloudformation create-stack \
  --stack-name xena \
  --template-body file://infra/amplify-app.template.yaml \
  --parameters \
      ParameterKey=GitHubAccessToken,ParameterValue=ghp_xxx \
      ParameterKey=CognitoDomainPrefix,ParameterValue=xena-yourname \
      ParameterKey=SenderEmail,ParameterValue=you@example.com \
  --capabilities CAPABILITY_AUTO_EXPAND CAPABILITY_IAM \
  --region eu-central-1
```

### Step 2: Verify the SES Sender Email

AWS sends a verification email to the address you provided. **Click the link.** Cognito cannot send emails until SES verification is complete.

```bash
aws sesv2 get-email-identity --email-identity you@example.com --region eu-central-1 --query "VerifiedForSendingStatus"
```

### Step 3: Store Secrets

```bash
aws secretsmanager create-secret --name xena/gateway-token \
  --secret-string '{"token":"your-gateway-bearer-token"}' \
  --region eu-central-1

aws secretsmanager create-secret --name xena/openai-key \
  --secret-string '{"apiKey":"sk-..."}' \
  --region eu-central-1
```

### Step 4: Get Stack Outputs & Update Callback URLs

```bash
aws cloudformation describe-stacks --stack-name xena --query "Stacks[0].Outputs" --region eu-central-1
```

Update the stack with the Amplify domain so Cognito callback URLs point to your deployed app:

```bash
aws cloudformation update-stack \
  --stack-name xena \
  --use-previous-template \
  --parameters \
      ParameterKey=GitHubAccessToken,UsePreviousValue=true \
      ParameterKey=CognitoDomainPrefix,UsePreviousValue=true \
      ParameterKey=SenderEmail,UsePreviousValue=true \
      ParameterKey=AmplifyAppDomain,ParameterValue=dXXXXXXXXXXX.amplifyapp.com \
  --capabilities CAPABILITY_AUTO_EXPAND CAPABILITY_IAM \
  --region eu-central-1
```

### Step 5: Create Your First User

Sign up on the website, or via CLI:

```bash
aws cognito-idp sign-up \
  --client-id <ClientID> \
  --username user@example.com \
  --password 'YourSecureP@ss1' \
  --user-attributes Name=email,Value=user@example.com
```

## Local Development

```bash
cp .env.example .env.local
# Fill in your values (Cognito pool + client IDs, gateway URL, etc.)
npm install
npm run dev
```

## Environment Variables

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Client | App display name |
| `NEXT_PUBLIC_ASSISTANT_NAME` | Client | Assistant display name |
| `NEXT_PUBLIC_GATEWAY_URL` | Client | Gateway URL (for display only) |
| `NEXT_PUBLIC_GATEWAY_CHAT_PATH` | Client | Gateway chat path |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Client | Cognito Pool ID |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Client | Cognito Client ID |
| `NEXT_PUBLIC_COGNITO_REGION` | Client | AWS region |
| `xena/gateway-token` | **Secrets Manager** | Gateway bearer token (fetched at runtime) |
| `xena/openai-key` | **Secrets Manager** | OpenAI API key for voice STT/TTS (fetched at runtime) |

**No secrets in environment variables.** All sensitive credentials are stored in AWS Secrets Manager and fetched by the server-side API routes at runtime.

## API Routes

| Route | Auth | Description |
|---|---|---|
| `POST /api/chat` | Cognito JWT | Proxies chat to OpenClaw gateway with SSE streaming |
| `GET /api/telecom?view=incidents\|events\|planned-works` | Cognito JWT | Scans DynamoDB telecom tables |
| `POST /api/voice/stt` | Cognito JWT | Whisper speech-to-text |
| `POST /api/voice/tts` | Cognito JWT | GPT-4o-mini text-to-speech |
| `POST /api/voice/session` | Cognito JWT | OpenAI Realtime client session token |
| `POST /api/warmup` | Cognito JWT | Warms Lambda, loads secrets, pings gateway |
| `GET /api/health` | None | Health check |

## Tech Stack

- **Next.js 14** (App Router, SSR on Amplify)
- **AWS Amplify v6** (client SDK)
- **AWS Cognito** (authentication)
- **AWS SES** (email delivery)
- **AWS Secrets Manager** (runtime secret fetching)
- **AWS Lambda + API Gateway** (Operations API)
- **AWS DynamoDB** (telecom data)
- **aws-jwt-verify** (server-side JWT validation)
- **@aws-amplify/ui-react** (Authenticator component)
- **@aws-sdk/client-dynamodb** (DynamoDB client)
- **@aws-sdk/client-secrets-manager** (runtime secret loading)
- **OpenAI Whisper** (STT)
- **OpenAI GPT-4o-mini TTS** (TTS)

## Security Design

- **Zero exposed credentials** — no `NEXT_PUBLIC_` env vars contain secrets. All sensitive values live in Secrets Manager.
- **JWT verification** — every API route verifies the Cognito access token before proceeding.
- **Least-privilege IAM** — the Operations API Lambda can only `GetItem`, `Query`, and `Scan` on three specific DynamoDB tables. Nothing else.
- **Server-side proxy** — the browser never contacts the gateway or AWS directly. All calls go through authenticated Next.js API routes.
- **Gateway retry logic** — the chat route retries up to 3 times on 502/504 to handle cold starts.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Gateway proxy (SSE streaming)
│   │   ├── health/route.ts        # Health check
│   │   ├── telecom/route.ts       # DynamoDB telecom data
│   │   ├── voice/
│   │   │   ├── session/route.ts   # OpenAI Realtime token
│   │   │   ├── stt/route.ts       # Whisper transcription
│   │   │   └── tts/route.ts       # TTS synthesis
│   │   └── warmup/route.ts        # Boot warmup sequence
│   ├── layout.tsx
│   └── page.tsx
├── features/
│   ├── auth/AuthWrapper.tsx        # Cognito auth provider
│   ├── chat/
│   │   ├── ChatShell.tsx           # Main shell (boot → chat → modules)
│   │   ├── chat-config.ts
│   │   ├── chat-types.ts
│   │   ├── chat-utils.ts
│   │   ├── chat-shell.module.css
│   │   ├── components/
│   │   │   ├── BootScreen.tsx      # Startup warmup animation
│   │   │   ├── ChatCenter.tsx      # Message list + input
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── LeftPanel.tsx       # Context panel
│   │   │   ├── ModuleDashboard.tsx # Incidents/Events/Maintenance views
│   │   │   ├── OperationsPanel.tsx
│   │   │   ├── RightPanel.tsx      # Record detail panel
│   │   │   └── TopNav.tsx          # Navigation + status
│   │   └── hooks/
│   │       ├── useBootSequence.ts
│   │       ├── useChat.ts          # Chat state + streaming
│   │       ├── useGitHub.ts
│   │       ├── useTelecom.ts       # DynamoDB data fetching
│   │       └── useVoice.ts         # Push-to-talk pipeline
│   └── operations/
│       ├── ops-helpers.ts
│       └── view-meta.ts
├── infra/
│   ├── amplify-app.template.yaml   # Main stack: Cognito + SES + Amplify + Secrets
│   └── xena-ops-api/
│       ├── template.yaml           # Operations API: Lambda + API Gateway + IAM
│       └── src/index.mjs           # Lambda handler (6 endpoints)
├── lib/
│   ├── cognito-jwt.ts              # JWT verifier
│   ├── config.ts
│   ├── types.ts
│   └── utils.ts
└── package.json
```

## Adding Google OAuth

Pass these additional parameters when deploying the main stack:

```bash
ParameterKey=GoogleClientId,ParameterValue=your-google-client-id
ParameterKey=GoogleClientSecret,ParameterValue=your-google-client-secret
```

Also add the Cognito domain URL (from stack outputs) to your Google OAuth redirect URIs.

## SES Email Notes

- In SES sandbox mode you can only send to verified addresses and the daily limit is 200 emails.
- To request production access: AWS Console → SES → Account dashboard → Request production access. Free tier includes 3,000 emails/month.
- Cost beyond free tier: $0.10 per 1,000 emails.

## License

MIT
