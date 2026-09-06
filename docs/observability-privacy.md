# Oyinca observability privacy policy

Oyinca keeps PostHog for product events and optional session replay, Sentry for client and server failures, Vercel logs for runtime operations, and its own database for structured Brain decisions.

## Session replay

Replay is disabled unless `NEXT_PUBLIC_SESSION_REPLAY_ENABLED=true`. It is always blocked on authentication, verification, password recovery, API, and every `/dashboard` route. `NEXT_PUBLIC_SESSION_REPLAY_ALLOWED_PATHS` may narrow the public allowlist but cannot override those hard blocks.

Even on an allowed route, all text and form inputs are masked. Elements marked `data-private` or `data-session-replay-block` are blocked. The implementation records interaction layout for public UX diagnosis; it does not record private product content.

Recommended production configuration:

```text
NEXT_PUBLIC_SESSION_REPLAY_ENABLED=false
NEXT_PUBLIC_SESSION_REPLAY_ALLOWED_PATHS=/,/pricing
```

Enable it only after confirming PostHog retention, region, access controls, and data-processing terms. Review recordings in a staging project before enabling production sampling.

## Product events

`capture()` and `identify()` pass properties through a central sanitizer. Property names associated with email, passwords, tokens, authorization, cookies, payment or card data, messages, captions, prompts, completions, media, files, and URLs are removed. Complex objects and arrays are also removed; events carry only small scalar identifiers and coarse states.

## Brain decision records

`BrainDecision` stores organization and brand scope, a correlation ID, bounded objective and decision labels, reason codes, skill/provider/model identifiers, context-section names, latency, token and cost metadata when known, and outcome. It never stores prompts, completions, raw context, source bodies, credentials, or private chain-of-thought.

Decision tracing is best-effort. A trace write failure returns `false` and cannot fail generation, scheduling, publishing, or another customer operation.

## Review checklist

- Keep replay disabled on private routes and confirm route tests before deployment.
- Keep all customer-authored content out of analytics properties and structured logs.
- Use internal UUIDs rather than email addresses for analytics identity.
- Restrict PostHog, Sentry, Vercel, and admin observability access by role.
- Set documented retention and deletion periods in each provider.
- Treat session replay access as access to customer data and audit it accordingly.
- Never add prompt or completion columns to `BrainDecision`.

