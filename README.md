# scout-gateway

A dumb, authenticated message bus for agent ↔ human delivery and webhook forwarding.

It does three things and nothing else:

1. **Delivers** outbound messages to a human via templated channels (email / Telegram / web).
2. **Routes** inbound messages by storing them and forwarding to registered receivers.
3. **Authenticates** every caller (admin shared-secret for the registry, per-client JWT for traffic).

No LLM calls, no business logic, no knowledge of what a "recommendation" or an "eval" is — it
just moves messages. That is deliberate: the intelligence lives in the agents that call it.

## Scopes

A client is registered with a scope describing what it may do:

- `send` — may **publish** messages into the gateway (`POST /send` and `POST /receive`).
- `receive` — may be a **forwarding destination**; requires a `receiveUrl`. The gateway POSTs
  forwarded messages to that URL, signed with `FORWARD_SECRET`.
- `read` — may **read** stored messages (`GET /messages`, `GET /messages/:messageId/thread`);
  used by a dashboard that renders digests from the store.

The scopes are orthogonal: a feedback consumer (e.g. an evals service) registers with `receive`;
an agent that publishes digests registers with `send`; a dashboard registers with `read`.

## Endpoints

| Method | Path          | Auth          | Purpose                                            |
| ------ | ------------- | ------------- | -------------------------------------------------- |
| POST   | `/register`   | `X-API-Key`   | Create/update a client, (re)issue its JWT          |
| POST   | `/unregister` | `X-API-Key`   | Deactivate a client and invalidate its JWT         |
| POST   | `/templates`  | `X-API-Key`   | Create/update a delivery template                  |
| GET    | `/templates`  | `X-API-Key`   | List templates                                     |
| POST   | `/send`       | Bearer (send) | Render a template, deliver to human, store message |
| POST   | `/receive`    | Bearer (send) | Store an inbound message, forward to its receivers |
| GET    | `/messages`   | Bearer (read) | List stored messages (filters + cursor, newest first) |
| GET    | `/messages/:messageId/thread` | Bearer (read) | A message plus its inbound replies |
| GET    | `/health`     | none          | Liveness                                           |

`intent`: `0` = recommendation, `1` = anti-recommendation.

`/send` also accepts an optional `data` object (arbitrary JSON, e.g. structured digest cards);
it is stored as `payload.data` and returned verbatim by the read endpoints.

A **template** is a destination channel (`email` | `tg` | `web`) plus a renderable `title` + `body`.
The actual address (your email / Telegram chat) is resolved from env at delivery time, never stored.
`web` templates are stored-only: the message is marked `delivered` immediately and surfaced via
the read endpoints.

## Quickstart

```sh
cp .env.example .env   # fill in secrets
npm install
npm run dev            # tsx watch on packages/api
```

Requires a running MongoDB (`DATABASE_URL`).

## Stack

Fastify · Mongoose · `@fastify/jwt` (HS256) · `@fastify/rate-limit` · Postmark · Telegram Bot API.
Built and published as a Docker image on GitHub release.
