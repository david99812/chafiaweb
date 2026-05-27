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

  function setGuideToDetailPanel() {
    if (!detailPanel) return;

    const rect = detailPanel.getBoundingClientRect();
    setGuideToRect({
      top: rect.top - 100,
      left: rect.left - 40,
      right: rect.right + 400,
      bottom: rect.bottom + 75
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

  function openDetailFromFilm(film) {
    if (!detail || !detailFilm || !detailFilmImg || isAnimating) return;

    isAnimating = true;
    clearTimeout(resetTimer);

    const sourceImg = film.querySelector("img");
    if (sourceImg) {
      detailFilmImg.src = sourceImg.src;
    }

    const sourceRect = film.getBoundingClientRect();
    const targetRect = detailFilm.getBoundingClientRect();
    const ghost = film.cloneNode(true);

    ghost.className = "detail-film-ghost";
    ghost.style.left = `${sourceRect.left}px`;
    ghost.style.top = `${sourceRect.top}px`;
    ghost.style.width = `${sourceRect.width}px`;
    ghost.style.height = `${sourceRect.height}px`;
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

    isDetailOpen = false;
    document.body.classList.remove("detail-open", "detail-ready");
    if (detail) {
      detail.setAttribute("aria-hidden", "true");
    }
    resetGuide();
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
