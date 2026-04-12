# Xena

**AI Assistant Interface** — a production-grade, fully authenticated chat UI deployed on AWS Amplify with Cognito.

## What This Is

Xena is a Next.js 14 app that provides a real-time streaming chat interface to an OpenClaw gateway. It features:

- **Cognito Authentication** — login/signup with email + password (Google OAuth optional). No one sees the chat without authenticating.
- **SES Email Delivery** — verification, confirmation, and forgot-password emails sent via Amazon SES (not Cognito's unreliable default sender).
- **Server-side Gateway Proxy** — the browser never touches the gateway token. All chat and AWS API calls go through Next.js API routes that verify the Cognito JWT before forwarding.
- **CloudTrail Activity Feed** — live AWS activity displayed in the sidebar (polls every 15s).
- **GitHub Status** — shows connected branch + latest commit SHA.
- **Enterprise Console** — real-time log of all gateway interactions.
- **Fully IaC** — one CloudFormation template provisions SES identity + IAM role + Cognito User Pool + Domain + App Client + Amplify App + all branches.

## Architecture

```
Browser (Next.js)
  +-- /page.tsx -> AuthWrapper (Cognito login screen)
  |                  +-- ChatShell (post-auth chat UI)
  +-- /api/chat -> verifies JWT -> proxies to OpenClaw gateway
  +-- /api/aws-activity -> verifies JWT -> polls CloudTrail

AWS Infrastructure (CloudFormation):
  +-- SES Email Identity (verified sender)
  +-- IAM Role (Cognito -> SES send permission)
  +-- Cognito User Pool (email auth, Google OAuth, SES email config)
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
      ParameterKey=GatewayUrl,ParameterValue=https://your-gateway \
      ParameterKey=GatewayAuthToken,ParameterValue=your-token \
  --capabilities CAPABILITY_AUTO_EXPAND CAPABILITY_IAM \
  --region eu-central-1
```

### Step 2: Verify the SES Sender Email

AWS sends a verification email to the address you provided as SenderEmail. **Click the link in that email.** Cognito cannot send emails until SES verification is complete.

Check inbox and spam. Verify with:

```bash
aws sesv2 get-email-identity --email-identity you@example.com --region eu-central-1 --query "VerifiedForSendingStatus"
```

Should return 	rue.

### Step 3: Get Stack Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name xena \
  --query "Stacks[0].Outputs" \
  --region eu-central-1
```

Note the AmplifyDefaultDomain output (e.g. dXXXXXXXXXXX.amplifyapp.com).

### Step 4: Update Callback URLs

Update the stack with the AmplifyAppDomain so Cognito callback URLs point to your deployed app:

```bash
aws cloudformation update-stack \
  --stack-name xena \
  --use-previous-template \
  --parameters \
      ParameterKey=GitHubAccessToken,UsePreviousValue=true \
      ParameterKey=CognitoDomainPrefix,UsePreviousValue=true \
      ParameterKey=SenderEmail,UsePreviousValue=true \
      ParameterKey=AmplifyAppDomain,ParameterValue=dXXXXXXXXXXX.amplifyapp.com \
      ParameterKey=GatewayUrl,UsePreviousValue=true \
      ParameterKey=GatewayAuthToken,UsePreviousValue=true \
  --capabilities CAPABILITY_AUTO_EXPAND CAPABILITY_IAM \
  --region eu-central-1
```

### Step 5: Create Your First User

Sign up directly on the website. You will receive a verification email from your SES sender address.

Or via CLI:

```bash
aws cognito-idp sign-up \
  --client-id <ClientID> \
  --username user@example.com \
  --password 'YourSecureP@ss1' \
  --user-attributes Name=email,Value=user@example.com

# If you need to bypass email verification during testing:
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <PoolID> \
  --username user@example.com
```

## Local Development

```bash
cp .env.example .env.local
# Fill in your values (Cognito pool + client IDs, gateway URL, etc.)
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
| GATEWAY_AUTH_TOKEN | **Server only** | Gateway bearer token |
| CT_AWS_ACCESS_KEY_ID | **Server only** | CloudTrail read-only key |
| CT_AWS_SECRET_ACCESS_KEY | **Server only** | CloudTrail read-only secret |
| CT_AWS_REGION | **Server only** | CloudTrail region |

## Adding Google OAuth

Pass these additional parameters when deploying:

```bash
ParameterKey=GoogleClientId,ParameterValue=your-google-client-id
ParameterKey=GoogleClientSecret,ParameterValue=your-google-client-secret
```

Also add the Cognito domain URL (from stack outputs) to your Google OAuth redirect URIs.

## SES Email Notes

- In SES sandbox mode you can only send to verified addresses and the daily limit is 200 emails.
- To request production access (send to any address, higher limits): go to AWS Console > SES > Account dashboard > Request production access. Its free tier includes 3,000 emails/month.
- Cost beyond free tier: \.10 per 1,000 emails.

## Stack Outputs

| Output | Description |
|---|---|
| UserPoolId | Cognito User Pool ID |
| UserPoolClientId | Cognito App Client ID |
| CognitoDomain | Hosted auth domain |
| SenderEmailIdentityArn | SES email identity ARN |
| AmplifyAppId | Amplify application ID |
| AmplifyDefaultDomain | Default Amplify domain |
| MainUrl | Production URL |
| StagingUrl | Staging URL |
| ExperimentalUrl | Development URL |

## Tech Stack

- **Next.js 14** (App Router)
- **AWS Amplify v6** (client SDK)
- **AWS Cognito** (authentication)
- **AWS SES** (email delivery)
- **aws-jwt-verify** (server-side JWT validation)
- **@aws-amplify/ui-react** (Authenticator component)
- **@aws-sdk/client-cloudtrail** (activity feed)

## License

MIT
