"use client";

import type { ThemeConfig } from "@micirql/schema";
import styles from "./brand-kit.module.css";

type Brand = ThemeConfig["brand"];

const COLOR_KEYS = ["primary","secondary","accent","background","surface","textPrimary"] as const;

export function BrandKit({ brand }: { brand: Brand }) {
  const presentation = brand.logoPresentation;
  const logo = brand.logoAssetId;
  const favicon = brand.faviconAssetId;
  const social = brand.socialImageAssetId;
  const cleanup = presentation?.cleanupApplied === true;
  const ready = Boolean(logo || favicon || social);

  return <section className={styles.kit} aria-label="Brand Kit">
    <div className={styles.header}>
      <div><span>Brand Kit</span><strong>Your generated brand assets</strong></div>
      <div className={styles.status}>{ready?"Ready":"Awaiting logo"}</div>
    </div>

    <div className={styles.assetGrid}>
      <div className={styles.asset}>
        <div className={styles.assetLabel}><span>Website logo</span><span>{cleanup?"Cleaned":"Original"}</span></div>
        {logo?<div className={styles.preview}><img src={logo} alt="Website logo preview"/></div>:<div className={styles.empty}>No logo uploaded</div>}
      </div>
      <div className={`${styles.asset} ${styles.favicon}`}>
        <div className={styles.assetLabel}><span>Icon</span></div>
        {favicon?<div className={styles.preview}><img src={favicon} alt="Favicon preview"/></div>:<div className={styles.empty}>—</div>}
      </div>
    </div>

    <div className={styles.social}>
      <div className={styles.assetLabel}><span>Social share card</span><span>1200 × 630</span></div>
      {social?<img src={social} alt="Social share card preview"/>:<div className={styles.socialEmpty}>A branded share card will appear here after generation.</div>}
    </div>

    <div className={styles.palette} aria-label="Approved website palette">
      {COLOR_KEYS.map(key=><div className={styles.color} key={key} title={`${key}: ${brand.colors[key]}`}>
        <div className={styles.colorSwatch} style={{background:brand.colors[key]}}/>
        <div className={styles.colorMeta}><strong>{humanize(key)}</strong><span>{brand.colors[key]}</span></div>
      </div>)}
    </div>

    <div className={styles.details}>
      <div className={styles.detail}><span>Logo treatment</span><strong>{presentation?humanize(presentation.treatment):"Automatic"}</strong></div>
      <div className={styles.detail}><span>Logo shape</span><strong>{presentation?humanize(presentation.shape):"Not measured"}</strong></div>
      <div className={styles.detail}><span>Background</span><strong>{presentation?.backgroundSignal?humanize(presentation.backgroundSignal):"Not measured"}</strong></div>
      <div className={styles.detail}><span>Favicon</span><strong>{brand.faviconStrategy?humanize(brand.faviconStrategy):favicon?"Generated":"Pending"}</strong></div>
      <div className={styles.detail}><span>Social image</span><strong>{brand.socialImageStrategy?humanize(brand.socialImageStrategy):social?"Generated":"Pending"}</strong></div>
    </div>

    <p className={styles.note}>{cleanup?"MiCirql preserved the original upload and uses a cleaned derivative on the website.":"Your original uploaded logo remains preserved. Website colors can change without altering the logo itself."}</p>
  </section>;
}

function humanize(value:string){return value.replace(/-/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,char=>char.toUpperCase())}
