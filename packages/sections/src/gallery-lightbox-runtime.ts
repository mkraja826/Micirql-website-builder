export function installGalleryLightboxes(root: ParentNode = document): () => void {
  const host = root as ParentNode & { ownerDocument?: Document };
  const doc = root instanceof Document ? root : host.ownerDocument ?? document;
  const dialogs = Array.from(root.querySelectorAll<HTMLDialogElement>("[data-mi-gallery-lightbox]"));
  const lastTrigger = new WeakMap<HTMLDialogElement, HTMLElement>();
  const activeIndex = new WeakMap<HTMLDialogElement, number>();
  const touchStart = new WeakMap<HTMLDialogElement, { x: number; y: number }>();

  function triggersFor(dialog: HTMLDialogElement) {
    const section = dialog.closest(".mi-gallery-section");
    return section ? Array.from(section.querySelectorAll<HTMLElement>("[data-mi-gallery-open]")) : [];
  }

  function render(dialog: HTMLDialogElement, index: number) {
    const triggers = triggersFor(dialog);
    if (!triggers.length) return;
    const normalized = ((index % triggers.length) + triggers.length) % triggers.length;
    const trigger = triggers[normalized]!;
    const image = dialog.querySelector<HTMLImageElement>("[data-mi-gallery-lightbox-image]");
    const title = dialog.querySelector<HTMLElement>("[data-mi-gallery-lightbox-title]");
    const description = dialog.querySelector<HTMLElement>("[data-mi-gallery-lightbox-description]");
    const position = dialog.querySelector<HTMLElement>("[data-mi-gallery-lightbox-position]");
    const src = trigger.dataset.miGallerySrc ?? trigger.querySelector("img")?.getAttribute("src") ?? "";
    const alt = trigger.dataset.miGalleryAlt ?? trigger.querySelector("img")?.getAttribute("alt") ?? "Gallery image";
    const label = trigger.dataset.miGalleryTitle ?? alt;
    const detail = trigger.dataset.miGalleryDescription ?? "";

    if (image) {
      image.src = src;
      image.alt = alt;
    }
    if (title) title.textContent = label;
    if (description) {
      description.textContent = detail;
      description.hidden = !detail;
    }
    if (position) position.textContent = `${normalized + 1} of ${triggers.length}`;
    activeIndex.set(dialog, normalized);
  }

  function open(trigger: HTMLElement) {
    const section = trigger.closest(".mi-gallery-section");
    const dialog = section?.querySelector<HTMLDialogElement>("[data-mi-gallery-lightbox]");
    if (!dialog) return;
    const triggers = triggersFor(dialog);
    const index = Math.max(0, triggers.indexOf(trigger));
    lastTrigger.set(dialog, trigger);
    render(dialog, index);
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
      dialog.setAttribute("aria-modal", "true");
    }
    dialog.querySelector<HTMLElement>("[data-mi-gallery-close]")?.focus();
  }

  function close(dialog: HTMLDialogElement) {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else {
      dialog.removeAttribute("open");
      dialog.removeAttribute("aria-modal");
      lastTrigger.get(dialog)?.focus();
    }
  }

  function step(dialog: HTMLDialogElement, delta: number) {
    render(dialog, (activeIndex.get(dialog) ?? 0) + delta);
  }

  function onClick(event: Event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const opener = target.closest<HTMLElement>("[data-mi-gallery-open]");
    if (opener && root.contains(opener)) {
      event.preventDefault();
      open(opener);
      return;
    }
    const dialog = target.closest<HTMLDialogElement>("[data-mi-gallery-lightbox]");
    if (!dialog || !root.contains(dialog)) return;
    if (target.closest("[data-mi-gallery-close]")) {
      event.preventDefault();
      close(dialog);
    } else if (target.closest("[data-mi-gallery-prev]")) {
      event.preventDefault();
      step(dialog, -1);
    } else if (target.closest("[data-mi-gallery-next]")) {
      event.preventDefault();
      step(dialog, 1);
    } else if (target === dialog) {
      close(dialog);
    }
  }

  function onKeyDown(event: Event) {
    if (!(event instanceof KeyboardEvent)) return;
    const target = event.target instanceof Element ? event.target : null;
    const dialog = target?.closest<HTMLDialogElement>("[data-mi-gallery-lightbox]") ?? dialogs.find((candidate) => candidate.open);
    if (!dialog?.open) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(dialog, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(dialog, 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(dialog);
    }
  }

  function onTouchStart(event: Event) {
    if (!(event instanceof TouchEvent) || event.touches.length !== 1) return;
    const target = event.target instanceof Element ? event.target : null;
    const dialog = target?.closest<HTMLDialogElement>("[data-mi-gallery-lightbox]");
    if (!dialog || target?.closest("button,a,input,select,textarea")) return;
    const touch = event.touches[0]!;
    touchStart.set(dialog, { x: touch.clientX, y: touch.clientY });
  }

  function onTouchEnd(event: Event) {
    if (!(event instanceof TouchEvent) || event.changedTouches.length !== 1) return;
    const target = event.target instanceof Element ? event.target : null;
    const dialog = target?.closest<HTMLDialogElement>("[data-mi-gallery-lightbox]");
    const start = dialog ? touchStart.get(dialog) : undefined;
    if (!dialog || !start || target?.closest("button,a,input,select,textarea")) return;
    const touch = event.changedTouches[0]!;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    touchStart.delete(dialog);
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
    step(dialog, dx < 0 ? 1 : -1);
  }

  const closeHandlers = dialogs.map((dialog) => {
    const handler = () => lastTrigger.get(dialog)?.focus();
    dialog.addEventListener("close", handler);
    return { dialog, handler };
  });

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("touchstart", onTouchStart, { passive: true });
  root.addEventListener("touchend", onTouchEnd, { passive: true });

  return () => {
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("touchstart", onTouchStart);
    root.removeEventListener("touchend", onTouchEnd);
    closeHandlers.forEach(({ dialog, handler }) => dialog.removeEventListener("close", handler));
  };
}

export function galleryLightboxRuntimeScript(): string {
  return `<script data-mi-gallery-lightbox-runtime>(${installGalleryLightboxes.toString()})(document);</script>`;
}
