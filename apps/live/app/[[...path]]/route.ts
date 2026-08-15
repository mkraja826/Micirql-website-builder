import { serveLiveRequest } from "../../live-runtime";
import { ensureLiveRuntimeConfigured } from "../../runtime-bootstrap";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureLiveRuntimeConfigured();
  return serveLiveRequest(request);
}

export async function HEAD(request: Request) {
  ensureLiveRuntimeConfigured();
  const response = await serveLiveRequest(request);
  return new Response(null, { status: response.status, headers: response.headers });
}
