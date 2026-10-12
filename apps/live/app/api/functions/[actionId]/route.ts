import { handleProductionPublicFunctionRequest } from "../../../../function-gateway";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  const { actionId } = await context.params;
  return handleProductionPublicFunctionRequest(request, actionId);
}
