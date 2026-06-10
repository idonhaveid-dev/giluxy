# GILUXY

GILUXY is a personal groupware app for collecting and operating the user's own work systems.

The first module is `Justrekking > Blog`, and later modules can include YouTube, photography, drone shooting, location planning, archives, and settings.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Reservation Monitor

- `api/check-reservation.js`: one-time reservation status check.
- `api/run-reservation-monitors.js`: scheduled monitor runner for Vercel Cron.
- `api/test-telegram.js`: manual Telegram alert test endpoint.
- `api/telegram-alert.js`: shared Telegram message sender. Tokens must stay in environment variables.
- `api/reservation-monitor-config.js`: server-side monitor list. Conditions saved only in browser localStorage are not visible to Cron yet.
- `api/foresttrip-region-search.js`: server-side 숲나들e region-list availability (see below).
- `vercel.json`: runs `/api/run-reservation-monitors` daily from the Seoul region on Vercel Hobby.
- For 10-minute monitoring, use Vercel Pro Cron or an external scheduler that calls `/api/run-reservation-monitors`.

Optional Vercel environment variables:

- `TELEGRAM_BOT_TOKEN`: Telegram bot token for alerts.
- `TELEGRAM_CHAT_ID`: Telegram chat ID that receives alerts.
- `RESERVATION_CRON_SECRET`: optional guard for manual monitor runs. If set, call `/api/run-reservation-monitors?secret=...` or use `Authorization: Bearer ...`.

Telegram setup:

1. Create a bot with BotFather and save the token only in Vercel environment variables.
2. Send any message to the bot from the Telegram account that should receive alerts.
3. Read `chat.id` from Telegram `getUpdates`.
4. Add `TELEGRAM_CHAT_ID` to Vercel.
5. Call `/api/test-telegram` once to confirm delivery.

Current automation boundary:

- The server checks availability and can send alerts.
- Login, CAPTCHA, booking confirmation, and payment stay manual.
- Without a persistent database, available-state alerts may repeat on each Cron run.

## Foresttrip Region Search (server-side)

숲나들e availability is detected **server-side** by reproducing the main-page search flow for
the region-only branch — no browser required. The per-facility detail page was unreliable from
serverless fetch; the region-list endpoint returns every facility's availability in one request.

Flow (`api/foresttrip-region-search.js`): `main.do` (cookies + `_csrf`) → `nf.foresttrip.go.kr/ts.wseq`
(`netfunnel_key`, pass-through opcode 5101) → `fcfsRsrvtRcrfrDtlDetls.do` (region list) → parse each
`<div class="rc_item">` card's `[예약가능]`/`[예약불가]` badge and 객실 수. `api/check-reservation.js`
maps a forest URL's `hmpgId` (or name) to `{ regionCode, matchName }` and detects the target inside the list.
The app dropdown is seeded from 187 Foresttrip facilities extracted from the same public main-page reservation data.

foresttrip.go.kr intermittently resets connections (`ECONNRESET`); the module retries with backoff.
A missing/invalid `netfunnel_key` returns a guard page ("비정상적인 접근…"), which the parser reports as `watching`.

Reproduce / inspect:

```bash
npm run probe:foresttrip                 # region=1, 2026-06-13 1박, target=유명산
npm run probe:foresttrip -- --keep       # dump raw responses into logs/foresttrip-probe/
```

Full investigation evidence (NetFunnel protocol, parameters, HTML structure, ECONNRESET, block text):
see [`docs/foresttrip-region-search.md`](docs/foresttrip-region-search.md).

Boundary: read-only. No login, reservation submit, payment, or CAPTCHA bypass. The `netfunnel_key`
is the same pass-through key the public page requests; queues are not bypassed.

## Foresttrip Browser Monitor (fallback)

For services or filters the server-side path does not cover, a local browser monitor is still available.
It reads visible page text only and never bypasses NetFunnel, CAPTCHA, login, or queue controls:

```bash
npm run monitor:foresttrip
```

What it does:

- Opens Chrome or Edge with a dedicated GILUXY browser profile.
- Reads the visible page text every 30 seconds.
- Sends a Telegram alert when visible text matches availability signals.

What it does not do:

- It does not bypass NetFunnel, CAPTCHA, login, or queue controls.
- It does not click reservation buttons, submit forms, confirm bookings, or pay.
- The PC and browser process must stay running.

Manual workflow:

1. Run `npm run monitor:foresttrip`.
2. In the opened browser, manually pass any queue/login flow.
3. Select the forest, date, and nights on the official page.
4. Leave the results page open. The script reads the visible text only.

Useful options:

```bash
npm run monitor:foresttrip -- --url "https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=ID02030087&menuId=002002002"
npm run monitor:foresttrip -- --interval 10
npm run monitor:foresttrip -- --once
```

Optional environment variables:

- `CHROME_PATH`: custom Chrome or Edge executable path.
- `FORESTTRIP_AVAILABLE_PATTERNS`: comma-separated regular expressions for availability text.
- `FORESTTRIP_CLOSED_PATTERNS`: comma-separated regular expressions for closed text.

## Project Direction

- This app is not a single blog editor.
- It is a groupware-style workspace that gathers multiple pages and operational systems under one app.
- `Justrekking` is one section, with `Blog` and `YouTube` as menu categories.
- `Photography` and `Drone Shooting` should be separate categories.
- Start small, but keep module boundaries clear so the app can grow without becoming a tangled single file.

## AI Coding Risk Notes

AI agents tend to create short-term solutions that work in the current session but become hard to maintain later. Treat the following as standing project rules.

### Common Problems

1. AI agent memory is not continuous. Similar functions, helpers, and shapes may be reimplemented in every session.
2. AI often ignores coupling. When features and files hold each other too tightly, changing one part breaks other parts.
3. AI-generated code often contains invisible coupling: implicit contracts, hidden imports, initialization-order dependencies, and shared global state.
4. Tests are often weak string checks, such as checking whether a function name exists.
5. Tests may overuse mocks in unnecessary places, increasing coupling between tests and production code.
6. Edge cases are often not handled.
7. Excessive nested control flow increases complexity.
8. Functions become too long, or one file grows into a god file.
9. File relationships and boundaries are not considered, leading to circular dependencies and painful refactoring.
10. Re-exports are left unmanaged.
11. Errors are silently swallowed, and excessive fallback or defensive code is scattered through callers.
12. Files are flattened without hierarchy or dependency direction.

## Required Checklist

### 1. Design-Time Checklist

- Write module and layer boundaries before implementation.
- Manage dependencies mechanically with lint rules.
- Define shared utilities, types, and shapes from a single source of truth.
- Structure directories by hierarchy, domain, and layer so dependency direction is visible.

### 2. Instruction-Time Checklist

- Do not swallow errors. Avoid empty `try/catch`, meaningless fallback, and repeated caller-side defensive code. Handle errors at boundaries or handlers.
- Avoid excessive nesting. If nesting reaches 3 levels, verify that it is necessary. Prefer early returns and guard clauses.
- Set limits for function and file size.
- Write edge-case tests first: empty input, `null`, boundary values, concurrency, and failure paths.
- Verify side effects in tests.
- Before creating a new function, helper, or shape, check whether an existing one already exists.

### 3. Review-Time Checklist

- Check whether duplicated code was created where existing code should have been replaced.
- Remove dead code and commented-out code.
- Check for silently swallowed errors.
- Check for hidden coupling, implicit contracts, initialization-order dependencies, shared global state, and side-effect-based module connections.
- Clean up re-exports.
- Check whether fan-in or fan-out is too concentrated in one place.

### 4. Rules To Enforce

- Use strict types.
- Do not use `as any` or `as unknown as`.
- If code has no TypeScript type support, expose contracts with JSDoc.
- Fail CI on circular dependencies and boundary violations.
- Use ESLint rules such as complexity, max-depth, and max-lines-per-function to reject excessive nesting and god functions.

### 5. Test Checklist

- Test behavior and output, not strings that merely prove implementation names exist.
- Do not chase coverage numbers without meaningful assertions.
- Mock only at external boundaries.
- Do not mock internal implementation details.
- Fix edge cases with tests: empty input, boundary values, `null`, and failure paths.
- Check whether production defensive code was added only to satisfy a test. If so, reconsider the test and the design.
