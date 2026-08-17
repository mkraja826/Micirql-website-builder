alter table public.ai_usage_events
  drop constraint if exists ai_usage_events_task_check;

alter table public.ai_usage_events
  add constraint ai_usage_events_task_check
  check (
    task = any (
      array[
        'plan-site'::text,
        'generate-content'::text,
        'generate-image'::text,
        'build-component'::text
      ]
    )
  );
