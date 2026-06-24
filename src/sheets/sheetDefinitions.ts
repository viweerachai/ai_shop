export const SHEET_HEADERS = {
  raw_products: [
    "product_id", "sku", "source_name", "source_description", "source_category",
    "source_price", "cost_price", "selling_price", "stock", "image_url_1",
    "image_url_2", "image_url_3", "product_url", "note", "status", "created_at", "updated_at"
  ],
  processed_products: [
    "product_id", "sku", "title_th", "short_description", "long_description", "keywords",
    "category", "product_type", "is_blind_box", "is_preorder", "is_new_arrival",
    "arrival_date", "stock", "cost_price", "selling_price", "margin_percent",
    "publish_priority", "launch_post_needed", "launch_post_done", "available_assets",
    "asset_note", "can_make_unboxing", "can_make_review", "can_make_product_showcase",
    "content_used_count", "last_content_date", "risk_level", "risk_note", "status",
    "created_at", "updated_at"
  ],
  product_assets: [
    "sku", "product_name", "drive_folder_id", "drive_folder_url",
    "asset_note", "created_at", "updated_at"
  ],
  content_plan: [
    "content_id", "week", "content_type", "theme", "related_product_sku",
    "target_platform", "status", "idea", "caption_draft", "hashtags", "writer_note",
    "content_key", "risk_note", "final_risk_level", "qa_status", "qa_score", "qa_issues", "qa_note",
    "manager_decision", "rewrite_instruction", "image_type", "image_prompt",
    "image_concept", "image_text", "image_note", "image_status", "publish_date",
    "owner_status", "created_at", "updated_at", "generated_image_url",
    "generated_image_file", "generated_image_provider", "generated_image_model",
    "generated_image_prompt", "generated_image_at", "image_approval_status"
  ],
  ai_prompt_rules: ["rule_id", "type", "content", "active", "created_at", "updated_at"],
  trend_signals: [
    "trend_id", "keyword", "category", "related_sku", "trend_level",
    "source", "note", "start_date", "end_date", "active", "created_at", "updated_at"
  ],
  promotion_plan: [
    "promo_id", "promo_type", "related_product_sku", "bundle_sku", "discount_type",
    "discount_value", "start_date", "end_date", "reason", "expected_goal", "risk_note",
    "manager_note", "status", "created_by", "created_at", "approved_at"
  ],
  sales_orders: [
    "order_id", "ordered_at", "sku", "product_name", "quantity",
    "net_sales", "channel", "order_status", "note"
  ],
  error_memory: [
    "error_id", "source", "error_type", "description", "correction_rule",
    "example_bad", "example_good", "active", "created_at"
  ],
  approved_examples: ["example_id", "type", "content", "note", "active", "created_at"]
} as const;

export type SheetName = keyof typeof SHEET_HEADERS;
