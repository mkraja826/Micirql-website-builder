const tools = ["Content", "Images", "Design", "Pages", "SEO", "Functions", "Domain"];

export default function BuilderHome() {
  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <div>
          <p className="workspace-kicker">MiCirql Workspace</p>
          <strong>Untitled website</strong>
        </div>
        <div className="workspace-actions">
          <button className="ghost-button" type="button">Preview</button>
          <button className="primary-button" type="button">Publish</button>
        </div>
      </header>

      <section className="workspace-toolbar" aria-label="Workspace controls">
        <button className="page-picker" type="button">Home <span>⌄</span></button>
        <div className="viewport-switcher" aria-label="Preview size">
          <button className="active" type="button">Mobile</button>
          <button type="button">Desktop</button>
        </div>
      </section>

      <div className="workspace-layout">
        <aside className="desktop-panel" aria-label="Editor tools">
          <p className="panel-label">Edit website</p>
          <nav className="tool-list">
            {tools.map((tool, index) => (
              <button className={index === 0 ? "tool active" : "tool"} key={tool} type="button">
                <span>{tool}</span>
                <span aria-hidden>›</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="preview-stage" aria-label="Live website preview">
          <div className="preview-device">
            <div className="preview-browserbar">
              <span />
              <span />
              <span />
              <p>your-site.micirql.com</p>
            </div>
            <div className="preview-content">
              <div className="preview-nav">
                <div className="preview-logo">Your logo</div>
                <button type="button" aria-label="Menu">☰</button>
              </div>
              <section className="preview-hero">
                <p className="preview-eyebrow">Your business</p>
                <h1>Your website appears here as you edit.</h1>
                <p>Change text, images, design, pages and functionality without touching code.</p>
                <button type="button">Primary action</button>
              </section>
              <section className="preview-placeholder-grid">
                <article><span>01</span><strong>Service or feature</strong></article>
                <article><span>02</span><strong>Service or feature</strong></article>
                <article><span>03</span><strong>Service or feature</strong></article>
              </section>
            </div>
          </div>
        </section>

        <aside className="context-panel" aria-label="Context editor">
          <p className="panel-label">Content</p>
          <h2>Home page</h2>
          <p className="panel-copy">Select any section in the preview to edit only the content that section supports.</p>
          <div className="context-card">
            <span>Nothing selected</span>
            <p>Tap a section in the preview to edit text, buttons or images.</p>
          </div>
        </aside>
      </div>

      <nav className="mobile-editor-nav" aria-label="Mobile editor">
        {tools.slice(0, 5).map((tool, index) => (
          <button className={index === 0 ? "active" : ""} key={tool} type="button">
            <span className="nav-dot" />
            {tool}
          </button>
        ))}
        <button type="button"><span className="nav-dot" />More</button>
      </nav>
    </main>
  );
}
