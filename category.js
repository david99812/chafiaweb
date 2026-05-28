document.addEventListener("DOMContentLoaded", () => {
  const films = document.querySelectorAll(".vertical-film");
  const filmGallery = document.querySelector(".film-gallery");
  const detail = document.querySelector(".feature-detail");
  const detailFilm = document.querySelector(".feature-detail-film");
  const detailFilmImg = document.querySelector(".feature-detail-film img");
  const detailFilmStills = document.createElement("div");
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
  const guidePadding = 14;
  const defaultGuideSize = 42;
  const resetDelay = 2000;
  const filmAnimationDuration = 720;
  const guideMoveDelay = 420;
  const guideTransitionDuration = 450;
  const contentFadeDuration = 300;
  let resetTimer;
  let guideMoveTimer;
  let contentTimer;
  let isDetailOpen = false;
  let isAnimating = false;
  let activeFilm = null;
  let cameraZ = 0;
  let targetCameraZ = 0;
  let cameraAnimationFrame;
  let pointerTargetFilm = null;
  let hoverInfoRequest = 0;
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

  function createFilmGhost(rect, imageSource) {
    const ghost = document.createElement("div");
    const ghostImg = document.createElement("img");

    ghost.className = "detail-film-ghost";
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghostImg.src = imageSource;
    ghostImg.alt = "";
    ghost.appendChild(ghostImg);

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

  function renderStillSlots(container, slotClassName, project) {
    if (!container) return;

    container.replaceChildren();

    const stills = Array.isArray(project.stills) ? project.stills.slice(0, 4) : [];

    stills.forEach(still => {
      const stillPath = typeof still === "string" ? still : still.src;
      const stillAlt = typeof still === "string" ? "" : still.alt || "";
      if (!stillPath) return;

      const slot = document.createElement("div");
      const image = document.createElement("img");

      slot.className = slotClassName;
      image.src = resolveProjectPath(project, stillPath);
      image.alt = stillAlt;
      slot.appendChild(image);
      container.appendChild(slot);
    });
  }

  function renderDetailFilmStills(project) {
    renderStillSlots(detailFilmStills, "feature-detail-still", project);
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
    renderStillSlots(getFilmStillsContainer(film), "vertical-film-still", project);
  }

  function renderAllGalleryFilmStills() {
    films.forEach(film => {
      renderGalleryFilmStills(film);
    });
  }

  function renderProcess(project) {
    if (!projectElements.process) return;

    projectElements.process.replaceChildren();

    const processItems = Array.isArray(project.process) ? project.process : [];

    processItems.forEach(item => {
      const section = document.createElement("article");
      section.className = "project-process-item";

      if (item.title) {
        const title = document.createElement("h4");
        title.textContent = item.title;
        section.appendChild(title);
      }

      if (item.text || item.body) {
        const body = document.createElement("p");
        body.textContent = item.text || item.body;
        section.appendChild(body);
      }

      if (Array.isArray(item.images) && item.images.length > 0) {
        const imageWrap = document.createElement("div");
        imageWrap.className = "project-process-images";
        renderImages(imageWrap, item.images, project);
        section.appendChild(imageWrap);
      }

      projectElements.process.appendChild(section);
    });
  }

  function renderProject(project) {
    setText(projectElements.title, project.title || "Title");
    setText(projectElements.runtime, project.runtime);
    setText(projectElements.year, project.year);
    setText(projectElements.tools, project.tools);
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

    renderImages(projectElements.stills, Array.isArray(project.stills) ? project.stills : [], project);
    renderDetailFilmStills(project);
    renderProcess(project);
  }

  async function openDetailFromFilm(film) {
    if (!detail || !detailFilm || !detailFilmImg || isAnimating) return;

    isAnimating = true;
    activeFilm = film;
    clearTimeout(resetTimer);
    clearTimeout(guideMoveTimer);
    clearTimeout(contentTimer);
    clearPointerTargetFilm();
    hideHoverInfo();
    resetGalleryPerspectiveOrigin();
    document.body.classList.remove("detail-content-ready");

    const project = await loadProject(getFilmId(film));
    renderProject(project);

    const sourceImg = film.querySelector("img");
    if (sourceImg) {
      detailFilmImg.src = sourceImg.src;
    }

    const sourceRect = film.getBoundingClientRect();
    const targetRect = detailFilm.getBoundingClientRect();
    const ghost = createFilmGhost(sourceRect, detailFilmImg.src);

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
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`, opacity: 1, filter: "blur(0)" }
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

    if (!detail || !detailFilm || !detailFilmImg || !activeFilm) {
      isDetailOpen = false;
      document.body.classList.remove("detail-open", "detail-ready", "detail-content-ready");
      resetGuide();
      return;
    }

    isAnimating = true;
    clearTimeout(resetTimer);
    clearTimeout(guideMoveTimer);
    clearTimeout(contentTimer);
    document.body.classList.remove("detail-content-ready");

    window.setTimeout(() => {
      closeDetailAfterContentFade();
    }, contentFadeDuration);
  }

  function closeDetailAfterContentFade() {
    const sourceRect = detailFilm.getBoundingClientRect();
    const targetRect = activeFilm.getBoundingClientRect();
    const ghost = createFilmGhost(sourceRect, detailFilmImg.src);

    activeFilm.classList.add("is-returning");
    document.body.appendChild(ghost);
    document.body.classList.remove("detail-ready");

    requestAnimationFrame(() => {
      document.body.classList.remove("detail-open");
      detail.setAttribute("aria-hidden", "true");
      guideMoveTimer = window.setTimeout(() => setGuideToFilm(activeFilm, true), guideMoveDelay);

      const deltaX = targetRect.left - sourceRect.left;
      const deltaY = targetRect.top - sourceRect.top;
      const scale = targetRect.height / sourceRect.height;

      ghost.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1, filter: "blur(0)" },
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`, opacity: 1, filter: "blur(0)" }
        ],
        {
          duration: filmAnimationDuration,
          easing: "cubic-bezier(0.72, 0, 0.2, 1)",
          fill: "forwards"
        }
      ).onfinish = () => {
        ghost.remove();
        activeFilm.classList.remove("is-returning");
        isDetailOpen = false;
        isAnimating = false;
        setGuideToFilm(activeFilm, true);
      };
    });
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

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeDetail();
    }
  });

  window.addEventListener("resize", () => {
    clearTimeout(resetTimer);
    if (isDetailOpen) {
      setGuideToDetailPanel();
    } else {
      resetGuide();
    }
  });
});
