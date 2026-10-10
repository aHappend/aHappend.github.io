function createCityAtlas(atlas, getLanguage) {
  const viewport = atlas.querySelector(".atlas-viewport");
  const map = atlas.querySelector(".atlas-map");
  const markers = atlas.querySelector(".atlas-city-markers");
  const list = atlas.querySelector(".atlas-city-list");
  const status = atlas.querySelector(".atlas-city-status");
  const dialog = document.querySelector(".city-popover");
  const title = dialog.querySelector("h2");
  const residence = dialog.querySelector(".city-residence");
  const institution = dialog.querySelector(".city-institution");
  const gallery = dialog.querySelector(".city-gallery");
  const close = dialog.querySelector(".city-close");
  atlas.dataset.cityState = "loading";
  const entries = [];
  let selectedPlace = null;
  let trigger = null;
  let loadingError = false;
  let progress = 0;
  let projection = null;
  let renderedProgress = NaN;
  const institutions = {
    microsoft: { src: "institutions/microsoft.svg", name: { en: "Microsoft", zh: "微软" } },
    nju: { src: "institutions/nju.svg", name: { en: "Nanjing University", zh: "南京大学" } },
    ntu: { src: "institutions/ntu-lockup.png?v=20261004", name: { en: "Nanyang Technological University", zh: "南洋理工大学" } },
  };

  const text = (value) => value[getLanguage()];
  const localized = (value) => value && ["en", "zh"].every(
    (key) => typeof value[key] === "string" && value[key].trim()
  );
  const nonempty = (value) => typeof value === "string" && value.trim();
  const webLink = (value) => typeof value === "string"
    && /^https:\/\/[a-z0-9.-]+(?:[/?#][^\s]*)?$/i.test(value);

  function validate(data) {
    if (!data || !Array.isArray(data.places)) throw new TypeError("Expected a places array");
    const ids = new Set();
    for (const place of data.places) {
      if (!place || typeof place.id !== "string" || !/^[a-z0-9-]+$/.test(place.id) || ids.has(place.id)
        || !localized(place.name) || !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180
        || !Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90
        || !Array.isArray(place.photos) || !place.photos.length
        || (place.residence !== undefined && typeof place.residence !== "boolean")
        || (place.institution !== undefined && (typeof place.institution !== "string"
          || !Object.hasOwn(institutions, place.institution)))) {
        throw new TypeError("Each city needs a unique ID, bilingual name, coordinates, and photos");
      }
      ids.add(place.id);
      for (const photo of place.photos) {
        if (!photo || typeof photo.src !== "string"
          || !/^photos\/[a-z0-9_./-]+\.(avif|jpe?g|png|webp)$/i.test(photo.src)
          || photo.src.split("/").includes("..") || !localized(photo.alt)
          || (photo.caption !== undefined && !localized(photo.caption))
          || (photo.credit !== undefined && (!photo.credit
            || !["author", "title", "license"].every((key) => nonempty(photo.credit[key]))
            || !webLink(photo.credit.source) || !webLink(photo.credit.licenseUrl)
            || (photo.credit.changes !== undefined && !localized(photo.credit.changes))))) {
          throw new TypeError(`Invalid local photo or translation for city ${place.id}`);
        }
      }
    }
    return data.places;
  }

  function renderGallery() {
    title.textContent = text(selectedPlace.name);
    residence.hidden = !selectedPlace.residence;
    residence.textContent = getLanguage() === "zh" ? "久居之地" : "A place called home";
    institution.replaceChildren();
    institution.hidden = !selectedPlace.institution;
    if (selectedPlace.institution) {
      const identity = institutions[selectedPlace.institution];
      institution.className = `city-institution institution-logo institution-logo-${selectedPlace.institution}`;
      const logo = document.createElement("img");
      logo.alt = text(identity.name);
      logo.addEventListener("error", () => {
        if (institution.contains(logo)) {
          logo.hidden = true;
          institution.append(getLanguage() === "zh" ? "机构标识无法加载。" : "Institution logo could not be loaded.");
        }
        console.error("City institution logo could not be loaded:", identity.src);
      }, { once: true });
      logo.src = identity.src;
      institution.append(logo);
    }
    gallery.replaceChildren();
    for (const photo of selectedPlace.photos) {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      const caption = document.createElement("figcaption");
      image.alt = text(photo.alt);
      image.loading = "lazy";
      image.decoding = "async";
      const failure = document.createElement("p");
      failure.className = "city-photo-error";
      failure.hidden = true;
      failure.setAttribute("role", "status");
      failure.textContent = getLanguage() === "zh" ? "这张照片暂时无法加载。" : "This photo could not be loaded.";
      image.addEventListener("error", () => {
        image.hidden = true;
        failure.hidden = false;
        console.error("City photo could not be loaded:", photo.src);
      }, { once: true });
      image.src = photo.src;
      figure.append(image, failure);
      if (photo.caption) {
        caption.textContent = text(photo.caption);
      }
      if (photo.credit) {
        const credit = document.createElement("span");
        credit.className = "city-photo-credit";
        const source = document.createElement("a");
        source.href = photo.credit.source;
        source.textContent = photo.credit.author;
        source.title = photo.credit.title;
        const license = document.createElement("a");
        license.href = photo.credit.licenseUrl;
        license.textContent = photo.credit.license;
        for (const link of [source, license]) {
          link.className = "watercolor-hover";
          link.target = "_blank";
          link.rel = "noreferrer";
        }
        credit.append(source, " · ", license);
        if (photo.credit.changes) credit.append(` · ${text(photo.credit.changes)}`);
        caption.append(credit);
      }
      if (caption.hasChildNodes()) figure.append(caption);
      gallery.append(figure);
    }
  }

  function positionAlbum() {
    if (!dialog.matches(":popover-open")) return;
    const entry = entries.find(({ place }) => place === selectedPlace);
    const point = entry.anchor.getBoundingClientRect();
    const bounds = viewport.getBoundingClientRect();
    const onMap = point.left >= bounds.left && point.left <= bounds.right
      && point.top >= bounds.top && point.top <= bounds.bottom;
    const anchor = onMap ? point : trigger.getBoundingClientRect();
    const x = anchor.left + anchor.width / 2;
    const y = anchor.top + anchor.height / 2;
    const screenWidth = document.documentElement.clientWidth;
    const topEdge = document.querySelector(".site-header").getBoundingClientRect().bottom + 12;
    if (y < topEdge || y > innerHeight - 8 || x < 0 || x > screenWidth) {
      dialog.hidePopover();
      return;
    }
    dialog.style.maxHeight = `${Math.max(100, innerHeight - topEdge - 12)}px`;
    const width = dialog.offsetWidth;
    const height = dialog.offsetHeight;
    const right = x + 22 + width <= screenWidth - 12;
    const left = Math.max(12, Math.min(screenWidth - width - 12, right ? x + 22 : x - width - 22));
    const top = Math.max(topEdge, Math.min(innerHeight - height - 12, y - height * .3));
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
    dialog.style.setProperty("--city-retract-x", `${x - left}px`);
    dialog.style.setProperty("--city-retract-y", `${y - top}px`);
    dialog.dataset.side = right ? "right" : "left";
    dialog.dataset.anchor = onMap ? "map" : "list";
  }

  function open(place, control) {
    if (dialog.matches(":popover-open") && selectedPlace === place) {
      dialog.hidePopover();
      return;
    }
    if (dialog.matches(":popover-open")) dialog.hidePopover();
    selectedPlace = place;
    trigger = control;
    renderGallery();
    control.focus({ preventScroll: true });
    dialog.showPopover({ source: control });
    positionAlbum();
    dialog.scrollTop = gallery.scrollTop = 0;
    for (const { place: city, marker, button, anchor } of entries) {
      const active = city === place;
      marker.setAttribute("aria-expanded", String(active));
      button.setAttribute("aria-expanded", String(active));
      anchor.toggleAttribute("data-open", active);
    }
  }

  close.addEventListener("click", () => dialog.hidePopover());
  dialog.addEventListener("beforetoggle", (event) => {
    if (event.newState !== "closed") return;
    for (const { marker, button, anchor } of entries) {
      marker.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-expanded", "false");
      anchor.removeAttribute("data-open");
    }
    if (dialog.contains(document.activeElement)) trigger?.focus({ preventScroll: true });
  });
  new ResizeObserver(positionAlbum).observe(dialog);

  function updateLabels() {
    close.setAttribute("aria-label", getLanguage() === "zh" ? "关闭城市相册" : "Close city album");
    list.setAttribute("aria-label", getLanguage() === "zh" ? "城市相册" : "City albums");
    for (const { place, marker, button } of entries) {
      button.textContent = text(place.name);
      marker.textContent = text(place.name);
      button.dataset.residence = String(Boolean(place.residence));
      marker.setAttribute("aria-label", `${text(place.name)} · ${getLanguage() === "zh" ? "打开相册" : "Open album"}`);
      marker.title = text(place.name);
    }
    status.hidden = !loadingError;
    if (loadingError) status.textContent = getLanguage() === "zh"
      ? "城市相册数据暂时无法加载，地图仍可浏览。"
      : "City albums could not be loaded. The map is still available.";
    if (dialog.matches(":popover-open")) {
      renderGallery();
      positionAlbum();
    }
  }

  function resize() {
    const style = getComputedStyle(atlas);
    // Match SVG xMidYMid meet, including the portrait tablet's letterboxing.
    const { width, height } = map.getBoundingClientRect();
    const unit = Math.min(width / 1000, height / 500);
    const left = (width - 1000 * unit) / 2;
    const top = (height - 500 * unit) / 2;
    projection = {
      width, height, unit, left, top,
      zoom: Number(style.getPropertyValue("--atlas-zoom")),
      west: Number(style.getPropertyValue("--atlas-west")),
      x: Number(style.getPropertyValue("--atlas-x")),
      y: Number(style.getPropertyValue("--atlas-y")),
    };
    renderedProgress = NaN;
  }

  function update(nextProgress) {
    progress = nextProgress;
    if (!entries.length) return;
    if (!projection) resize();
    if (renderedProgress === progress) {
      positionAlbum();
      return;
    }
    renderedProgress = progress;
    const { width, height, unit, left, top, west } = projection;
    const zoom = 1 + progress * (projection.zoom - 1);
    const xOffset = progress * projection.x;
    const yOffset = progress * projection.y;
    const points = entries.map((entry) => {
      const { place } = entry;
      const longitude = ((place.longitude - west) % 360 + 360) % 360;
      const x = left + (longitude / 360 * 1000 * zoom + xOffset) * unit;
      const y = top + ((90 - place.latitude) / 180 * 500 * zoom + yOffset) * unit;
      const visible = x >= 0 && x <= width && y >= 0 && y <= height;
      return { ...entry, x, y, visible };
    });
    const occupied = [];
    for (const { anchor, marker, leader, button, x, y, visible } of points) {
      anchor.style.transform = `translate(${x}px, ${y}px)`;
      // Move only the callout; its dot and leader stay tied to the true coordinates.
      const halfWidth = 40;
      const halfHeight = 22;
      const offsets = [[56, -22], [-56, -22], [56, 30], [-56, 30],
        [0, -52], [0, 52], [56, -74], [-56, -74], [56, 82], [-56, 82]];
      const position = visible && offsets.map(([dx, dy]) => ({ dx, dy, x: x + dx, y: y + dy }))
        .find((p) => p.x - halfWidth >= 4 && p.x + halfWidth <= width - 4
          && p.y - halfHeight >= 4 && p.y + halfHeight <= height - 4
          && occupied.every((q) => Math.abs(p.x - q.x) >= 84 || Math.abs(p.y - q.y) >= 44)
          && points.every((q) => !q.visible || Math.abs(p.x - q.x) >= 48 || Math.abs(p.y - q.y) >= 30));
      marker.hidden = !position;
      leader.hidden = !position;
      if (!position && document.activeElement === marker) button.focus({ preventScroll: true });
      marker.tabIndex = position ? 0 : -1;
      marker.setAttribute("aria-hidden", String(!position));
      if (position) {
        occupied.push(position);
        marker.style.left = `${position.dx}px`;
        marker.style.top = `${position.dy}px`;
        leader.style.width = `${Math.hypot(position.dx, position.dy)}px`;
        leader.style.rotate = `${Math.atan2(position.dy, position.dx)}rad`;
      }
    }
    positionAlbum();
  }

  fetch("places.json", { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`City data request failed: HTTP ${response.status}`);
      return response.json();
    })
    .then(validate)
    .then((places) => {
      if (places.length && typeof dialog.showPopover !== "function") {
        throw new Error("City albums require native popover support");
      }
      for (const place of places) {
        const anchor = document.createElement("span");
        const dot = document.createElement("span");
        const leader = document.createElement("span");
        const marker = document.createElement("button");
        const button = document.createElement("button");
        anchor.className = "atlas-city-anchor";
        anchor.dataset.city = place.id;
        anchor.dataset.residence = String(Boolean(place.residence));
        dot.className = "atlas-city-dot";
        leader.className = "atlas-city-leader";
        dot.setAttribute("aria-hidden", "true");
        leader.setAttribute("aria-hidden", "true");
        marker.type = button.type = "button";
        marker.className = "atlas-city-marker";
        button.className = "watercolor-hover";
        marker.dataset.city = button.dataset.city = place.id;
        for (const control of [marker, button]) {
          control.setAttribute("aria-haspopup", "dialog");
          control.setAttribute("aria-controls", dialog.id);
          control.setAttribute("aria-expanded", "false");
          control.addEventListener("click", () => open(place, control));
        }
        anchor.append(leader, dot, marker);
        markers.append(anchor);
        list.append(button);
        entries.push({ place, anchor, marker, leader, button });
      }
      list.hidden = !places.length;
      atlas.dataset.cityState = "ready";
      updateLabels();
      update(progress);
    })
    .catch((error) => {
      loadingError = true;
      atlas.dataset.cityState = "error";
      console.error("City atlas initialization failed:", error);
      updateLabels();
    });

  return { update, updateLabels, resize };
}
