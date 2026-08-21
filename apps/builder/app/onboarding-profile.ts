export type OnboardingProfile = {
  business_name?: string | null;
  industry?: string | null;
  subindustry?: string | null;
  location?: string | null;
  goals?: string[] | null;
  style_tags?: string[] | null;
  required_capabilities?: string[] | null;
  services?: string[] | null;
  notes?: string | null;
};