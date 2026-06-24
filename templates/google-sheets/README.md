Google Sheets CSV templates for AI Shop System

Import each CSV file into a separate sheet tab using the same tab name as the file name.

Recommended sheet tab names:
- raw_products
- processed_products
- content_plan
- ai_prompt_rules
- trend_signals
- promotion_plan
- sales_orders
- error_memory
- approved_examples

Notes:
- Keep the first row as headers.
- Do not rename header columns.
- Prefer ISO datetime format, for example: 2026-06-17T09:00:00.000Z
- Boolean-like fields should use a consistent format such as TRUE/FALSE or true/false.
- `trend_signals` is for current popularity signals. Use `trend_level` = high/medium/low and set `active` TRUE only for trends the owner wants AI to use.
