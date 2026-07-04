# scout-gateway — guide for Claude Code

## What this is

A dumb, authenticated message bus. It delivers outbound messages to a human (email/Telegram),
forwards inbound messages to registered receivers, and authenticates callers. **It has no LLM
calls and no domain logic** — keep it that way. If a change requires "understanding" a message,
it belongs in an agent that calls this gateway, not here.

## Repo map

```
packages/api/src/
  index.ts            # fastify bootstrap: env, jwt, hooks, routes, listen
  constants.ts        # shared constants (intents, directions, jwt expiry)
  schema/
    env.ts            # @fastify/env schema + typed FastifyInstance.config
    requests.ts       # JSON body schemas (reject unknown fields)
    errors.ts         # ScoutApiError + error-code → HTTP-status mapping
  models/             # mongoose: client, message, template
  hooks/
    adminKey.ts       # X-API-Key gate (timing-safe) for the admin plane
    authenticate.ts   # JWT verify + scope check, attaches request.client
    rateLimiter.ts    # @fastify/rate-limit
  delivery/           # email (postmark) + telegram (bot api) transports
  utils/              # mongooseClient, crypto (hmac/safeEqual), forward, render
  routes/<group>/     # <group>Routes.ts (wiring) + <group>Controller.ts (handlers)
```

Route groups: `clients` (register/unregister), `messages` (send/receive), `templates`.

## Conventions (match exactly)

- **Minimal comments.** Comment only the non-obvious _why_ (e.g. why a separate forward secret,
  why timing-safe compare). Never restate code.
- **Section headers only**, and only these three, when a file has more than one concern:
  `// --- Types & state ---`, `// --- Core functions ---`, `// --- Helper functions ---`.
- **No JSDoc.**
- Formatting: tabs, single quotes, no semicolons, width 100 (prettier enforces).
- Maximal reuse, smallest surface. Justify any new file.
- Errors: throw a `ScoutApiError` subclass from `schema/errors.ts`; controllers funnel through
  `handleAndReturnErrorResponse(reply, err)`.

## Commands

```sh
npm run dev          # watch
npm run build        # tsc
npm test             # vitest
npm run type-check
npm run lint
npm run format:fix
```

## Invariants

- The admin plane (`/register`, `/unregister`, `/templates`) is gated by `X-API-Key` only.
- Traffic (`/send`, `/receive`) is gated by a per-client JWT; `scope.send` is required to publish.
- `scope.receive` clients must have a `receiveUrl`; forwarded POSTs are HMAC-signed with `FORWARD_SECRET`.
- Re-registering a client bumps `tokenVersion`, invalidating its old JWT.
- Delivery addresses come from env (`EMAIL_TO`, `TELEGRAM_CHAT_ID`), never from the request.
