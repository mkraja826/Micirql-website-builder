import { handleLiveRequest, type LiveRuntimeDependencies } from "@micirql/live-runtime";

let dependencies: LiveRuntimeDependencies | undefined;

export function configureLiveHostRuntime(next: LiveRuntimeDependencies) {
  dependencies = next;
}

export async function serveLiveRequest(request: Request) {
  if (!dependencies) {
    return new Response("Live site runtime is not configured.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return handleLiveRequest(request, dependencies);
}
