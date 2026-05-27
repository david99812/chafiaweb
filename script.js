// script.js
document.addEventListener("DOMContentLoaded", () => {
  const slots = document.querySelectorAll("[data-slot]");
  const buttons = document.querySelectorAll(".video-btn");
  const carouselDots = document.querySelectorAll(".carousel-dot");

  const slideDuration = 650;
  let offset = 2; // 가운데(slot=2)에 'a'부터 시작
  let interval;
  let paused = false;
  let userSelected = false; // dot 클릭으로 멈춤 여부
  let inactivityTimer; // 10초 inactivity 타이머
  let isSliding = false;

  function placeButtonInSlot(btn, slot, animate = true) {
    if (!animate) {
      btn.classList.add("no-transition");
    }

    btn.style.left = slot.offsetLeft + "px";
    btn.style.right = "auto";
    btn.style.top = slot.offsetTop + "px";
    btn.style.width = slot.offsetWidth + "px";
    btn.style.height = slot.offsetHeight + "px";
    btn.dataset.slot = slot.dataset.slot;

    if (!animate) {
      void btn.offsetWidth;
      btn.classList.remove("no-transition");
    }
  }

  function updateActiveState() {
    buttons.forEach(btn => {
      const video = btn.querySelector("video");

      if (btn.dataset.slot === "2") {
        btn.classList.add("active");
        video.play().catch(() => {});
      } else if (!btn.classList.contains("hovered")) {
        btn.classList.remove("active");
        video.pause();
        video.currentTime = 0;
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

  function assignButtons(animate = false) {
    buttons.forEach((btn, i) => {
      const slotIndex = (i + offset) % slots.length;
      const slot = slots[slotIndex];

      placeButtonInSlot(btn, slot, animate);
      btn.classList.add("visible");
    });

    updateActiveState();
  }

  function moveButtonOut(btn, direction) {
    if (direction === "left") {
      btn.style.left = -btn.offsetWidth + "px";
    } else {
      btn.style.left = btn.parentElement.offsetWidth + "px";
    }
  }

  function createEnteringClone(direction) {
    const exitSlotIndex = direction === "left" ? 0 : slots.length - 1;
    const enterSlotIndex = direction === "left" ? slots.length - 1 : 0;
    const exitBtn = Array.from(buttons).find(btn => btn.dataset.slot === String(exitSlotIndex));
    const enterSlot = slots[enterSlotIndex];

    if (!exitBtn || !enterSlot) return null;

    const clone = exitBtn.cloneNode(true);
    const frameWidth = exitBtn.parentElement.offsetWidth;

    clone.classList.add("slide-clone", "visible", "no-transition");
    clone.classList.remove("hovered");
    clone.style.left = direction === "left"
      ? frameWidth + "px"
      : -enterSlot.offsetWidth + "px";
    clone.style.right = "auto";
    clone.style.top = enterSlot.offsetTop + "px";
    clone.style.width = enterSlot.offsetWidth + "px";
    clone.style.height = enterSlot.offsetHeight + "px";

    exitBtn.parentElement.appendChild(clone);
    void clone.offsetWidth;
    clone.classList.remove("no-transition");
    placeButtonInSlot(clone, enterSlot, true);

    const video = clone.querySelector("video");
    if (video) {
      video.play().catch(() => {});
    }

    return clone;
  }

  function slideOnce(direction = "left") {
    return new Promise(resolve => {
      const enteringClone = createEnteringClone(direction);

      buttons.forEach(btn => {
        const currentSlotIndex = parseInt(btn.dataset.slot, 10);
        const isLeftWrap = direction === "left" && currentSlotIndex === 0;
        const isRightWrap = direction === "right" && currentSlotIndex === slots.length - 1;

        if (isLeftWrap || isRightWrap) {
          moveButtonOut(btn, direction);
          return;
        }

        const nextSlotIndex = direction === "left"
          ? currentSlotIndex - 1
          : currentSlotIndex + 1;

        placeButtonInSlot(btn, slots[nextSlotIndex], true);
      });

      setTimeout(() => {
        offset = direction === "left"
          ? (offset - 1 + slots.length) % slots.length
          : (offset + 1) % slots.length;

        assignButtons(false);
        if (enteringClone) {
          enteringClone.remove();
        }
        resolve();
      }, slideDuration);
    });
  }

  async function slideSteps(direction = "left", steps = 1) {
    if (isSliding) return false;

    isSliding = true;
    for (let i = 0; i < steps; i++) {
      await slideOnce(direction);
    }
    isSliding = false;

    return true;
  }

  function rotateOnce() {
    slideSteps("left", 1);
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
      if (isSliding) return;
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
      if (isSliding) return;
      if (btn.dataset.slot === "0" || btn.dataset.slot === "4") return;

      btn.classList.remove("hovered");
      paused = false;
      assignButtons();
    });
  });

  // Dot 클릭
  carouselDots.forEach(dot => {
    dot.addEventListener("click", async () => {
      if (isSliding) return;

      const targetIndex = parseInt(dot.dataset.target, 10);
      if (Number.isNaN(targetIndex)) return;

      const centerBtn = Array.from(buttons).find(btn => btn.dataset.slot === "2");
      const currentIndex = centerBtn ? parseInt(centerBtn.dataset.index, 10) : targetIndex;
      const step = (targetIndex - currentIndex + slots.length) % slots.length;
      if (step === 0) return;

      const direction = step <= slots.length / 2 ? "left" : "right";
      const steps = direction === "left" ? step : slots.length - step;

      // 사용자 지정 모드로 전환
      userSelected = true;
      resetInactivityTimer();
      await slideSteps(direction, steps);
    });
  });

  window.addEventListener("resize", () => {
    assignButtons(false);
  });
});
