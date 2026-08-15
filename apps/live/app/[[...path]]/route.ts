import { serveLiveRequest } from "../../live-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return serveLiveRequest(request);
}

export async function HEAD(request: Request) {
  const response = await serveLiveRequest(request);
  return new Response(null, { status: response.status, headers: response.headers });
}
