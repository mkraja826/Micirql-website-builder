"use client";

import { useEffect, useState } from "react";
import type { AssetRecord } from "@micirql/assets";

export function AssetPicker({ workspaceId, domain, theme, family, onSelect }: {
  workspaceId: string;
  domain: string;
  theme: string;
  family: string;
  onSelect(asset: AssetRecord): void;
}) {
  const [source, setSource] = useState("user-upload");
  const [assets, setAssets] = useState<AssetRecord[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ workspaceId, domain, theme, family, source });
    void fetch(`/api/assets?${params.toString()}`)
      .then((response) => response.json())
      .then((payload: { assets: AssetRecord[] }) => setAssets(payload.assets));
  }, [workspaceId, domain, theme, family, source]);

  return <div className="asset-picker">
    <div className="asset-source-tabs">
      <button onClick={() => setSource("user-upload")}>My uploads</button>
      <button onClick={() => setSource("micirql-placeholder")}>MiCirql library</button>
      <button onClick={() => setSource("ai-generated")}>Generate</button>
    </div>
    <div className="asset-grid">
      {assets.map((asset) => <button className="asset-card" key={asset.id} onClick={() => onSelect(asset)}>
        <img src={asset.originalUrl} alt={asset.alt} />
        <span>{asset.name}</span>
      </button>)}
    </div>
  </div>;
}
