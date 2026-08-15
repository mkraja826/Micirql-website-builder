import type { UploadGateway, UploadPrincipal } from "@micirql/assets";

let gateway: UploadGateway | undefined;

export function configureUploadGateway(next: UploadGateway) {
  gateway = next;
}

export function productionUploadGateway(): UploadGateway | undefined {
  return gateway;
}

export function requestPrincipal(request: Request, workspaceId: string): UploadPrincipal | undefined {
  const userId = request.headers.get("x-micirql-user-id")?.trim();
  if (!userId || !workspaceId.trim()) return undefined;
  return { userId, workspaceId };
}
