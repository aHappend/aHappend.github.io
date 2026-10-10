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
  gallery.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight");
  let photos = null;
  let prints = [];
  let active = 0;
  let gesture = null;
  let suppressClickUntil = 0;
  const text = value => value[getLanguage()];

  function updatePrintLabels(print, index) {
    const chinese = getLanguage() === "zh";
    const action = photos.length > 1 ? `${chinese ? "下一张照片" : "Next photograph"} · ` : "";
    print.button.setAttribute("aria-label", `${action}${text(photos[index].alt)} · ${index + 1} / ${photos.length}`);
    print.image.alt = text(photos[index].alt);
    print.retry.textContent = chinese ? "重试" : "Retry";
    print.failure.textContent = print.state === "error"
      ? (print.timedOut
        ? (chinese ? "照片加载超时，请重试。" : "Photo loading timed out. Please retry.")
        : (chinese ? "这张照片暂时无法加载。" : "This photo could not be loaded."))
      : (chinese ? "照片加载中…" : "Loading photograph…");
  }

  function updateLabels() {
    const chinese = getLanguage() === "zh";
    gallery.setAttribute("aria-label", chinese ? "城市照片" : "City photographs");
    status.setAttribute("aria-label", chinese ? "照片序号" : "Photograph number");
    prints.forEach(updatePrintLabels);
  }

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

  function loadNextPhoto() {
    const front = prints[active];
    if (front.state === "waiting") front.load();
    if (front.state !== "loaded" || prints.some(print => print.state === "loading")) return;
    for (let depth = 1; depth < Math.min(3, prints.length); depth++) {
      const next = prints[(active + depth) % prints.length];
      if (next.state === "waiting") {
        next.load();
        return;
      }
    }
  }

  function arrange() {
    const count = photos.length;
    for (const [index, print] of prints.entries()) {
      const depth = (index - active + count) % count;
      print.figure.dataset.depth = depth;
      print.figure.style.zIndex = count - depth;
      print.figure.toggleAttribute("data-queued", depth >= 3);
      print.figure.setAttribute("aria-hidden", String(depth >= 3));
      print.button.tabIndex = index === active && count > 1 ? 0 : -1;
      print.figure.setAttribute("aria-current", String(index === active));
      print.image.fetchPriority = depth === 0 ? "high" : "low";
      if (depth >= 3) print.cancel();
    }
    gallery.dataset.photoIndex = active;
    status.textContent = `${active + 1} / ${count}`;
    renderAttribution();
    loadNextPhoto();
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
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    select(active + 1);
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
      if (Math.abs(dy) >= 12 && Math.abs(dy) >= Math.abs(dx)) {
        cancelGesture();
        return;
      }
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
    if (dragging && advance) select(active + 1);
  });
  stack.addEventListener("pointercancel", cancelGesture);
  stack.addEventListener("lostpointercapture", event => {
    // A touch button's implicit capture also bubbles here when the stack takes over.
    if (event.target === stack) cancelGesture();
  });

  function render(nextPhotos) {
    cancelGesture();
    if (photos === nextPhotos) {
      updateLabels();
      arrange();
      return;
    }
    for (const print of prints) print.cancel();
    active = 0;
    photos = nextPhotos;
    prints = [];
    stack.replaceChildren();
    dialog.toggleAttribute("data-multiple", photos.length > 1);
    for (const [index, photo] of photos.entries()) {
      const figure = document.createElement("figure");
      const button = document.createElement("button");
      const image = document.createElement("img");
      const failure = document.createElement("span");
      const retry = document.createElement("button");
      const preview = photo.mobileSrc || photo.src;
      let timer = null;
      const print = {
        figure, button, image, failure, retry, state: "waiting", timedOut: false,
        load(retrying = false) {
          clearTimeout(timer);
          print.state = "loading";
          figure.removeAttribute("data-error");
          failure.hidden = false;
          retry.hidden = true;
          updatePrintLabels(print, index);
          image.loading = "eager";
          timer = setTimeout(() => failed(true), 15000);
          image.src = preview + (retrying ? `?retry=${Date.now()}` : "");
          loaded();
        },
        cancel() {
          if (print.state !== "loading") return;
          clearTimeout(timer);
          print.state = "waiting";
          image.removeAttribute("src");
        },
      };
      figure.className = "city-print";
      const ratio = photo.width ? photo.width / photo.height : 1.5;
      figure.style.setProperty("--print-ratio", ratio);
      figure.style.setProperty("--print-width-factor", Math.min(1, ratio));
      button.type = "button";
      button.className = "city-photo-select";
      button.disabled = photos.length < 2;
      image.decoding = "async";
      image.draggable = false;
      if (photo.width) {
        image.width = photo.width;
        image.height = photo.height;
      }
      failure.className = "city-photo-error";
      failure.hidden = false;
      failure.setAttribute("role", "status");
      retry.type = "button";
      retry.className = "city-photo-retry";
      retry.hidden = true;
      retry.addEventListener("click", event => {
        event.stopPropagation();
        cancelGesture();
        print.load(true);
      });
      function loaded() {
        if (print.state !== "loading" || !image.complete || !image.naturalWidth) return;
        clearTimeout(timer);
        print.state = "loaded";
        button.setAttribute("data-loaded", "");
        image.hidden = false;
        failure.hidden = retry.hidden = true;
        figure.removeAttribute("data-error");
        loadNextPhoto();
      }
      function failed(timedOut = false) {
        if (print.state !== "loading") return;
        clearTimeout(timer);
        print.state = "error";
        print.timedOut = timedOut;
        button.removeAttribute("data-loaded");
        figure.setAttribute("data-error", "");
        image.hidden = true;
        failure.hidden = false;
        retry.hidden = false;
        updatePrintLabels(print, index);
        image.removeAttribute("src");
        console.error(timedOut ? "City photo request timed out:" : "City photo could not be loaded:", preview);
        loadNextPhoto();
      }
      image.addEventListener("load", loaded);
      image.addEventListener("error", () => {
        if (image.complete && !image.naturalWidth) failed();
      });
      button.append(image, failure);
      figure.append(button, retry);
      figure.addEventListener("click", () => {
        if (photos.length > 1) select(active + 1);
      });
      stack.append(figure);
      prints.push(print);
    }
    updateLabels();
    arrange();
  }

  return { render, cancelGesture };
}
