document.addEventListener("DOMContentLoaded", () => {
  const films = document.querySelectorAll(".vertical-film");
  const detail = document.querySelector(".feature-detail");
  const detailFilm = document.querySelector(".feature-detail-film");
  const detailFilmImg = document.querySelector(".feature-detail-film img");
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
  const guidePadding = 14;
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
  const projectCache = new Map();

  function setGuideToRect(rect) {
    clearTimeout(resetTimer);
    clearTimeout(guideMoveTimer);
    const root = document.documentElement;

    root.style.setProperty("--guide-top", `${Math.max(rect.top - guidePadding, 18)}px`);
    root.style.setProperty("--guide-left", `${Math.max(rect.left - guidePadding, 18)}px`);
    root.style.setProperty("--guide-right", `${Math.max(window.innerWidth - rect.right - guidePadding, 18)}px`);
    root.style.setProperty("--guide-bottom", `${Math.max(window.innerHeight - rect.bottom - guidePadding, 18)}px`);
  }

  function setGuideToFilm(film) {
    setGuideToRect(film.getBoundingClientRect());
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
    if (isDetailOpen) {
      setGuideToDetailPanel();
      return;
    }

    const root = document.documentElement;

    root.style.removeProperty("--guide-top");
    root.style.removeProperty("--guide-left");
    root.style.removeProperty("--guide-right");
    root.style.removeProperty("--guide-bottom");
  }

  function scheduleResetGuide() {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(resetGuide, resetDelay);
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
    renderProcess(project);
  }

  async function openDetailFromFilm(film) {
    if (!detail || !detailFilm || !detailFilmImg || isAnimating) return;

    isAnimating = true;
    activeFilm = film;
    clearTimeout(resetTimer);
    clearTimeout(contentTimer);
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
      guideMoveTimer = window.setTimeout(() => setGuideToFilm(activeFilm), guideMoveDelay);

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
        setGuideToFilm(activeFilm);
      };
    });
  }

  films.forEach(film => {
    film.addEventListener("mouseenter", () => setGuideToFilm(film));
    film.addEventListener("focus", () => setGuideToFilm(film));
    film.addEventListener("mouseleave", scheduleResetGuide);
    film.addEventListener("blur", scheduleResetGuide);
    film.addEventListener("click", () => openDetailFromFilm(film));
  });

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
