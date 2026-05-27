document.addEventListener("DOMContentLoaded", () => {
  const films = document.querySelectorAll(".vertical-film");
  const guidePadding = 14;

  function setGuideToFilm(film) {
    const rect = film.getBoundingClientRect();
    const root = document.documentElement;

    root.style.setProperty("--guide-top", `${Math.max(rect.top - guidePadding, 18)}px`);
    root.style.setProperty("--guide-left", `${Math.max(rect.left - guidePadding, 18)}px`);
    root.style.setProperty("--guide-right", `${Math.max(window.innerWidth - rect.right - guidePadding, 18)}px`);
    root.style.setProperty("--guide-bottom", `${Math.max(window.innerHeight - rect.bottom - guidePadding, 18)}px`);
  }

  function resetGuide() {
    const root = document.documentElement;

    root.style.removeProperty("--guide-top");
    root.style.removeProperty("--guide-left");
    root.style.removeProperty("--guide-right");
    root.style.removeProperty("--guide-bottom");
  }

  films.forEach(film => {
    film.addEventListener("mouseenter", () => setGuideToFilm(film));
    film.addEventListener("focus", () => setGuideToFilm(film));
    film.addEventListener("mouseleave", resetGuide);
    film.addEventListener("blur", resetGuide);
  });

  window.addEventListener("resize", resetGuide);
});
