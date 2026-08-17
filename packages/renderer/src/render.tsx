import { Fragment, createElement } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { PreparedPage } from "./types";

export function renderPreparedPage(prepared: PreparedPage): ReactNode {
  const style = prepared.themeStyle as CSSProperties;
  const intelligence = prepared.site.theme.brand.intelligence;
  return (
    <main
      data-mi-site={prepared.site.siteId}
      data-mi-page={prepared.page.id}
      data-mi-theme={prepared.site.theme.family}
      data-mi-brand-density={prepared.site.theme.brand.density}
      data-mi-brand-shape={prepared.site.theme.brand.shape}
      data-mi-brand-motion={prepared.site.theme.brand.motion}
      data-mi-brand-tone={intelligence?.tone}
      data-mi-brand-button-style={intelligence?.buttonStyle}
      data-mi-brand-imagery-style={intelligence?.imageryStyle}
      style={style}
    >
      {prepared.sections.map(({ section, component, props }) => (
        <Fragment key={section.id}>
          {createElement(component.Component, {
            ...props,
            "data-mi-section-id": section.id,
            "data-mi-component-id": component.registry.id,
            "data-mi-component-version": component.registry.version,
          })}
        </Fragment>
      ))}
    </main>
  );
}

export function serializeJsonLd(prepared: PreparedPage): string[] {
  return prepared.seo.structuredData.map((item) => JSON.stringify(item).replace(/</g, "\\u003c"));
}
