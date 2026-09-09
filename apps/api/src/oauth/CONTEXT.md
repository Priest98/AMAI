# Social integrations and TikTok context

## Purpose

This subsystem owns OAuth transactions, encrypted social credentials, refresh, connection health, account capability reporting, disconnect, and TikTok-native sign-in. `PublishingService` consumes mounted accounts; OAuth does not publish content.

## Platform mounting model

A `SocialAccount` with `CONNECTED` status and valid granted scopes is a mounted platform capability. `tiktok-capabilities.ts` derives authentication, upload, direct-post, and public-post capabilities; it does not assume all TikTok accounts or app review states support every operation. Disconnecting unmounts execution capability while preserving brand memory.

## Security invariants

- OAuth state is random, hashed, expiring, and single-use.
- Tokens are encrypted with `EncryptionService`, never returned to browser code or model context.
- Login intent requests identity scope only; connection intent requests product scopes.
- Validate callback state and webhook signatures. Refresh before expiry and fail closed when required scope is absent.
- `TIKTOK_CONTENT_AUDITED` is an external approval fact, not a convenience toggle.

## Entry points and tests

Start with `oauth.controller.ts`, `oauth.service.ts`, `connection-health.ts`, `tiktok-capabilities.ts`, `../queue/publishing.service.ts`, and `tests/tiktok-native-auth.test.cjs`. Legacy `oauth-system` is not part of the active workspace/runtime and must not be revived without an explicit migration decision.
