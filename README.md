# Xena

**AI Assistant Interface** — a production-grade, fully authenticated chat UI deployed on AWS Amplify with Cognito.

## What This Is

Xena is a Next.js 14 app that provides a real-time streaming chat interface to an OpenClaw gateway. It features:

- **Cognito Authentication** — login/signup with email + password (Google OAuth optional). No one sees the chat without authenticating.
- **Server-side Gateway Proxy** — the browser never touches the gateway token. All chat and AWS API calls go through Next.js API routes that verify the Cognito JWT before forwarding.
- **CloudTrail Activity Feed** — live AWS activity displayed in the sidebar (polls every 15s).
- **GitHub Status** — shows connected branch + latest commit SHA.
- **Enterprise Console** — real-time log of all gateway interactions.
- **Fully IaC** — one CloudFormation template provisions Cognito User Pool + Domain + App Client + Amplify App + all branches.

## Architecture

```
Browser (Next.js)
  +-- /page.tsx -> AuthWrapper (Cognito login screen)
  |                  +-- ChatShell (post-auth chat UI)
  +-- /api/chat -> verifies JWT -> proxies to OpenClaw gateway
  +-- /api/aws-activity -> verifies JWT -> polls CloudTrail

AWS Infrastructure (CloudFormation):
  +-- Cognito User Pool (email auth, Google OAuth)
  +-- Cognito User Pool Domain (hosted UI)
  +-- Cognito App Client (OAuth flows, callback URLs)
  +-- Amplify App (3 branches: main, staging, experimental)
```

**Secrets are never exposed to the browser.** GATEWAY_AUTH_TOKEN, CT_AWS_ACCESS_KEY_ID, and CT_AWS_SECRET_ACCESS_KEY are server-side only (no NEXT_PUBLIC_ prefix).

## Quick Deploy

### Prerequisites
- AWS account
- GitHub personal access token (repo access)
- OpenClaw gateway URL + auth token

### 1. Deploy CloudFormation

```bash
aws cloudformation create-stack \
  --stack-name xena \
  --template-body file://infra/amplify-app.template.yaml \
  --parameters \
      ParameterKey=GitHubAccessToken,ParameterValue=ghp_xxx \
      ParameterKey=CognitoDomainPrefix,ParameterValue=xena-yourname \
      ParameterKey=GatewayUrl,ParameterValue=https://your-gateway \
      ParameterKey=GatewayAuthToken,ParameterValue=your-token \
  --capabilities CAPABILITY_AUTO_EXPAND \
  --region eu-central-1
```

### 2. Get the Amplify Domain

```bash
aws cloudformation describe-stacks \
  --stack-name xena \
  --query "Stacks[0].Outputs" \
  --region eu-central-1
```

### 3. Update Callback URLs

After the first deploy, update the stack with AmplifyAppDomain parameter set to the Amplify default domain so Cognito callback URLs are correct:

```bash
aws cloudformation update-stack \
  --stack-name xena \
  --use-previous-template \
  --parameters \
      ParameterKey=GitHubAccessToken,UsePreviousValue=true \
      ParameterKey=CognitoDomainPrefix,UsePreviousValue=true \
      ParameterKey=AmplifyAppDomain,ParameterValue=dXXXXXXXXXXX.amplifyapp.com \
      ParameterKey=GatewayUrl,UsePreviousValue=true \
      ParameterKey=GatewayAuthToken,UsePreviousValue=true \
  --capabilities CAPABILITY_AUTO_EXPAND \
  --region eu-central-1
```

### 4. Create Your First User

Sign up directly on the website, or via CLI:

```bash
aws cognito-idp sign-up \
  --client-id <ClientID> \
  --username user@example.com \
  --password 'YourSecureP@ss1' \
  --user-attributes Name=email,Value=user@example.com

aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <PoolID> \
  --username user@example.com
```

## Local Development

```bash
cp .env.example .env.local
# Fill in your values
npm install
npm run dev
```

## Environment Variables

| Variable | Client/Server | Description |
|---|---|---|
| NEXT_PUBLIC_APP_NAME | Client | App display name |
| NEXT_PUBLIC_ASSISTANT_NAME | Client | Assistant display name |
| NEXT_PUBLIC_GATEWAY_URL | Client | Gateway URL (for display only) |
| NEXT_PUBLIC_GATEWAY_CHAT_PATH | Client | Gateway chat path |
| NEXT_PUBLIC_COGNITO_USER_POOL_ID | Client | Cognito Pool ID |
| NEXT_PUBLIC_COGNITO_CLIENT_ID | Client | Cognito Client ID |
| NEXT_PUBLIC_COGNITO_REGION | Client | AWS region |
| GATEWAY_AUTH_TOKEN | Server only | Gateway bearer token |
| CT_AWS_ACCESS_KEY_ID | Server only | CloudTrail read-only key |
| CT_AWS_SECRET_ACCESS_KEY | Server only | CloudTrail read-only secret |
| CT_AWS_REGION | Server only | CloudTrail region |

## Adding Google OAuth

Pass these additional parameters when deploying:

```bash
ParameterKey=GoogleClientId,ParameterValue=your-google-client-id
ParameterKey=GoogleClientSecret,ParameterValue=your-google-client-secret
```

Also add the Cognito domain URL (from stack outputs) to your Google OAuth redirect URIs.

## Stack Outputs

| Output | Description |
|---|---|
| UserPoolId | Cognito User Pool ID |
| UserPoolClientId | Cognito App Client ID |
| CognitoDomain | Hosted auth domain |
| AmplifyAppId | Amplify application ID |
| MainUrl | Production URL |
| StagingUrl | Staging URL |
| ExperimentalUrl | Development URL |

## Tech Stack

- **Next.js 14** (App Router)
- **AWS Amplify v6** (client SDK)
- **AWS Cognito** (authentication)
- **aws-jwt-verify** (server-side JWT validation)
- **@aws-amplify/ui-react** (Authenticator component)
- **@aws-sdk/client-cloudtrail** (activity feed)

## License

MIT
