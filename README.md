# AI Shop System

Node.js + TypeScript MVP that replaces n8n workflows with an AI team for a Japanese collectible shop. Google Sheets is the initial database, Claude powers the CEO agent, and Gemini supplies the remaining structured agent decisions.

The project now includes a Fastify API, React dashboard, safety-focused manager final check, runtime workflow history, and a daily scheduler.

Phase 2 adds a Products and Assets workspace with live status filtering, missing-field visibility, content-capability guards, and a read-only raw-data boundary.

Phase 3 adds Marketing Strategy and Content/QA workspaces. Marketing reads the latest campaign run, while Content reads live `content_plan` queues and exposes guarded owner approval/rewrite actions.

Phase 4 adds Image Plans, Promotion Suggestions, and an Owner Approval Center. Image plans remain briefs only; promotion approval is blocked when direct discounts lack cost or margin data.

Phase 5 adds a Daily Report workspace with health scoring, workflow breakdowns, risk watch items, and recommended next actions from the report workflow.

## Included

- Product intake, product writing, and product QA
- CEO strategy and marketing campaign generation
- New-arrival-first and weekly content planning
- Content writing, QA, rewrite, and owner escalation states
- Image briefs constrained by real available assets
- Promotion suggestions that are always created as `suggested`
- Daily report health score, risk watch, and next-action queue
- Daily console reporting
- Prompt rules, approved examples, and error memory loaded from Sheets

## Setup

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env
```

Start the dashboard in development mode:

```bash
npm run dev
```

Open `http://localhost:5173`. Without API credentials the dashboard opens in clearly labelled Demo Mode. After credentials are configured it reads live Google Sheets data through the Fastify API.

Create a Google Cloud service account, enable Google Sheets API and Google Drive API, then share the target spreadsheet with `GOOGLE_CLIENT_EMAIL` as Editor. Put the spreadsheet ID and service account values in `.env`. Keep `GOOGLE_PRIVATE_KEY` quoted and preserve its `\n` sequences.

Add a Gemini API key to `GEMINI_API_KEY` and a Claude API key to `ANTHROPIC_API_KEY`. AI image draft generation also uses `GEMINI_API_KEY` with `GEMINI_IMAGE_MODEL` (default `gemini-2.5-flash-image`, Nano Banana). The default text models can be changed with `GEMINI_MODEL` and `ANTHROPIC_MODEL`.

Initialize all required tabs and headers:

```bash
npm run sheets:init
```

The initializer creates missing tabs but never deletes rows or overwrites a non-empty header row.

Validate external connections individually:

```bash
npm run test:sheets
npm run test:gemini
npm run test:claude
```

Import live sales and stock data from CSV:

```bash
npm run sales:import -- /absolute/path/to/sales.csv
npm run stock:import -- /absolute/path/to/stock.csv
```

If you want to protect admin-style API actions such as CSV import, set `API_ADMIN_TOKEN` and send it as the `x-admin-token` header.
The Settings page can store this token in the browser and automatically attach it to write actions.

Expected `sales.csv` columns can include:
`order_id`, `ordered_at`, `sku`, `product_name`, `quantity`, `net_sales`, `channel`, `order_status`, `note`

Expected `stock.csv` columns can include:
`sku`, `stock`, `cost_price`, `selling_price`

## Commands

```bash
npm run product:intake
npm run product:write
npm run product:qa
npm run ceo:daily
npm run marketing:campaign
npm run content:new-arrival
npm run content:plan
npm run content:write
npm run content:qa
npm run image:plan
npm run promo:suggest
npm run report:daily
npm run manager:final-check
npm run auto:once
npm run scheduler:start
npm run run:all
```

Validate the local installation without credentials or external API calls:

```bash
npm run dry-run
```

## Workflow Notes

- Add raw rows with unique `product_id` and `sku`; leave `status` empty or set it to `new`.
- `run:all` processes each queue in dependency order.
- New arrivals are sorted before older products.
- Unboxing is blocked in code unless the specialist identifies an opened-photo or video asset.
- Blind-box captions must explicitly say the design is random and cannot be selected.
- AI-created promotions can never bypass owner approval; new rows always use `status=suggested`.
- High-risk content moves to `owner_review_required`.

## Sheet Rules

Add active rules to `ai_prompt_rules`. QA failures with a correction instruction are appended to `error_memory`; future agents load those rules automatically. Owner-approved writing can be stored in `approved_examples`.

This version intentionally does not include Discord or direct social-platform publishing. Promotions and high-risk content still require owner approval.

## Dashboard API

- `GET /api/dashboard` returns metrics, workflow status, alerts, CEO direction, timeline, and ready-content rows.
- `GET /api/products` combines raw and processed product data for the Products workspace.
- `GET /api/marketing` returns the current campaign direction and latest Marketing workflow result.
- `GET /api/content` returns Content Writer, QA, rewrite, owner-review, and ready queues.
- `GET /api/images` returns image briefs with product asset and branded-product safety context.
- `GET /api/promotions` returns promotion suggestions and the combined owner-approval queue.
- `GET /api/reports` returns the Daily Report workspace data with metrics, workflow health, risks, and next actions.
- `GET /api/system/overview` returns integration readiness, import metadata, runtime settings, and workflow dependency status.
- `GET /api/docs/openapi.json` returns a lightweight OpenAPI document for integration work.
- `POST /api/imports/sales` imports sales orders from a local CSV path. Body: `{ "filePath": "/absolute/path/to/sales.csv" }`
- `POST /api/imports/stock` imports stock updates from a local CSV path. Body: `{ "filePath": "/absolute/path/to/stock.csv" }`
- `POST /api/imports/sales/json` imports sales orders from JSON rows. Example payload is in `templates/integrations/sales-orders.sample.json`
- `POST /api/imports/stock/json` imports stock updates from JSON rows. Example payload is in `templates/integrations/stock-updates.sample.json`
- `POST /api/strategy-actions/:id/status` updates a strategy action and syncs generated artifacts into Google Sheets when live credentials are configured.
- `POST /api/promotions/:id/approve|reject|hold` changes approval state without activating external promotions.
- `PATCH /api/products/:id/assets` updates only processed asset metadata and re-applies unboxing/review safety rules.
- `POST /api/workflows/:name/run` runs a workflow and returns a `run_id`.
- `POST /api/content/:id/approve` approves owner-review content.
- `POST /api/content/:id/rewrite` sends content back to the writer.
- `PUT /api/settings` changes Auto Mode for the current process.

The scheduler uses `DAILY_AUTO_RUN_TIME` and `DEFAULT_TIMEZONE`. It starts automatically with the server only when Google Sheets, Gemini, and Claude credentials all exist.

## Production Readiness

See `docs/production-checklist.md` for a practical launch checklist covering credentials, imports, smoke tests, and scheduler enablement.
