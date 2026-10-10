function createPhotoDeck(gallery, getLanguage) {
  const dialog = gallery.closest(".city-popover");
  const stack = document.createElement("div");
  const attribution = dialog.querySelector(".city-photo-credit");
  const status = document.createElement("output");
  stack.className = "city-photo-stack";
  status.className = "sr-only";
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  gallery.append(stack, status);
  gallery.setAttribute("role", "group");
  gallery.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight Home End");
  let photos = null;
  let prints = [];
  let active = 0;
  let gesture = null;
  let suppressClickUntil = 0;
  const text = value => value[getLanguage()];

  function renderAttribution() {
    const credit = photos[active].credit;
    attribution.replaceChildren();
    attribution.hidden = !credit;
    if (!credit) return;
    const source = document.createElement("a");
    const license = document.createElement("a");
    source.href = credit.source;
    source.textContent = credit.author;
    source.title = credit.title;
    license.href = credit.licenseUrl;
    license.textContent = credit.license;
    for (const link of [source, license]) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    attribution.append(getLanguage() === "zh" ? "图片 · " : "Photo · ", source, " · ", license);
    if (credit.changes) attribution.append(` · ${text(credit.changes)}`);
  }

  function cancelGesture() {
    const pointer = gesture?.pointer;
    gesture = null;
    stack.removeAttribute("data-dragging");
    stack.style.removeProperty("--photo-drag");
    stack.style.removeProperty("--photo-turn");
    if (pointer !== undefined && stack.hasPointerCapture(pointer)) stack.releasePointerCapture(pointer);
  }

  function arrange() {
    const count = photos.length;
    const nextIndex = (active + 1) % count;
    const previousIndex = (active - 1 + count) % count;
    for (const [index, print] of prints.entries()) {
      const depth = index === active ? 0 : index === nextIndex ? 1 : index === previousIndex ? 2 : 3;
      print.figure.dataset.depth = depth;
      print.figure.setAttribute("aria-hidden", String(depth === 3));
      print.button.tabIndex = index === active && count > 1 ? 0 : -1;
      print.figure.setAttribute("aria-current", String(index === active));
      if (depth < 3 && !print.image.hasAttribute("src")) {
        print.image.loading = depth === 0 ? "eager" : "lazy";
        print.image.src = photos[index].src;
      }
    }
    gallery.dataset.photoIndex = active;
    status.textContent = `${active + 1} / ${count}`;
    renderAttribution();
  }

  function select(index) {
    const focusInStack = stack.contains(document.activeElement);
    cancelGesture();
    active = (index + photos.length) % photos.length;
    arrange();
    if (focusInStack) prints[active].button.focus({ preventScroll: true });
  }

  gallery.addEventListener("keydown", event => {
    if (!photos || photos.length < 2 || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = event.key === "ArrowLeft" ? active - 1 : event.key === "ArrowRight" ? active + 1
      : event.key === "Home" ? 0 : event.key === "End" ? photos.length - 1 : null;
    if (index === null) return;
    event.preventDefault();
    select(index);
  });
  stack.addEventListener("click", event => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  stack.addEventListener("pointerdown", event => {
    if (!photos || photos.length < 2 || !event.isPrimary) return;
    suppressClickUntil = 0;
    if (event.pointerType === "mouse") return;
    gesture = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY,
      started: performance.now(), width: stack.getBoundingClientRect().width, dragging: false,
    };
  }, { passive: true });
  stack.addEventListener("pointermove", event => {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
      gesture.dragging = true;
      stack.setPointerCapture(event.pointerId);
      stack.setAttribute("data-dragging", "");
    }
    stack.style.setProperty("--photo-drag", `${Math.max(-90, Math.min(90, dx * .72))}px`);
    stack.style.setProperty("--photo-turn", `${Math.max(-4, Math.min(4, dx * .035))}deg`);
  }, { passive: true });
  stack.addEventListener("pointerup", event => {
    if (!gesture || gesture.pointer !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const speed = Math.abs(dx) / Math.max(1, performance.now() - gesture.started);
    const advance = Math.abs(dx) >= Math.min(60, gesture.width * .16)
      || (Math.abs(dx) > 18 && speed > .4);
    const dragging = gesture.dragging;
    if (dragging) suppressClickUntil = performance.now() + 350;
    cancelGesture();
    if (dragging && advance) select(active + (dx < 0 ? 1 : -1));
  });
  stack.addEventListener("pointercancel", cancelGesture);
  stack.addEventListener("lostpointercapture", event => {
    // A touch button's implicit capture also bubbles here when the stack takes over.
    if (event.target === stack) cancelGesture();
  });

  function render(nextPhotos) {
    cancelGesture();
    if (photos !== nextPhotos) active = 0;
    photos = nextPhotos;
    prints = [];
    stack.replaceChildren();
    dialog.toggleAttribute("data-multiple", photos.length > 1);
    const chinese = getLanguage() === "zh";
    gallery.setAttribute("aria-label", chinese ? "城市照片" : "City photographs");
    status.setAttribute("aria-label", chinese ? "照片序号" : "Photograph number");
    for (const [index, photo] of photos.entries()) {
      const figure = document.createElement("figure");
      const button = document.createElement("button");
      const image = document.createElement("img");
      const failure = document.createElement("span");
      figure.className = "city-print";
      figure.style.setProperty("--print-ratio", photo.width ? photo.width / photo.height : 1.5);
      button.type = "button";
      button.className = "city-photo-select";
      button.disabled = photos.length < 2;
      const action = photos.length > 1 ? `${chinese ? "下一张照片" : "Next photograph"} · ` : "";
      button.setAttribute("aria-label", `${action}${text(photo.alt)} · ${index + 1} / ${photos.length}`);
      image.alt = text(photo.alt);
      image.decoding = "async";
      image.draggable = false;
      if (photo.width) {
        image.width = photo.width;
        image.height = photo.height;
      }
      failure.className = "city-photo-error";
      failure.hidden = true;
      failure.setAttribute("role", "status");
      failure.textContent = chinese ? "这张照片暂时无法加载。" : "This photo could not be loaded.";
      image.addEventListener("load", () => button.setAttribute("data-loaded", ""), { once: true });
      image.addEventListener("error", () => {
        image.hidden = true;
        failure.hidden = false;
        console.error("City photo could not be loaded:", photo.src);
      }, { once: true });
      button.append(image, failure);
      figure.append(button);
      figure.addEventListener("click", () => {
        if (photos.length > 1) select(active + 1);
      });
      stack.append(figure);
      prints.push({ figure, button, image });
    }
    arrange();
  }

  return { render, cancelGesture };
}
