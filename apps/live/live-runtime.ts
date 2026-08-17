import { handleLiveRequest, type LiveRuntimeDependencies } from "@micirql/live-runtime";

let dependencies: LiveRuntimeDependencies | undefined;
const RUNTIME_STYLESHEET = '<link rel="stylesheet" href="/__micirql/runtime.css">';

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

  const response = await handleLiveRequest(request, dependencies);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") || request.method.toUpperCase() === "HEAD") return response;

  const html = await response.text();
  if (html.includes("/__micirql/runtime.css")) return cloneResponse(response, html);
  const styled = html.includes("</head>")
    ? html.replace("</head>", `${RUNTIME_STYLESHEET}</head>`)
    : `${RUNTIME_STYLESHEET}${html}`;
  return cloneResponse(response, styled);
}

function cloneResponse(response: Response, body: string) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
