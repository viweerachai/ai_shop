export interface AgentContext {
  rules: string[];
  errors: string[];
  approvedExamples: string[];
}

export interface CeoStrategy {
  shop_priority: string;
  priority_products: string[];
  focus_categories: string[];
  weekly_direction: string;
  instruction_to_marketing: string;
  instruction_to_manager: string;
}

export interface MarketingCampaign {
  campaign_name: string;
  target_customer: string;
  key_message: string;
  content_mix: string[];
  product_focus: string[];
  recommended_content_ideas: string[];
  promotion_ideas: string[];
  warning_rules: string[];
}
