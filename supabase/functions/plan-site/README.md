# plan-site runtime

The deployed `plan-site` Supabase Edge Function consumes `industry_context.certifiedLayoutCandidates`, ranks only certified layouts, and passes the selected compact layout contract to `plan_site_blueprint` as `p_layout_blueprint`.

The database RPC validates the selected layout ID against `certified_layout_contracts` before using its section contract. When no certified layout is available, the planner keeps the legacy industry-pack section fallback.

Production deployment corresponding to this planner contract: Supabase project `Micirql webbuilder`, `plan-site` v11.
