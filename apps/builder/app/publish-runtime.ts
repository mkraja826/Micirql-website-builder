import type { PublishDraft, PublishResult } from "@micirql/publisher";

export type PublishRuntime = {
  publish(draft: PublishDraft): Promise<PublishResult & { liveUrl?: string }>;
  rollback(args: { siteId: string; targetVersionId: string }): Promise<PublishResult & { liveUrl?: string }>;
};

let runtime: PublishRuntime | undefined;

export function configurePublishRuntime(next: PublishRuntime) {
  runtime = next;
}

export function getPublishRuntime(): PublishRuntime | undefined {
  return runtime;
}
