# DAIOS

DAIOS is a Discord-native AI Operating System for server management. It responds conversationally, reasons over server state, executes Discord actions only through registered tools, and requires approval for dangerous work.

## Quick Start

1. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN`, `GROK_API_KEY`, `DATABASE_URL`, and `BOT_OWNER_ID`.
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run prisma:generate`
4. Run migrations: `npm run prisma:migrate`
5. Start the bot: `npm run dev`

## Docker

```bash
docker compose up --build
```

## Railway Deployment

Railway can run this project with the included `railway.json`. The start command is:

```bash
npm run railway:start
```

That command pushes the Prisma schema to PostgreSQL and starts the compiled bot.

### Railway Variables

Add these variables in Railway:

| Variable | Required | Notes |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | Bot token from the Discord Developer Portal. |
| `GROK_API_KEY` | Yes | xAI/Grok API key. |
| `DATABASE_URL` | Yes | Railway Postgres connection URL. Railway usually provides this when you add PostgreSQL. |
| `BOT_OWNER_ID` | Yes | Your Discord user ID. Only this user can run `/continue`. |
| `DISCORD_CLIENT_ID` | Optional | Discord application/client ID. Kept for clarity and future REST registration flows. |
| `COMMAND_GUILD_ID` | Optional | Use during testing to register slash commands instantly in one server. Leave blank for global commands. |
| `AI_PROVIDER` | Optional | `auto`, `xai`, or `groq`. Defaults to `auto`. `gsk_` keys are treated as Groq keys. |
| `GROK_MODEL` | Optional | xAI model. Defaults to `grok-4`. |
| `GROQ_MODEL` | Optional | Groq model. Defaults to `llama-3.3-70b-versatile`. |
| `AI_CHANNEL_IDS` | Optional | Comma-separated fallback assistant channels before `/setup`. Usually leave blank. |
| `APPROVAL_TIMEOUT_MINUTES` | Optional | Defaults to `60`. |

### Discord Developer Portal

Enable these bot settings:

- Server Members Intent
- Message Content Intent

Invite the bot with these scopes:

- `bot`
- `applications.commands`

Recommended bot permissions:

- Manage Channels
- Manage Roles
- Manage Messages
- Kick Members
- Ban Members
- Moderate Members
- View Channels
- Send Messages
- Create Public Threads
- Manage Threads
- Read Message History

After the bot joins a server:

1. Run `/setup` and choose the free assistant channel and paid administrator command channel.
2. The bot starts with 0 paid administrator days.
3. The bot owner runs `/continue days:<number>` in that server to start or extend paid administrator execution.
4. Use `/status` to verify setup and remaining paid days.

## Capabilities

- AI chat on mention, reply, or configured AI channels
- Grok-backed natural language reasoning
- Registry-based Discord tool execution
- Risk-aware approval workflow through Discord DMs
- Persistent guild knowledge, memory, analytics events, and automations
- Event engine hooks for future automation execution
- Composite server workflow tools for staff applications, verification, support, onboarding, moderation, and event management
- Paid administrator command execution with free assistant mode
