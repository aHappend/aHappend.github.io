function createCityAtlas(atlas, getLanguage) {
  const viewport = atlas.querySelector(".atlas-viewport");
  const map = atlas.querySelector(".atlas-map");
  const geography = atlas.querySelector(".atlas-geography");
  const cityLabel = atlas.querySelector(".atlas-city-label");
  const markers = atlas.querySelector(".atlas-city-markers");
  const list = atlas.querySelector(".atlas-city-list");
  const status = atlas.querySelector(".atlas-city-status");
  const dialog = document.querySelector(".city-popover");
  const title = dialog.querySelector("h2");
  const residence = dialog.querySelector(".city-residence");
  const institution = dialog.querySelector(".city-institution");
  const gallery = dialog.querySelector(".city-gallery");
  const regionLayer = atlas.querySelector(".atlas-city-regions");
  const regionCredit = dialog.querySelector(".city-region-credit");
  const photoDeck = createPhotoDeck(gallery, getLanguage);
  const close = dialog.querySelector(".city-close");
  const header = document.querySelector(".site-header");
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  atlas.dataset.cityState = "loading";
  const entries = [];
  let selectedPlace = null;
  let trigger = null;
  let loadingError = false;
  let progress = 0;
  let projection = null;
  let projectionDirty = true;
  let renderedProgress = NaN;
  let camera = null;
  let savedCamera = null;
  let cameraState = "base";
  let cameraFrame = null;
  let animation = null;
  let restoredProgress = 0;
  let resumeRequested = false;
  let closing = false;
  let lastMode = atlas.dataset.atlasMode;
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
        || (place.region !== undefined && (typeof place.region !== "string" || !/^[a-z0-9-]+$/.test(place.region)))
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
          || ((photo.width !== undefined || photo.height !== undefined)
            && (![photo.width, photo.height].every(value => Number.isSafeInteger(value) && value > 0)))
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

  function validateRegions(data) {
    if (!data || data.west !== Number(getComputedStyle(atlas).getPropertyValue("--atlas-west"))
      || !Array.isArray(data.regions)) throw new TypeError("Invalid city-region projection");
    const regions = new Map();
    for (const region of data.regions) {
      if (!region || typeof region.id !== "string" || !/^[a-z0-9-]+$/.test(region.id) || regions.has(region.id)
        || typeof region.path !== "string" || !/^M[MLZ\d.,-]+$/.test(region.path)
        || !Array.isArray(region.bounds) || region.bounds.length !== 4
        || !region.bounds.every(Number.isFinite)
        || region.bounds[0] < 0 || region.bounds[1] < 0
        || region.bounds[2] > 1000 || region.bounds[3] > 500
        || region.bounds[0] >= region.bounds[2] || region.bounds[1] >= region.bounds[3]
        || (region.credit !== undefined && (!region.credit
          || !nonempty(region.credit.label) || !nonempty(region.credit.license)
          || !webLink(region.credit.source) || !webLink(region.credit.licenseUrl)))) {
        throw new TypeError("Invalid administrative-region outline");
      }
      regions.set(region.id, region);
    }
    return regions;
  }

  function renderGallery() {
    title.textContent = text(selectedPlace.name);
    cityLabel.textContent = text(selectedPlace.name);
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
    const credit = entries.find(entry => entry.place === selectedPlace).region?.credit;
    regionCredit.replaceChildren();
    regionCredit.hidden = !credit;
    if (credit) {
      const source = document.createElement("a");
      const license = document.createElement("a");
      source.href = credit.source;
      source.textContent = credit.label;
      license.href = credit.licenseUrl;
      license.textContent = credit.license;
      for (const link of [source, license]) {
        link.target = "_blank";
        link.rel = "noreferrer";
      }
      regionCredit.append(source, " · ", license);
    }
    photoDeck.render(selectedPlace.photos);
  }

  function positionAlbum() {
    if (closing || !dialog.matches(":popover-open")) return;
    const entry = entries.find(({ place }) => place === selectedPlace);
    const point = entry.anchor.getBoundingClientRect();
    const bounds = viewport.getBoundingClientRect();
    const regionalPhone = Boolean(entry.region) && projection.stacked && projection.width <= 600;
    const topEdge = Math.max(header.getBoundingClientRect().bottom + 12,
      projection.stacked && !regionalPhone ? bounds.top : 0);
    const onMap = point.left >= bounds.left && point.left <= bounds.right
      && point.top >= bounds.top && point.top <= bounds.bottom
      && point.top >= topEdge && point.top <= innerHeight - 8;
    const anchor = onMap ? point : entry.button.getBoundingClientRect();
    const x = anchor.left + anchor.width / 2;
    const y = anchor.top + anchor.height / 2;
    const screenWidth = document.documentElement.clientWidth;
    if (y < topEdge || y > innerHeight - 8 || x < 0 || x > screenWidth) {
      dialog.hidePopover();
      return;
    }
    const available = regionalPhone
      ? Math.min(350, Math.max(244, bounds.top - topEdge - 12 + bounds.height * .18))
      : Math.max(100, innerHeight - topEdge - 12);
    dialog.style.setProperty("--city-available-height", `${Math.min(available, innerHeight - topEdge - 12)}px`);
    const width = dialog.offsetWidth;
    const height = dialog.offsetHeight;
    let right = x + 22 + width <= screenWidth - 12;
    let preferredLeft = right ? x + 22 : x - width - 22;
    if (entry.region && camera && !regionalPhone) {
      const [west, , east] = entry.region.bounds;
      const edgeLeft = bounds.left + projection.left + (west * camera.zoom + camera.x) * projection.unit;
      const edgeRight = bounds.left + projection.left + (east * camera.zoom + camera.x) * projection.unit;
      if (edgeRight + 18 + width <= screenWidth - 12) {
        preferredLeft = Math.max(x + 22, edgeRight + 18);
        right = true;
      } else if (edgeLeft - width - 18 >= 12) {
        preferredLeft = Math.min(x - width - 22, edgeLeft - width - 18);
        right = false;
      }
    }
    const left = Math.max(12, Math.min(screenWidth - width - 12, preferredLeft));
    const preferredTop = regionalPhone ? bounds.top + bounds.height * .18 - height - 8 : y - height * .3;
    const top = Math.max(topEdge, Math.min(innerHeight - height - 12, preferredTop));
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
    dialog.style.setProperty("--city-retract-x", `${x - left}px`);
    dialog.style.setProperty("--city-retract-y", `${y - top}px`);
    dialog.dataset.side = right ? "right" : "left";
    dialog.dataset.anchor = onMap ? "map" : "list";
    dialog.dataset.placement = regionalPhone ? "above-map" : "beside-map";
  }

  function open(place, control) {
    if (dialog.matches(":popover-open") && selectedPlace === place) {
      dialog.hidePopover();
      return;
    }
    if (dialog.matches(":popover-open")) dialog.hidePopover();
    if (!savedCamera) savedCamera = readCamera();
    selectedPlace = place;
    trigger = control;
    renderGallery();
    control.focus({ preventScroll: true });
    closing = false;
    atlas.dataset.cityFocus = place.id;
    if (place.region) atlas.dataset.cityRegion = place.region;
    else atlas.removeAttribute("data-city-region");
    dialog.showPopover({ source: control });
    dialog.scrollTop = gallery.scrollTop = 0;
    for (const { place: city, marker, button, anchor, regionPath } of entries) {
      const active = city === place;
      marker.setAttribute("aria-expanded", String(active));
      button.setAttribute("aria-expanded", String(active));
      anchor.toggleAttribute("data-open", active);
      regionPath?.toggleAttribute("data-active", active);
    }
    animateCamera(() => cityCamera(place), "focusing", () => setCameraState("focused"));
  }

  close.addEventListener("click", () => dialog.hidePopover());
  function clearRegion() {
    atlas.removeAttribute("data-city-region");
    for (const { regionPath } of entries) regionPath?.removeAttribute("data-active");
  }

  dialog.addEventListener("beforetoggle", (event) => {
    if (event.newState !== "closed") return;
    closing = true;
    photoDeck.cancelGesture();
    atlas.removeAttribute("data-city-focus");
    for (const { marker, button, anchor } of entries) {
      marker.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-expanded", "false");
      anchor.removeAttribute("data-open");
    }
    if (dialog.contains(document.activeElement)) trigger?.focus({ preventScroll: true });
    if (savedCamera) {
      const destination = savedCamera;
      animateCamera(() => destination, "returning", () => {
        savedCamera = null;
        restoredProgress = progress;
        clearRegion();
        setCameraState("restored");
      });
    } else clearRegion();
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
      ? "城市相册或行政区数据暂时无法加载，世界地图仍可浏览。"
      : "City albums or region outlines could not be loaded. The world map is still available.";
    if (dialog.matches(":popover-open")) {
      renderGallery();
      positionAlbum();
    }
  }

  function resize() {
    const style = getComputedStyle(atlas);
    // Match SVG xMidYMid meet, including the portrait tablet's letterboxing.
    const { width, height, top: mapTop } = map.getBoundingClientRect();
    const unit = Math.min(width / 1000, height / 500);
    const left = (width - 1000 * unit) / 2;
    const top = (height - 500 * unit) / 2;
    projection = {
      width, height, unit, left, top,
      zoom: Number(style.getPropertyValue("--atlas-zoom")),
      west: Number(style.getPropertyValue("--atlas-west")),
      x: Number(style.getPropertyValue("--atlas-x")),
      y: Number(style.getPropertyValue("--atlas-y")),
      cardWidth: parseFloat(getComputedStyle(dialog).width),
      stacked: atlas.querySelector(".atlas-controls").getBoundingClientRect().bottom <= mapTop,
    };
    projectionDirty = true;
    renderedProgress = NaN;
  }

  function baseCamera() {
    return {
      zoom: 1 + progress * (projection.zoom - 1),
      x: progress * projection.x, y: progress * projection.y, progress,
    };
  }

  function readCamera() {
    if (camera) return { ...camera };
    // Capture the visible frame, not the endpoint of a manual CSS transition.
    const matrix = new DOMMatrixReadOnly(getComputedStyle(geography).transform);
    return {
      zoom: matrix.a, x: matrix.e, y: matrix.f,
      progress: Number(getComputedStyle(atlas).getPropertyValue("--atlas-progress")),
    };
  }

  function cityCamera(place) {
    const { width, height, left, top, unit, west, cardWidth } = projection;
    const region = entries.find(entry => entry.place === place).region;
    if (region) {
      const [x1, y1, x2, y2] = region.bounds;
      const availableBeside = width - cardWidth - 64;
      const aboveMap = projection.stacked && width <= 600;
      const frameRight = !aboveMap && availableBeside >= 96 ? 24 + availableBeside : width - 24;
      const frameTop = aboveMap ? height * .3 + 12 : 24;
      const frameBottom = height - 20;
      const zoom = Math.min(512, (frameRight - 24) / ((x2 - x1) * unit),
        (frameBottom - frameTop) / ((y2 - y1) * unit));
      return {
        zoom,
        x: ((24 + frameRight) / 2 - left) / unit - (x1 + x2) / 2 * zoom,
        y: ((frameTop + frameBottom) / 2 - top) / unit - (y1 + y2) / 2 * zoom,
        progress: savedCamera.progress,
      };
    }
    const longitude = ((place.longitude - west) % 360 + 360) % 360;
    const besideCard = width - cardWidth - 44;
    const center = besideCard >= 88 ? besideCard / 2
      : width - Math.max(22, (width - cardWidth - 22) / 2);
    const zoom = 12;
    return {
      zoom,
      x: (center - left) / unit - longitude / 360 * 1000 * zoom,
      y: (height / 2 - top) / unit - (90 - place.latitude) / 180 * 500 * zoom,
      progress: savedCamera.progress,
    };
  }

  function setCameraState(state) {
    cameraState = state;
    atlas.dataset.cameraState = state;
  }

  function renderCamera(view) {
    camera = view;
    // Whole-world SVG masks become enormous offscreen surfaces at city scale.
    atlas.toggleAttribute("data-city-detail", view.zoom > 12);
    atlas.style.setProperty("--atlas-progress", view.progress.toFixed(4));
    geography.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
    renderPoints(view);
  }

  const cameraMotion = () => !motionPreference.matches
    && document.documentElement.dataset.effects !== "off" && !document.hidden;

  function finishAnimation() {
    if (!animation) return;
    const active = animation;
    cancelAnimationFrame(cameraFrame);
    cameraFrame = null;
    renderCamera(active.destination());
    if (animation !== active) return;
    animation = null;
    active.finish();
  }

  function animateCamera(destination, state, finish) {
    const source = readCamera();
    resize();
    cancelAnimationFrame(cameraFrame);
    cameraFrame = null;
    const active = { source, destination, finish, start: performance.now() };
    animation = active;
    setCameraState(state);
    if (!cameraMotion()) {
      finishAnimation();
      return;
    }
    renderCamera(source);
    if (animation !== active) return;
    function frame(now) {
      cameraFrame = null;
      if (!cameraMotion()) {
        finishAnimation();
        return;
      }
      // Print/rotation can change the SVG before the parent resize observer fires.
      const { width, height } = map.getBoundingClientRect();
      if (width !== projection.width || height !== projection.height) resize();
      const fraction = Math.min(1, (now - active.start) / 560);
      const eased = 1 - (1 - fraction) ** 3;
      const target = destination();
      const view = {};
      for (const key of ["zoom", "x", "y", "progress"]) {
        view[key] = source[key] + (target[key] - source[key]) * eased;
      }
      renderCamera(view);
      // Positioning can dismiss an album that has scrolled offscreen.
      if (animation !== active) return;
      if (fraction < 1) {
        cameraFrame = requestAnimationFrame(frame);
      } else {
        animation = null;
        finish();
      }
    }
    cameraFrame = requestAnimationFrame(frame);
  }

  function resumeCamera() {
    if (dialog.matches(":popover-open")) dialog.hidePopover();
    savedCamera = null;
    animateCamera(baseCamera, "resuming", () => {
      camera = null;
      geography.style.removeProperty("transform");
      // Commit the endpoint before manual CSS transitions become active again.
      geography.getBoundingClientRect();
      clearRegion();
      setCameraState("base");
      renderedProgress = NaN;
      update(progress);
    });
  }

  function update(nextProgress) {
    const mode = atlas.dataset.atlasMode;
    const explicitView = resumeRequested || mode !== lastMode;
    resumeRequested = false;
    lastMode = mode;
    progress = nextProgress;
    if (!projection) resize();
    if (cameraState !== "base" && (explicitView
      || (cameraState === "restored" && progress !== restoredProgress))) {
      resumeCamera();
      return;
    }
    if (animation) {
      if (!cameraMotion()) finishAnimation();
      else if (projectionDirty && camera) renderPoints(camera);
      else positionAlbum();
      return;
    }
    if (camera) {
      renderCamera(cameraState === "focused" ? cityCamera(selectedPlace) : camera);
      return;
    }
    atlas.style.setProperty("--atlas-progress", progress.toFixed(4));
    if (renderedProgress === progress) {
      positionAlbum();
      return;
    }
    renderedProgress = progress;
    renderPoints(baseCamera());
  }

  motionPreference.addEventListener("change", () => {
    if (!cameraMotion()) finishAnimation();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) finishAnimation();
  });
  window.addEventListener("beforeprint", finishAnimation);

  function renderPoints(view) {
    projectionDirty = false;
    const { width, height, unit, left, top, west } = projection;
    const { zoom, x: xOffset, y: yOffset } = view;
    const points = entries.map((entry) => {
      const { place } = entry;
      const longitude = ((place.longitude - west) % 360 + 360) % 360;
      const x = left + (longitude / 360 * 1000 * zoom + xOffset) * unit;
      const y = top + ((90 - place.latitude) / 180 * 500 * zoom + yOffset) * unit;
      const visible = x >= 0 && x <= width && y >= 0 && y <= height;
      return { ...entry, x, y, visible };
    });
    if (atlas.hasAttribute("data-city-focus")) {
      points.sort((a, b) => Number(b.place === selectedPlace) - Number(a.place === selectedPlace));
    }
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

  async function loadJson(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`City data request failed: ${path}, HTTP ${response.status}`);
    return response.json();
  }

  Promise.all([loadJson("places.json"), loadJson("art/city-regions.json")])
    .then(([data, regionData]) => {
      const places = validate(data);
      const regions = validateRegions(regionData);
      for (const place of places) {
        if (place.region && !regions.has(place.region)) throw new TypeError(`Missing region outline: ${place.region}`);
      }
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
        const region = place.region ? regions.get(place.region) : null;
        let regionPath = null;
        if (region) {
          regionPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          regionPath.classList.add("atlas-city-region");
          regionPath.dataset.city = place.id;
          regionPath.setAttribute("fill-rule", "evenodd");
          regionPath.setAttribute("d", region.path);
          regionLayer.append(regionPath);
        }
        entries.push({ place, anchor, marker, leader, button, region, regionPath });
      }
      list.hidden = !places.length;
      atlas.dataset.cityState = "ready";
      renderedProgress = NaN;
      updateLabels();
      update(progress);
    })
    .catch((error) => {
      loadingError = true;
      atlas.dataset.cityState = "error";
      console.error("City atlas initialization failed:", error);
      updateLabels();
    });

  return { update, updateLabels, resize, resume: () => { resumeRequested = true; } };
}
