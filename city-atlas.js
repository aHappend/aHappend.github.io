function createCityAtlas(atlas, getLanguage) {
  const viewport = atlas.querySelector(".atlas-viewport");
  const map = atlas.querySelector(".atlas-map");
  const markers = atlas.querySelector(".atlas-city-markers");
  const list = atlas.querySelector(".atlas-city-list");
  const status = atlas.querySelector(".atlas-city-status");
  const dialog = document.querySelector(".city-dialog");
  const title = dialog.querySelector("h2");
  const gallery = dialog.querySelector(".city-gallery");
  const close = dialog.querySelector(".city-close");
  const entries = [];
  let selectedPlace = null;
  let loadingError = false;
  let progress = 0;

  const text = (value) => value[getLanguage()];
  const localized = (value) => value && ["en", "zh"].every(
    (key) => typeof value[key] === "string" && value[key].trim()
  );

  function validate(data) {
    if (!data || !Array.isArray(data.places)) throw new TypeError("Expected a places array");
    const ids = new Set();
    for (const place of data.places) {
      if (!place || typeof place.id !== "string" || !/^[a-z0-9-]+$/.test(place.id) || ids.has(place.id)
        || !localized(place.name) || !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180
        || !Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90
        || !Array.isArray(place.photos) || !place.photos.length) {
        throw new TypeError("Each city needs a unique ID, bilingual name, coordinates, and photos");
      }
      ids.add(place.id);
      for (const photo of place.photos) {
        if (!photo || typeof photo.src !== "string"
          || !/^photos\/[a-z0-9_./-]+\.(avif|jpe?g|png|webp)$/i.test(photo.src)
          || photo.src.split("/").includes("..") || !localized(photo.alt)
          || (photo.caption !== undefined && !localized(photo.caption))) {
          throw new TypeError(`Invalid local photo or translation for city ${place.id}`);
        }
      }
    }
    return data.places;
  }

  function renderGallery() {
    title.textContent = text(selectedPlace.name);
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
        figure.append(caption);
      }
      gallery.append(figure);
    }
  }

  function open(place) {
    selectedPlace = place;
    renderGallery();
    dialog.showModal();
    document.documentElement.classList.add("city-opened");
  }

  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("city-opened");
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });

  function updateLabels() {
    close.setAttribute("aria-label", getLanguage() === "zh" ? "关闭城市相册" : "Close city album");
    list.setAttribute("aria-label", getLanguage() === "zh" ? "城市相册" : "City albums");
    for (const { place, marker, button } of entries) {
      button.textContent = text(place.name);
      marker.setAttribute("aria-label", `${text(place.name)} · ${getLanguage() === "zh" ? "打开相册" : "Open album"}`);
      marker.title = text(place.name);
    }
    status.hidden = !loadingError;
    if (loadingError) status.textContent = getLanguage() === "zh"
      ? "城市相册数据暂时无法加载，地图仍可浏览。"
      : "City albums could not be loaded. The map is still available.";
    if (dialog.open) renderGallery();
  }

  function update(nextProgress) {
    progress = nextProgress;
    if (!entries.length) return;
    const style = getComputedStyle(atlas);
    const zoom = 1 + progress * (Number(style.getPropertyValue("--atlas-zoom")) - 1);
    const west = Number(style.getPropertyValue("--atlas-west"));
    const xOffset = progress * Number(style.getPropertyValue("--atlas-x"));
    const yOffset = progress * Number(style.getPropertyValue("--atlas-y"));
    // Match SVG xMidYMid meet, including the portrait tablet's letterboxing.
    const { width, height } = map.getBoundingClientRect();
    const unit = Math.min(width / 1000, height / 500);
    const left = (width - 1000 * unit) / 2;
    const top = (height - 500 * unit) / 2;
    for (const { place, marker, button } of entries) {
      const longitude = ((place.longitude - west) % 360 + 360) % 360;
      const x = left + (longitude / 360 * 1000 * zoom + xOffset) * unit;
      const y = top + ((90 - place.latitude) / 180 * 500 * zoom + yOffset) * unit;
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;
      const visible = x >= 0 && x <= viewport.clientWidth && y >= 0 && y <= viewport.clientHeight;
      if (!visible && document.activeElement === marker) button.focus({ preventScroll: true });
      marker.tabIndex = visible ? 0 : -1;
      marker.setAttribute("aria-hidden", String(!visible));
    }
  }

  fetch("places.json")
    .then((response) => {
      if (!response.ok) throw new Error(`City data request failed: HTTP ${response.status}`);
      return response.json();
    })
    .then(validate)
    .then((places) => {
      if (places.length && typeof dialog.showModal !== "function") {
        throw new Error("City albums require native dialog support");
      }
      for (const place of places) {
        const marker = document.createElement("button");
        const button = document.createElement("button");
        marker.type = button.type = "button";
        marker.className = "atlas-city-marker";
        marker.dataset.city = button.dataset.city = place.id;
        for (const control of [marker, button]) {
          control.setAttribute("aria-haspopup", "dialog");
          control.setAttribute("aria-controls", dialog.id);
          control.addEventListener("click", () => open(place));
        }
        markers.append(marker);
        list.append(button);
        entries.push({ place, marker, button });
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

  return { update, updateLabels };
}
