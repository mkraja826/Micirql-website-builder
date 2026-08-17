import { MICIRQL_RUNTIME_CSS } from "../../../generated/runtime-css";

export const dynamic = "force-static";

export function GET() {
  return new Response(MICIRQL_RUNTIME_CSS, {
    status: 200,
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=31536000, immutable",
    },
  });
}
