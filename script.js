// script.js
document.addEventListener("DOMContentLoaded", () => {
  const slots = document.querySelectorAll("[data-slot]");
  const buttons = document.querySelectorAll(".video-btn");
  const carouselDots = document.querySelectorAll(".carousel-dot");

  let offset = 2; // 가운데(slot=2)에 'a'부터 시작
  let interval;
  let paused = false;
  let userSelected = false; // dot 클릭으로 멈춤 여부
  let inactivityTimer; // 10초 inactivity 타이머

  function assignButtons() {
    buttons.forEach((btn, i) => {
      const slotIndex = (i + offset) % slots.length;
      const slot = slots[slotIndex];

      btn.style.left = slot.style.left || "auto";
      btn.style.right = slot.style.right || "auto";
      btn.style.top = slot.style.top;
      btn.style.width = slot.offsetWidth + "px";
      btn.style.height = slot.offsetHeight + "px";
      btn.dataset.slot = slot.dataset.slot;
      btn.classList.add("visible");

      const video = btn.querySelector("video");
      if (slot.dataset.slot === "2") {
        btn.classList.add("active");
        video.play().catch(() => {});
      } else {
        if (!btn.classList.contains("hovered")) {
          btn.classList.remove("active");
          video.pause();
          video.currentTime = 0;
        }
      }
    });

    carouselDots.forEach(dot => dot.classList.remove("active"));
    const centerBtn = Array.from(buttons).find(b => b.dataset.slot === "2");
    if (centerBtn) {
      const idx = parseInt(centerBtn.dataset.index, 10);
      if (!Number.isNaN(idx) && carouselDots[idx]) {
        carouselDots[idx].classList.add("active");
      }
    }
  }

  function rotateOnce() {
    offset = (offset - 1 + slots.length) % slots.length;
    buttons.forEach(btn => btn.classList.remove("visible"));
    setTimeout(assignButtons, 100);
  }

  function startInterval() {
    interval = setInterval(() => {
      if (!paused && !userSelected) {
        rotateOnce();
      }
    }, 6000);
  }

  function stopInterval() {
    clearInterval(interval);
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (userSelected) {
      inactivityTimer = setTimeout(() => {
        userSelected = false; // 다시 자동 순환 시작
      }, 10000); // 10초 후 자동으로 풀림
    }
  }

  // 초기 실행
  assignButtons();
  startInterval();

  // Hover 동작
  buttons.forEach(btn => {
    btn.addEventListener("mouseenter", () => {
      if (btn.dataset.slot === "0" || btn.dataset.slot === "4") return;

      paused = true;
      btn.classList.add("hovered");

      const activeBtn = Array.from(buttons).find(b => b.classList.contains("active"));
      if (activeBtn && activeBtn !== btn) {
        const v = activeBtn.querySelector("video");
        activeBtn.classList.remove("active");
        v.pause();
        v.currentTime = 0;
      }

      btn.classList.add("active");
      btn.querySelector("video").play().catch(() => {});
    });

    btn.addEventListener("mouseleave", () => {
      if (btn.dataset.slot === "0" || btn.dataset.slot === "4") return;

      btn.classList.remove("hovered");
      paused = false;
      assignButtons();
    });
  });

  // Dot 클릭
  carouselDots.forEach(dot => {
    dot.addEventListener("click", () => {
      const targetIndex = parseInt(dot.dataset.target, 10);
      if (Number.isNaN(targetIndex)) return;

      offset = (2 - targetIndex + slots.length) % slots.length;
      buttons.forEach(btn => btn.classList.remove("visible"));
      assignButtons();

      // 사용자 지정 모드로 전환
      userSelected = true;
      resetInactivityTimer();
    });
  });

  window.addEventListener("resize", () => {
    assignButtons();
  });
});
