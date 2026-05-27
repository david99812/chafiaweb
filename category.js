document.addEventListener("DOMContentLoaded", () => {
  const films = document.querySelectorAll(".vertical-film");
  const detail = document.querySelector(".feature-detail");
  const detailFilm = document.querySelector(".feature-detail-film");
  const detailFilmImg = document.querySelector(".feature-detail-film img");
  const detailPanel = document.querySelector(".feature-detail-panel");
  const guidePadding = 14;
  const resetDelay = 2000;
  let resetTimer;
  let isDetailOpen = false;
  let isAnimating = false;
  let activeFilm = null;

  function setGuideToRect(rect) {
    clearTimeout(resetTimer);
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

  function openDetailFromFilm(film) {
    if (!detail || !detailFilm || !detailFilmImg || isAnimating) return;

    isAnimating = true;
    activeFilm = film;
    clearTimeout(resetTimer);

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

      const deltaX = targetRect.left - sourceRect.left;
      const deltaY = targetRect.top - sourceRect.top;
      const scale = targetRect.height / sourceRect.height;

      ghost.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1, filter: "blur(0)" },
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`, opacity: 1, filter: "blur(0)" }
        ],
        {
          duration: 720,
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
      document.body.classList.remove("detail-open", "detail-ready");
      resetGuide();
      return;
    }

    isAnimating = true;
    clearTimeout(resetTimer);

    const sourceRect = detailFilm.getBoundingClientRect();
    const targetRect = activeFilm.getBoundingClientRect();
    const ghost = createFilmGhost(sourceRect, detailFilmImg.src);

    activeFilm.classList.add("is-returning");
    document.body.appendChild(ghost);
    document.body.classList.remove("detail-ready");

    requestAnimationFrame(() => {
      document.body.classList.remove("detail-open");
      detail.setAttribute("aria-hidden", "true");
      setGuideToFilm(activeFilm);

      const deltaX = targetRect.left - sourceRect.left;
      const deltaY = targetRect.top - sourceRect.top;
      const scale = targetRect.height / sourceRect.height;

      ghost.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1, filter: "blur(0)" },
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`, opacity: 1, filter: "blur(0)" }
        ],
        {
          duration: 720,
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
