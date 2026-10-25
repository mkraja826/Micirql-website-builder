import type { UploadGateway } from "@micirql/assets";

let gateway: UploadGateway | undefined;

export function configureUploadGateway(next: UploadGateway) {
  gateway = next;
}

export function productionUploadGateway(): UploadGateway | undefined {
  return gateway;
}
