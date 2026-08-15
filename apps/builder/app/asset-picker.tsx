"use client";

import { useEffect, useState } from "react";
import type { AssetRecord } from "@micirql/assets";
import { uploadWorkspaceImage } from "./upload-client";

export function AssetPicker({ workspaceId, siteId, pagePath, sectionId, domain, theme, family, currentAssetId, onSelect }: {
  workspaceId: string;
  siteId: string;
  pagePath: string;
  sectionId: string;
  domain: string;
  theme: string;
  family: string;
  currentAssetId?: string;
  onSelect(asset: AssetRecord, overrides?: { alt?: string; focalPoint?: { x: number; y: number } }): void;
}) {
  const [source, setSource] = useState<"user-upload" | "micirql-placeholder" | "ai-generated">("user-upload");
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [selected, setSelected] = useState<AssetRecord | undefined>();
  const [alt, setAlt] = useState("");
  const [focalX, setFocalX] = useState(.5);
  const [focalY, setFocalY] = useState(.5);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [uploadPercent, setUploadPercent] = useState<number | undefined>();

  useEffect(() => { void refresh(); }, [workspaceId, domain, theme, family, source]);
  useEffect(() => {
    const match = assets.find((asset) => asset.id === currentAssetId);
    if (match) choose(match);
  }, [assets, currentAssetId]);

  async function refresh() {
    const params = new URLSearchParams({ workspaceId, domain, theme, family, source });
    const response = await fetch(`/api/assets?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json() as { assets?: AssetRecord[] };
    setAssets(payload.assets ?? []);
  }

  function choose(asset: AssetRecord) {
    setSelected(asset);
    setAlt(asset.alt);
    setFocalX(asset.focalPoint.x);
    setFocalY(asset.focalPoint.y);
  }

  async function upload(file: File) {
    setStatus("Preparing upload…");
    setUploadPercent(0);
    try {
      const asset = await uploadWorkspaceImage({
        workspaceId,
        siteId,
        file,
        onProgress(progress) {
          setUploadPercent(progress.percent);
          setStatus(progress.phase === "processing" ? "Optimizing image…" : progress.phase === "complete" ? "Uploaded" : `Uploading… ${progress.percent}%`);
        },
      });
      setSource("user-upload");
      choose(asset);
      await refresh();
      setStatus("Uploaded");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadPercent(undefined);
    }
  }

  async function generate() {
    if (!prompt.trim()) return;
    setStatus("Generating…");
    const response = await fetch("/api/assets/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, siteId, pagePath, sectionId, family, domain, prompt: prompt.trim() }),
    });
    const payload = await response.json() as { asset?: AssetRecord; error?: string };
    if (!response.ok || !payload.asset) {
      setStatus(payload.error ?? "Generation unavailable.");
      return;
    }
    choose(payload.asset);
    setStatus("Generated");
  }

  return <div className="asset-picker">
    <div className="asset-source-tabs">
      <button className={source === "user-upload" ? "is-active" : ""} onClick={() => setSource("user-upload")}>My uploads</button>
      <button className={source === "micirql-placeholder" ? "is-active" : ""} onClick={() => setSource("micirql-placeholder")}>MiCirql library</button>
      <button className={source === "ai-generated" ? "is-active" : ""} onClick={() => setSource("ai-generated")}>Generate</button>
    </div>

    {source === "user-upload" ? <label className="asset-upload">Upload image<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label> : null}
    {uploadPercent !== undefined ? <progress className="asset-upload-progress" max={100} value={uploadPercent}>{uploadPercent}%</progress> : null}
    {source === "ai-generated" ? <div className="asset-generate"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the image you need" /><button onClick={() => void generate()}>Generate image</button></div> : null}

    {source !== "ai-generated" ? <div className="asset-grid">
      {assets.map((asset) => <button className={`asset-card ${selected?.id === asset.id ? "is-selected" : ""}`} key={asset.id} onClick={() => choose(asset)}>
        <img src={asset.originalUrl} alt={asset.alt} />
        <span>{asset.name}</span>
      </button>)}
    </div> : null}

    {selected ? <div className="asset-details">
      <label>Alt text<input value={alt} onChange={(event) => setAlt(event.target.value)} /></label>
      <label>Horizontal focus<input type="range" min="0" max="1" step="0.01" value={focalX} onChange={(event) => setFocalX(Number(event.target.value))} /></label>
      <label>Vertical focus<input type="range" min="0" max="1" step="0.01" value={focalY} onChange={(event) => setFocalY(Number(event.target.value))} /></label>
      <button className="asset-apply" onClick={() => onSelect(selected, { alt, focalPoint: { x: focalX, y: focalY } })}>Use this image</button>
    </div> : null}
    {status ? <p className="asset-status" role="status">{status}</p> : null}
  </div>;
}
