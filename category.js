document.addEventListener("DOMContentLoaded", () => {
  const films = document.querySelectorAll(".vertical-film");
  const filmGallery = document.querySelector(".film-gallery");
  const detail = document.querySelector(".feature-detail");
  const detailFilm = document.querySelector(".feature-detail-film");
  const detailFilmImg = document.querySelector(".feature-detail-film img");
  const detailFilmStills = document.createElement("div");
  const detailBackButton = document.querySelector(".detail-back-button");
  const detailPanel = document.querySelector(".feature-detail-panel");
  const category = document.body.dataset.category || "feature";
  const projectElements = {
    title: document.querySelector("[data-project-title]"),
    runtime: document.querySelector("[data-project-runtime]"),
    year: document.querySelector("[data-project-year]"),
    tools: document.querySelector("[data-project-tools]"),
    role: document.querySelector("[data-project-role]"),
    youtube: document.querySelector("[data-project-youtube]"),
    description: document.querySelector("[data-project-description]"),
    stills: document.querySelector("[data-project-stills]"),
    process: document.querySelector("[data-project-process]")
  };
  const hoverInfo = document.createElement("div");
  const hoverTitle = document.createElement("p");
  const hoverCategory = document.createElement("p");
  const stillLightbox = document.createElement("div");
  const stillLightboxImage = document.createElement("img");
  const guidePadding = 14;
  const defaultGuideSize = 42;
  const resetDelay = 2000;
  const filmAnimationDuration = 720;
  const guideMoveDelay = 420;
  const guideTransitionDuration = 450;
  const contentFadeDuration = 300;
  const toolIconBasePath = "assets/icons/";
  const toolIconMap = {
    c4d: {
      label: "Cinema 4D",
      icon: "C4D.png"
    },
    ae: {
      label: "After Effects",
      icon: "AE.png"
    },
    comfyui: {
      label: "ComfyUI",
      icon: "comfiui.png"
    },
    "comfy ui": {
      label: "ComfyUI",
      icon: "comfiui.png"
    },
    dr: {
      label: "DaVinci Resolve",
      icon: "DR.png"
    },
    md: {
      label: "Marvelous Designer",
      icon: "MD.png"
    },
    pr: {
      label: "Premiere Pro",
      icon: "PR.png"
    },
    ue5: {
      label: "Unreal Engine 5",
      icon: "UE5.png"
    },
    unrealengine5: {
      label: "Unreal Engine 5",
      icon: "UE5.png"
    },
    "unreal engine5": {
      label: "Unreal Engine 5",
      icon: "UE5.png"
    },
    "unreal engine 5": {
      label: "Unreal Engine 5",
      icon: "UE5.png"
    },
    "unreal engine": {
      label: "Unreal Engine",
      icon: "UE5.png"
    }
  };
  let resetTimer;
  let guideMoveTimer;
  let stillGuideResetTimer;
  let contentTimer;
  let isDetailOpen = false;
  let isAnimating = false;
  let activeFilm = null;
  let cameraZ = 0;
  let targetCameraZ = 0;
  let cameraAnimationFrame;
  let pointerTargetFilm = null;
  let hoverInfoRequest = 0;
  let stillScrollTarget = 0;
  let stillScrollAnimationFrame;
  let detailStillsCenterRequest = 0;
  const projectCache = new Map();
  const filmWorldZ = {
    "vertical-film--hero": 180,
    "vertical-film--right": -40,
    "vertical-film--mid": -250,
    "vertical-film--back": -520
  };

  hoverInfo.className = "film-hover-info";
  hoverTitle.className = "film-hover-title";
  hoverCategory.className = "film-hover-category";
  hoverInfo.append(hoverTitle, hoverCategory);
  document.body.appendChild(hoverInfo);

  detailFilmStills.className = "feature-detail-stills";
  detailFilm?.insertBefore(detailFilmStills, detailFilmImg);

  stillLightbox.className = "still-lightbox";
  stillLightbox.setAttribute("aria-hidden", "true");
  stillLightboxImage.alt = "";
  stillLightbox.appendChild(stillLightboxImage);
  document.body.appendChild(stillLightbox);

  function setGuideToRect(rect, options = {}) {
    clearTimeout(resetTimer);
    clearTimeout(guideMoveTimer);
    const root = document.documentElement;
    const padding = options.padding ?? guidePadding;
    const size = options.size ?? defaultGuideSize;

    root.style.setProperty("--guide-size", `${size}px`);
    root.style.setProperty("--guide-top", `${Math.max(rect.top - padding, 18)}px`);
    root.style.setProperty("--guide-left", `${Math.max(rect.left - padding, 18)}px`);
    root.style.setProperty("--guide-right", `${Math.max(window.innerWidth - rect.right - padding, 18)}px`);
    root.style.setProperty("--guide-bottom", `${Math.max(window.innerHeight - rect.bottom - padding, 18)}px`);
  }

  function isDetailGuideLocked() {
    return isDetailOpen || isAnimating || document.body.classList.contains("detail-open");
  }

  function setGuideToFilm(film, force = false) {
    if (!force && isDetailGuideLocked()) return;
    const rect = film.getBoundingClientRect();
    const size = Math.round(clamp(rect.width * 0.26, 18, defaultGuideSize));
    const padding = Math.round(clamp(size / 3, 6, guidePadding));

    setGuideToRect(rect, { size, padding });
  }

  function getCssPixelValue(element, propertyName) {
    const value = parseFloat(getComputedStyle(element).getPropertyValue(propertyName));
    return Number.isFinite(value) ? value : 0;
  }

  function setGuideToDetailPanel() {
    if (!detailPanel) return;

    const rect = detailPanel.getBoundingClientRect();
    setGuideToRect({
      top: rect.top + getCssPixelValue(detailPanel, "--detail-guide-offset-top"),
      left: rect.left + getCssPixelValue(detailPanel, "--detail-guide-offset-left"),
      right: rect.right + getCssPixelValue(detailPanel, "--detail-guide-offset-right"),
      bottom: rect.bottom + getCssPixelValue(detailPanel, "--detail-guide-offset-bottom")
    });
  }

  function setGuideToDetailStill(still) {
    if (!still) return;

    const rect = still.getBoundingClientRect();
    const size = Math.round(clamp(rect.width * 0.12, 18, defaultGuideSize));
    const padding = Math.round(clamp(size / 3, 6, guidePadding));
    setGuideToRect(rect, { size, padding });
  }

  function resetGuide() {
    if (isDetailOpen || document.body.classList.contains("detail-open")) {
      setGuideToDetailPanel();
      return;
    }

    if (isAnimating) return;

    const root = document.documentElement;

    root.style.removeProperty("--guide-top");
    root.style.removeProperty("--guide-left");
    root.style.removeProperty("--guide-right");
    root.style.removeProperty("--guide-bottom");
    root.style.removeProperty("--guide-size");
  }

  function scheduleResetGuide() {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(resetGuide, resetDelay);
  }

  function getFilmWorldZ(film) {
    const className = Object.keys(filmWorldZ).find(name => film.classList.contains(name));
    return filmWorldZ[className] ?? 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function getHoveredFilm() {
    return pointerTargetFilm || Array.from(films).find(film => film.matches(":hover, :focus-visible"));
  }

  function updateHoveredGuide() {
    const hoveredFilm = getHoveredFilm();
    if (hoveredFilm) {
      setGuideToFilm(hoveredFilm);
      positionHoverInfo(hoveredFilm);
    }
  }

  function getProjectCategory(project) {
    return project.category || "";
  }

  function positionHoverInfo(film) {
    if (!film || !hoverInfo.classList.contains("is-visible")) return;

    const rect = film.getBoundingClientRect();
    const scale = clamp(rect.width / 260, 0.58, 1);
    hoverInfo.style.setProperty("--hover-info-scale", scale.toFixed(3));

    const infoRect = hoverInfo.getBoundingClientRect();
    const gap = Math.max(18, Math.min(rect.width * 0.14, 34));
    let left = rect.right + gap;
    let top = rect.top + rect.height / 2 - infoRect.height / 2;

    if (left + infoRect.width > window.innerWidth - 24) {
      left = rect.left - infoRect.width - gap;
    }

    left = clamp(left, 24, window.innerWidth - infoRect.width - 24);
    top = clamp(top, 24, window.innerHeight - infoRect.height - 24);

    hoverInfo.style.left = `${left}px`;
    hoverInfo.style.top = `${top}px`;
  }

  function hideHoverInfo() {
    hoverInfoRequest += 1;
    hoverInfo.classList.remove("is-visible");
    hoverInfo.style.removeProperty("--hover-info-scale");
  }

  async function showHoverInfoForFilm(film) {
    const requestId = hoverInfoRequest + 1;
    hoverInfoRequest = requestId;

    const project = await loadProject(getFilmId(film));
    if (requestId !== hoverInfoRequest || pointerTargetFilm !== film || isDetailGuideLocked()) return;

    hoverTitle.textContent = (project.title || "").trim();
    hoverCategory.textContent = getProjectCategory(project).trim();
    hoverCategory.hidden = !hoverCategory.textContent;
    hoverInfo.classList.add("is-visible");
    positionHoverInfo(film);
  }

  function setGalleryPerspectiveOriginFromPoint(clientX, clientY, strength = 1) {
    if (!filmGallery) return;

    const rect = filmGallery.getBoundingClientRect();
    const xRatio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const yRatio = clamp((clientY - rect.top) / rect.height, 0, 1);
    const originX = clamp(50 + (xRatio - 0.5) * 28 * strength, 38, 62);
    const originY = clamp(45 + (yRatio - 0.5) * 22 * strength, 34, 56);

    filmGallery.style.setProperty("--gallery-origin-x", `${originX.toFixed(2)}%`);
    filmGallery.style.setProperty("--gallery-origin-y", `${originY.toFixed(2)}%`);
  }

  function setGalleryPerspectiveOriginToFilm(film) {
    if (!film) return;

    const rect = film.getBoundingClientRect();
    setGalleryPerspectiveOriginFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.15);
  }

  function updateGalleryPerspectiveOrigin(event, film) {
    if (film) {
      setGalleryPerspectiveOriginToFilm(film);
      return;
    }

    setGalleryPerspectiveOriginFromPoint(event.clientX, event.clientY);
  }

  function resetGalleryPerspectiveOrigin() {
    if (!filmGallery) return;

    filmGallery.style.removeProperty("--gallery-origin-x");
    filmGallery.style.removeProperty("--gallery-origin-y");
  }

  function getFilmAtPoint(clientX, clientY) {
    const candidates = Array.from(films).filter(film => {
      const rect = film.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    });

    if (candidates.length === 0) return null;

    return candidates.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      const aDistance = Math.hypot(clientX - (aRect.left + aRect.width / 2), clientY - (aRect.top + aRect.height / 2));
      const bDistance = Math.hypot(clientX - (bRect.left + bRect.width / 2), clientY - (bRect.top + bRect.height / 2));
      return aDistance - bDistance;
    })[0];
  }

  function setPointerTargetFilm(film) {
    if (pointerTargetFilm === film) {
      setGuideToFilm(film);
      setGalleryPerspectiveOriginToFilm(film);
      positionHoverInfo(film);
      return;
    }

    if (pointerTargetFilm) {
      pointerTargetFilm.classList.remove("is-pointer-target");
    }

    pointerTargetFilm = film;

    if (pointerTargetFilm) {
      filmGallery?.classList.add("has-pointer-target");
      pointerTargetFilm.classList.add("is-pointer-target");
      setGuideToFilm(pointerTargetFilm);
      setGalleryPerspectiveOriginToFilm(pointerTargetFilm);
      showHoverInfoForFilm(pointerTargetFilm);
    }
  }

  function clearPointerTargetFilm() {
    if (pointerTargetFilm) {
      pointerTargetFilm.classList.remove("is-pointer-target");
      pointerTargetFilm = null;
    }
    filmGallery?.classList.remove("has-pointer-target");
    hideHoverInfo();
  }

  function handleGalleryPointerMove(event) {
    if (isDetailGuideLocked()) return;

    const film = getFilmAtPoint(event.clientX, event.clientY);
    updateGalleryPerspectiveOrigin(event, film);

    if (film) {
      clearTimeout(resetTimer);
      setPointerTargetFilm(film);
    } else {
      clearPointerTargetFilm();
      scheduleResetGuide();
    }
  }

  function handleGalleryClick(event) {
    if (isDetailGuideLocked()) return;

    const film = pointerTargetFilm || getFilmAtPoint(event.clientX, event.clientY);
    if (!film) return;

    event.preventDefault();
    openDetailFromFilm(film);
  }

  function applyCameraZ() {
    films.forEach(film => {
      const z = getFilmWorldZ(film) + cameraZ;
      const visibleZ = clamp(z, -900, 760);
      const farDistance = Math.max(-z, 0);
      const passedDistance = Math.max(z - 620, 0);
      const blur = Math.min(farDistance / 220 + passedDistance / 90, 8);
      const opacity = clamp(1 - farDistance / 1100 - passedDistance / 180, 0, 1);
      const scale = clamp(1 - farDistance / 2800, 0.88, 1);

      film.style.setProperty("--camera-blur", `${blur.toFixed(2)}px`);
      film.style.setProperty("--camera-opacity", opacity.toFixed(2));
      film.style.setProperty("--camera-scale", scale.toFixed(3));
      film.style.setProperty("--camera-z", `${visibleZ.toFixed(1)}px`);
    });

    updateHoveredGuide();
    setGalleryPerspectiveOriginToFilm(pointerTargetFilm);
  }

  function animateCameraZ() {
    const distance = targetCameraZ - cameraZ;

    if (Math.abs(distance) < 0.6) {
      cameraZ = targetCameraZ;
      applyCameraZ();
      cameraAnimationFrame = null;
      return;
    }

    cameraZ += distance * 0.14;
    applyCameraZ();
    cameraAnimationFrame = requestAnimationFrame(animateCameraZ);
  }

  function startCameraAnimation() {
    if (!cameraAnimationFrame) {
      cameraAnimationFrame = requestAnimationFrame(animateCameraZ);
    }
  }

  function handleCameraWheel(event) {
    if (isDetailGuideLocked()) return;

    event.preventDefault();
    targetCameraZ = clamp(targetCameraZ + event.deltaY * 0.7, 0, 1080);
    startCameraAnimation();
  }

  function createFilmGhost(rect, sourceElement) {
    const ghost = document.createElement("div");
    const ghostContent = sourceElement.cloneNode(true);

    ghost.className = "detail-film-ghost";
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghostContent.classList.remove("is-pointer-target", "is-returning", "is-held-hidden");
    ghostContent.removeAttribute("id");
    ghostContent.removeAttribute("aria-label");
    ghostContent.setAttribute("aria-hidden", "true");
    ghost.appendChild(ghostContent);

    return ghost;
  }

  function getFilmId(film) {
    return film.dataset.film || "film1";
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value || "";
    }
  }

  function resolveProjectPath(project, path) {
    if (!path) return "";
    if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) return path;
    return `${project.basePath}/${path}`;
  }

  function getYouTubeId(value) {
    if (!value) return "";

    try {
      const url = new URL(value);
      if (url.hostname.includes("youtu.be")) {
        return url.pathname.replace("/", "");
      }
      if (url.searchParams.has("v")) {
        return url.searchParams.get("v");
      }
      const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) {
        return embedMatch[1];
      }
    } catch (error) {
      return value;
    }

    return value;
  }

  function getYouTubeEmbedUrl(project) {
    const id = getYouTubeId(project.youtubeId || project.youtubeUrl);
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }

  async function loadProject(filmId) {
    const cacheKey = `${category}/${filmId}`;
    if (projectCache.has(cacheKey)) {
      return projectCache.get(cacheKey);
    }

    const basePath = `portfolio-db/${category}/${filmId}`;
    const fallbackProject = {
      title: "Title",
      category: "",
      runtime: "",
      year: "",
      tools: "",
      role: "",
      youtubeUrl: "",
      description: "",
      stills: [],
      processStills: [],
      process: [],
      basePath
    };

    try {
      const response = await fetch(`${basePath}/brief.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${basePath}/brief.json`);
      }

      const project = await response.json();
      const projectWithPath = { ...fallbackProject, ...project, basePath };
      projectCache.set(cacheKey, projectWithPath);
      return projectWithPath;
    } catch (error) {
      console.warn(error);
      projectCache.set(cacheKey, fallbackProject);
      return fallbackProject;
    }
  }

  function renderImages(container, images, project) {
    if (!container) return;

    container.replaceChildren();

    images.forEach(image => {
      const imagePath = typeof image === "string" ? image : image.src;
      const imageAlt = typeof image === "string" ? "" : image.alt || "";
      if (!imagePath) return;

      const img = document.createElement("img");
      img.src = resolveProjectPath(project, imagePath);
      img.alt = imageAlt;
      container.appendChild(img);
    });
  }

  function renderProcessImages(container, images, project) {
    if (!container) return;

    container.replaceChildren();

    images.forEach(image => {
      const imagePath = typeof image === "string" ? image : image.src;
      const imageAlt = typeof image === "string" ? "" : image.alt || image.caption || "";
      const imageCaption = typeof image === "string" ? "" : image.caption || image.description || "";
      if (!imagePath) return;

      const figure = document.createElement("figure");
      const button = document.createElement("button");
      const img = document.createElement("img");

      figure.className = "project-process-figure";
      button.className = "project-process-image-button";
      button.type = "button";
      button.setAttribute("aria-label", imageCaption ? `${imageCaption} 크게 보기` : "제작과정 이미지 크게 보기");
      img.src = resolveProjectPath(project, imagePath);
      img.alt = imageAlt;
      button.appendChild(img);
      button.addEventListener("click", () => {
        openStillLightbox(img.src, img.alt);
      });
      figure.appendChild(button);

      if (imageCaption) {
        const caption = document.createElement("figcaption");
        caption.textContent = imageCaption;
        figure.appendChild(caption);
      }

      container.appendChild(figure);
    });
  }

  function getImageList(project, primaryKey, fallbackKey = null) {
    if (Array.isArray(project[primaryKey])) {
      return project[primaryKey];
    }

    return fallbackKey && Array.isArray(project[fallbackKey]) ? project[fallbackKey] : [];
  }

  function getFilmStills(project) {
    return getImageList(project, "filmStills", "stills");
  }

  function getFrameStills(project) {
    const frameStills = getImageList(project, "frameStills");
    return frameStills.length > 0 ? frameStills : getFilmStills(project);
  }

  function getProcessStills(project) {
    return getImageList(project, "processStills");
  }

  function normalizeToolName(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function getProjectTools(value) {
    if (Array.isArray(value)) {
      return value
        .map(tool => typeof tool === "string" ? tool : tool?.name || tool?.label || "")
        .map(tool => tool.trim())
        .filter(Boolean);
    }

    return String(value || "")
      .split(/[.,/|]+/)
      .map(tool => tool.trim())
      .filter(Boolean);
  }

  function renderProjectTools(element, value) {
    if (!element) return;

    const tools = getProjectTools(value);
    element.replaceChildren();
    element.classList.toggle("project-tools", tools.length > 0);

    tools.forEach(tool => {
      const iconData = toolIconMap[normalizeToolName(tool)];

      if (!iconData) {
        const fallback = document.createElement("span");
        fallback.className = "project-tool-text";
        fallback.textContent = tool;
        element.appendChild(fallback);
        return;
      }

      const icon = document.createElement("img");
      icon.className = "project-tool-icon";
      icon.src = `${toolIconBasePath}${iconData.icon}`;
      icon.alt = iconData.label;
      icon.title = iconData.label;
      icon.addEventListener("error", () => {
        const fallback = document.createElement("span");
        fallback.className = "project-tool-text";
        fallback.textContent = iconData.label;
        icon.replaceWith(fallback);
      }, { once: true });
      element.appendChild(icon);
    });
  }

  function renderStillSlots(container, slotClassName, project, limit = null, sourceStills = null) {
    if (!container) return;

    container.replaceChildren();

    const projectStills = Array.isArray(sourceStills) ? sourceStills : getFilmStills(project);
    const stills = Number.isFinite(limit) ? projectStills.slice(0, limit) : projectStills;

    stills.forEach(still => {
      const stillPath = typeof still === "string" ? still : still.src;
      const stillAlt = typeof still === "string" ? "" : still.alt || "";
      if (!stillPath) return;

      const slot = document.createElement("div");
      const image = document.createElement("img");

      slot.className = slotClassName;
      image.src = resolveProjectPath(project, stillPath);
      image.alt = stillAlt;
      if (slotClassName === "feature-detail-still") {
        image.addEventListener("load", () => requestAnimationFrame(updateDetailStillsFocus), { once: true });
        slot.addEventListener("mousemove", handleDetailStillPointerMove);
        slot.addEventListener("mouseenter", handleDetailStillPointerMove);
        slot.addEventListener("mouseleave", handleDetailStillPointerLeave);
        slot.addEventListener("click", event => {
          event.stopPropagation();
          openStillLightbox(image.src, image.alt);
        });
      }
      slot.appendChild(image);
      container.appendChild(slot);
    });
  }

  function renderDetailFilmStills(project) {
    const centerRequest = ++detailStillsCenterRequest;

    detailFilmStills.scrollTop = 0;
    stillScrollTarget = 0;
    renderStillSlots(detailFilmStills, "feature-detail-still", project);
    scheduleDetailStillsCenter(centerRequest);

    const pendingImages = Array.from(detailFilmStills.querySelectorAll("img"))
      .filter(image => !image.complete);

    if (pendingImages.length > 0) {
      Promise.all(pendingImages.map(image => new Promise(resolve => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      }))).then(() => scheduleDetailStillsCenter(centerRequest));
    }
  }

  function scheduleDetailStillsCenter(requestId) {
    requestAnimationFrame(() => {
      if (requestId !== detailStillsCenterRequest) return;
      centerDetailStillsOnMiddle();
    });
  }

  function centerDetailStillsOnMiddle() {
    const stills = detailFilmStills.querySelectorAll(".feature-detail-still");
    if (stills.length === 0) {
      updateDetailStillsFocus();
      return;
    }

    const middleStill = stills[Math.floor((stills.length - 1) / 2)];
    const containerRect = detailFilmStills.getBoundingClientRect();
    const stillRect = middleStill.getBoundingClientRect();
    const targetScrollTop = detailFilmStills.scrollTop
      + stillRect.top
      + stillRect.height / 2
      - containerRect.top
      - containerRect.height / 2;

    stillScrollTarget = clamp(targetScrollTop, 0, getDetailStillsMaxScroll());
    detailFilmStills.scrollTop = stillScrollTarget;
    updateDetailStillsFocus();
  }

  function getFilmStillsContainer(film) {
    let container = film.querySelector(".vertical-film-stills");

    if (!container) {
      container = document.createElement("div");
      container.className = "vertical-film-stills";
      film.insertBefore(container, film.querySelector("img"));
    }

    return container;
  }

  async function renderGalleryFilmStills(film) {
    const project = await loadProject(getFilmId(film));
    renderStillSlots(getFilmStillsContainer(film), "vertical-film-still", project, 4, getFrameStills(project));
  }

  function renderAllGalleryFilmStills() {
    films.forEach(film => {
      renderGalleryFilmStills(film);
    });
  }

  function updateDetailStillsFocus() {
    const stills = detailFilmStills.querySelectorAll(".feature-detail-still");
    if (stills.length === 0) return;

    const containerRect = detailFilmStills.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;

    stills.forEach(still => {
      const rect = still.getBoundingClientRect();
      const stillCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(centerY - stillCenterY);
      const closeness = clamp(1 - distance / (containerRect.height * 0.48), 0, 1);
      const scale = 0.9 + closeness * 0.14;

      still.style.setProperty("--still-scale", scale.toFixed(3));
      still.style.opacity = (0.74 + closeness * 0.26).toFixed(2);
    });
  }

  function getDetailStillsMaxScroll() {
    return Math.max(detailFilmStills.scrollHeight - detailFilmStills.clientHeight, 0);
  }

  function animateDetailStillsScroll() {
    const distance = stillScrollTarget - detailFilmStills.scrollTop;

    if (Math.abs(distance) < 0.5) {
      detailFilmStills.scrollTop = stillScrollTarget;
      updateDetailStillsFocus();
      stillScrollAnimationFrame = null;
      return;
    }

    detailFilmStills.scrollTop += distance * 0.1;
    updateDetailStillsFocus();
    stillScrollAnimationFrame = requestAnimationFrame(animateDetailStillsScroll);
  }

  function startDetailStillsScrollAnimation() {
    if (!stillScrollAnimationFrame) {
      stillScrollAnimationFrame = requestAnimationFrame(animateDetailStillsScroll);
    }
  }

  function handleDetailStillsWheel(event) {
    if (!isDetailOpen && !document.body.classList.contains("detail-open")) return;

    event.preventDefault();
    stillScrollTarget = clamp(
      stillScrollTarget + event.deltaY,
      0,
      getDetailStillsMaxScroll()
    );
    startDetailStillsScrollAnimation();
  }

  function handleDetailStillPointerMove(event) {
    const still = event.currentTarget;
    const rect = still.getBoundingClientRect();
    const originX = clamp((event.clientX - rect.left) / rect.width * 100, 0, 100);
    const originY = clamp((event.clientY - rect.top) / rect.height * 100, 0, 100);

    clearTimeout(stillGuideResetTimer);
    still.classList.add("is-hovered");
    still.style.setProperty("--still-origin-x", `${originX.toFixed(1)}%`);
    still.style.setProperty("--still-origin-y", `${originY.toFixed(1)}%`);
    setGuideToDetailStill(still);
  }

  function handleDetailStillPointerLeave(event) {
    const still = event.currentTarget;

    still.classList.remove("is-hovered");
    still.style.removeProperty("--still-origin-x");
    still.style.removeProperty("--still-origin-y");
    clearTimeout(stillGuideResetTimer);
    stillGuideResetTimer = window.setTimeout(() => {
      setGuideToDetailPanel();
    }, 2000);
  }

  function openStillLightbox(src, alt = "") {
    if (!src) return;

    stillLightboxImage.src = src;
    stillLightboxImage.alt = alt;
    stillLightbox.classList.add("is-open");
    stillLightbox.setAttribute("aria-hidden", "false");
  }

  function closeStillLightbox() {
    stillLightbox.classList.remove("is-open");
    stillLightbox.setAttribute("aria-hidden", "true");
    stillLightboxImage.removeAttribute("src");
  }

  function renderProcess(project) {
    if (!projectElements.process) return;

    projectElements.process.replaceChildren();

    const processItems = Array.isArray(project.process) ? project.process : [];

    processItems.forEach(item => {
      const section = document.createElement("article");
      section.className = "project-process-item";

      if (item.title) {
        section.classList.add("has-title");
        const title = document.createElement("h4");
        title.textContent = item.title;
        section.appendChild(title);
      }

      if (Array.isArray(item.images) && item.images.length > 0) {
        const imageWrap = document.createElement("div");
        imageWrap.className = "project-process-images";
        renderProcessImages(imageWrap, item.images, project);
        section.appendChild(imageWrap);
      }

      if (item.text || item.body) {
        const body = document.createElement("p");
        body.textContent = item.text || item.body;
        section.appendChild(body);
      }

      projectElements.process.appendChild(section);
    });
  }

  function renderProject(project) {
    setText(projectElements.title, project.title || "Title");
    setText(projectElements.runtime, project.runtime);
    setText(projectElements.year, project.year);
    renderProjectTools(projectElements.tools, project.tools);
    setText(projectElements.role, project.role);
    setText(projectElements.description, project.description);

    const embedUrl = getYouTubeEmbedUrl(project);
    if (projectElements.youtube) {
      if (embedUrl) {
        projectElements.youtube.src = embedUrl;
        projectElements.youtube.closest(".feature-video")?.classList.remove("is-empty");
      } else {
        projectElements.youtube.removeAttribute("src");
        projectElements.youtube.closest(".feature-video")?.classList.add("is-empty");
      }
    }

    renderImages(projectElements.stills, getProcessStills(project), project);
    renderDetailFilmStills(project);
    renderProcess(project);
  }

  async function openDetailFromFilm(film) {
    if (!detail || !detailFilm || !detailFilmImg || isAnimating) return;

    isAnimating = true;
    if (activeFilm && activeFilm !== film) {
      activeFilm.classList.remove("is-held-hidden", "is-returning");
    }
    activeFilm = film;
    clearTimeout(resetTimer);
    clearTimeout(guideMoveTimer);
    clearTimeout(stillGuideResetTimer);
    clearTimeout(contentTimer);
    clearPointerTargetFilm();
    hideHoverInfo();
    resetGalleryPerspectiveOrigin();
    document.body.classList.remove("detail-content-ready", "detail-closing");

    const project = await loadProject(getFilmId(film));
    renderProject(project);

    const sourceImg = film.querySelector("img");
    if (sourceImg) {
      detailFilmImg.src = sourceImg.src;
    }

    const sourceRect = film.getBoundingClientRect();
    const targetRect = detailFilm.getBoundingClientRect();
    const ghost = createFilmGhost(sourceRect, film);

    film.classList.add("is-held-hidden");
    document.body.appendChild(ghost);

    requestAnimationFrame(() => {
      document.body.classList.add("detail-open");
      detail.setAttribute("aria-hidden", "false");
      guideMoveTimer = window.setTimeout(setGuideToDetailPanel, guideMoveDelay);
      contentTimer = window.setTimeout(() => {
        document.body.classList.add("detail-content-ready");
      }, guideMoveDelay + guideTransitionDuration);

      const deltaX = targetRect.left - sourceRect.left;
      const deltaY = targetRect.top - sourceRect.top;
      const scale = targetRect.height / sourceRect.height;

      ghost.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1, filter: "blur(0)" },
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`, opacity: 0, filter: "blur(0)" }
        ],
        {
          duration: filmAnimationDuration,
          easing: "cubic-bezier(0.72, 0, 0.2, 1)",
          fill: "forwards"
        }
      ).onfinish = () => {
        ghost.remove();
        isDetailOpen = true;
        isAnimating = false;
        document.body.classList.add("detail-ready");
        setGuideToDetailPanel();
      };
    });
  }

  function closeDetail() {
    if (!isDetailOpen || isAnimating) return;
    if (stillLightbox.classList.contains("is-open")) {
      closeStillLightbox();
      return;
    }

    if (!detail || !detailFilm || !detailFilmImg || !activeFilm) {
      isDetailOpen = false;
      activeFilm?.classList.remove("is-held-hidden", "is-returning");
      document.body.classList.remove("detail-open", "detail-ready", "detail-content-ready", "detail-closing");
      clearTimeout(stillGuideResetTimer);
      resetGuide();
      return;
    }

    isAnimating = true;
    clearTimeout(resetTimer);
    clearTimeout(guideMoveTimer);
    clearTimeout(stillGuideResetTimer);
    clearTimeout(contentTimer);
    if (stillScrollAnimationFrame) {
      cancelAnimationFrame(stillScrollAnimationFrame);
      stillScrollAnimationFrame = null;
    }
    document.body.classList.add("detail-closing");
    document.body.classList.remove("detail-content-ready");

    window.setTimeout(() => {
      closeDetailAfterContentFade();
    }, contentFadeDuration);
  }

  function closeDetailAfterContentFade() {
    const closingFilm = activeFilm;

    document.body.classList.remove("detail-ready", "detail-open");
    detail.setAttribute("aria-hidden", "true");
    setGuideToFilm(closingFilm, true);

    guideMoveTimer = window.setTimeout(() => {
      closingFilm.classList.remove("is-held-hidden", "is-returning");
      document.body.classList.remove("detail-closing");
      isDetailOpen = false;
      isAnimating = false;
      setGuideToFilm(closingFilm, true);
    }, guideTransitionDuration);
  }

  films.forEach(film => {
    film.addEventListener("mouseenter", () => setPointerTargetFilm(film));
    film.addEventListener("focus", () => setPointerTargetFilm(film));
    film.addEventListener("mouseleave", scheduleResetGuide);
    film.addEventListener("blur", () => {
      clearPointerTargetFilm();
      scheduleResetGuide();
    });
    film.addEventListener("click", () => openDetailFromFilm(film));
  });

  applyCameraZ();
  renderAllGalleryFilmStills();

  if (filmGallery) {
    filmGallery.addEventListener("pointermove", handleGalleryPointerMove);
    filmGallery.addEventListener("pointerleave", () => {
      clearPointerTargetFilm();
      resetGalleryPerspectiveOrigin();
      scheduleResetGuide();
    });
    filmGallery.addEventListener("click", handleGalleryClick);
    filmGallery.addEventListener("wheel", handleCameraWheel, { passive: false });
  }

  if (detailFilm) {
    detailFilm.addEventListener("click", closeDetail);
  }

  if (detailBackButton) {
    detailBackButton.addEventListener("click", event => {
      event.stopPropagation();
      closeDetail();
    });
  }

  detailFilmStills.addEventListener("click", event => {
    event.stopPropagation();
  });

  detailFilmStills.addEventListener("scroll", updateDetailStillsFocus, { passive: true });
  detailFilmStills.addEventListener("wheel", handleDetailStillsWheel, { passive: false });

  stillLightbox.addEventListener("click", closeStillLightbox);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (stillLightbox.classList.contains("is-open")) {
        closeStillLightbox();
      } else {
        closeDetail();
      }
    }
  });

  window.addEventListener("resize", () => {
    clearTimeout(resetTimer);
    if (isDetailOpen) {
      setGuideToDetailPanel();
      updateDetailStillsFocus();
    } else {
      resetGuide();
    }
  });
});
