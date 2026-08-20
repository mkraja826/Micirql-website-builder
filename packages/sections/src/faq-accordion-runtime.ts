export function installFaqAccordions(root: ParentNode = document): () => void {
  const host = root as ParentNode & { ownerDocument?: Document };
  const doc = root instanceof Document ? root : host.ownerDocument ?? document;
  const groups = Array.from(root.querySelectorAll<HTMLElement>("[data-mi-faq]"));
  const items = Array.from(root.querySelectorAll<HTMLDetailsElement>("details[data-mi-faq-item]"));

  function summaries(group: Element) {
    return Array.from(group.querySelectorAll<HTMLElement>("[data-mi-faq-summary]"));
  }

  function itemForSummary(summary: Element | null) {
    return summary?.closest<HTMLDetailsElement>("details[data-mi-faq-item]") ?? null;
  }

  function groupFor(item: Element | null) {
    return item?.closest<HTMLElement>("[data-mi-faq]") ?? null;
  }

  function sync(item: HTMLDetailsElement) {
    const summary = item.querySelector<HTMLElement>("[data-mi-faq-summary]");
    if (summary) summary.setAttribute("aria-expanded", item.open ? "true" : "false");
    item.dataset.miFaqState = item.open ? "open" : "closed";
  }

  function enforceSingle(item: HTMLDetailsElement) {
    if (!item.open) return;
    const group = groupFor(item);
    if (!group || group.dataset.miFaqMode !== "single") return;
    for (const sibling of Array.from(group.querySelectorAll<HTMLDetailsElement>("details[data-mi-faq-item]"))) {
      if (sibling !== item && sibling.open) {
        sibling.open = false;
        sync(sibling);
      }
    }
  }

  function openFromHash(scroll = false) {
    const raw = doc.defaultView?.location.hash ?? "";
    if (!raw || raw.length < 2) return;
    let id = "";
    try { id = decodeURIComponent(raw.slice(1)); } catch { return; }
    const target = doc.getElementById(id);
    if (!target) return;
    const rootNode = root as unknown as Node;
    if (!(root instanceof Document) && !rootNode.contains(target)) return;
    const item = target.matches("details[data-mi-faq-item]") ? target as HTMLDetailsElement : target.closest<HTMLDetailsElement>("details[data-mi-faq-item]");
    if (!item) return;
    item.open = true;
    enforceSingle(item);
    sync(item);
    if (scroll) item.scrollIntoView({ block: "center", behavior: "auto" });
  }

  function onKeyDown(event: Event) {
    if (!(event instanceof KeyboardEvent)) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-mi-faq-summary]") : null;
    if (!target) return;
    const item = itemForSummary(target);
    const group = groupFor(item);
    if (!group) return;
    const controls = summaries(group);
    const index = controls.indexOf(target);
    if (index < 0) return;

    let next = -1;
    if (event.key === "ArrowDown") next = (index + 1) % controls.length;
    else if (event.key === "ArrowUp") next = (index - 1 + controls.length) % controls.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = controls.length - 1;
    if (next < 0) return;
    event.preventDefault();
    controls[next]?.focus();
  }

  function onHashChange() {
    openFromHash(true);
  }

  const toggleHandlers = items.map((item) => {
    const handler = () => {
      enforceSingle(item);
      sync(item);
    };
    item.addEventListener("toggle", handler);
    sync(item);
    return { item, handler };
  });

  groups.forEach((group) => {
    const mode = group.dataset.miFaqMode;
    if (mode !== "single" && mode !== "multi") group.dataset.miFaqMode = "single";
  });

  root.addEventListener("keydown", onKeyDown);
  doc.defaultView?.addEventListener("hashchange", onHashChange);
  openFromHash(false);

  return () => {
    root.removeEventListener("keydown", onKeyDown);
    doc.defaultView?.removeEventListener("hashchange", onHashChange);
    toggleHandlers.forEach(({ item, handler }) => item.removeEventListener("toggle", handler));
  };
}

export function faqAccordionRuntimeScript(): string {
  return `<script data-mi-faq-runtime>(${installFaqAccordions.toString()})(document);</script>`;
}
