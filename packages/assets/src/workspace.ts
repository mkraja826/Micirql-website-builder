import type { AssetRecord, AssetSlot } from "./types";

export type WorkspaceAssetStore = {
  getAsset(assetId: string): Promise<AssetRecord | undefined>;
  updateSectionAsset(args: {
    workspaceId: string;
    siteId: string;
    pagePath: string;
    sectionId: string;
    propPath: string;
    assetId: string;
  }): Promise<void>;
};

export type ReplaceAssetCommand = {
  workspaceId: string;
  siteId: string;
  slot: AssetSlot;
  assetId: string;
};

export async function replaceWorkspaceAsset(store: WorkspaceAssetStore, command: ReplaceAssetCommand): Promise<AssetRecord> {
  if (!command.slot.replaceable) throw new Error("This image slot is not replaceable.");

  const asset = await store.getAsset(command.assetId);
  if (!asset || !asset.active) throw new Error("Selected asset is unavailable.");
  if (asset.kind !== command.slot.requiredKind) throw new Error("Selected asset type does not match this slot.");
  if (asset.source === "user-upload" && asset.workspaceId !== command.workspaceId) {
    throw new Error("Workspace assets cannot be used across tenants.");
  }

  await store.updateSectionAsset({
    workspaceId: command.workspaceId,
    siteId: command.siteId,
    pagePath: command.slot.pagePath,
    sectionId: command.slot.sectionId,
    propPath: command.slot.propPath,
    assetId: asset.id,
  });

  return asset;
}

export function workspaceAssetPickerSources() {
  return [
    { id: "uploads", label: "My uploads", source: "user-upload" as const, priority: 1 },
    { id: "library", label: "MiCirql library", source: "micirql-placeholder" as const, priority: 2 },
    { id: "generate", label: "Generate image", source: "ai-generated" as const, priority: 3 },
  ];
}
