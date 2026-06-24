# Production Checklist

## 1. Credentials

- Set `GOOGLE_CLIENT_EMAIL`
- Set `GOOGLE_PRIVATE_KEY`
- Set `GOOGLE_SHEET_ID`
- Set `GEMINI_API_KEY`
- Set `ANTHROPIC_API_KEY`
- Optionally set `API_ADMIN_TOKEN`

## 2. Data sources

- Import historical `sales_orders`
- Import current `stock`
- Confirm `processed_products` contains `cost_price`, `selling_price`, and `stock`
- Confirm the CEO page shows the correct sales source label

## 3. Operational checks

- Run `npm run sheets:init`
- Run `npm run test:sheets`
- Run `npm run test:gemini`
- Run `npm run test:claude`
- Open `/api/system/overview`
- Open `/api/docs/openapi.json`

## 4. Live workflow smoke test

Run these in order:

1. `product:intake`
2. `product:write`
3. `product:qa`
4. `ceo:daily`
5. `marketing:campaign`
6. `content:plan`
7. `content:write`
8. `content:qa`
9. `image:plan`
10. `promo:suggest`
11. `manager:final-check`
12. `report:daily`

## 5. Optional connector patterns

- Push sales rows to `POST /api/imports/sales/json`
- Push stock rows to `POST /api/imports/stock/json`
- Use `x-admin-token` when `API_ADMIN_TOKEN` is enabled
- Sample payloads live in `templates/integrations/`

## 6. Before enabling scheduler

- Verify all workflow dependencies show `ready` in Settings
- Confirm `AUTO_MODE`, `AUTO_PUBLISH`, `AUTO_APPROVE_MIN_SCORE`, and `AUTO_APPROVE_MAX_RISK`
- Confirm `DAILY_AUTO_RUN_TIME`
- Start the server and make sure the scheduler only runs after all credentials are present
