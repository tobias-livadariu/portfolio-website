import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ModalContext } from "./modal-context-core";
import {
  MODAL_NAVIGATION,
  MODAL_SECTION_KEYS,
  getModalIndex,
} from "./modals.constants";
import type { ModalSectionKey } from "./modal.types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getScrollableParent(target: EventTarget | null) {
  let element = target instanceof Element ? target : null;

  while (element) {
    if (
      element instanceof HTMLElement &&
      element.dataset.modalScroll === "true"
    ) {
      return element;
    }

    element = element.parentElement;
  }

  return null;
}

function shouldLetContentScroll(target: EventTarget | null, deltaY: number) {
  const scrollable = getScrollableParent(target);

  if (!scrollable) {
    return false;
  }

  if (deltaY > 0) {
    return (
      scrollable.scrollTop + scrollable.clientHeight <
      scrollable.scrollHeight - 2
    );
  }

  if (deltaY < 0) {
    return scrollable.scrollTop > 2;
  }

  return true;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<ModalSectionKey | null>(
    null,
  );
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const activeSectionRef = useRef(activeSection);
  const accumulatedDeltaRef = useRef(0);
  const releaseTimerRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const touchLastYRef = useRef<number | null>(null);

  const resetDrag = useCallback(() => {
    accumulatedDeltaRef.current = 0;
    setDragOffsetPx(0);
  }, []);

  const scheduleRelease = useCallback(() => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
    }

    releaseTimerRef.current = window.setTimeout(() => {
      resetDrag();
      releaseTimerRef.current = null;
    }, MODAL_NAVIGATION.releaseDelayMs);
  }, [resetDrag]);

  const openSection = useCallback(
    (section: ModalSectionKey) => {
      setActiveSection(section);
      resetDrag();
      cooldownUntilRef.current =
        performance.now() + MODAL_NAVIGATION.commitCooldownMs;
    },
    [resetDrag],
  );

  const close = useCallback(() => {
    setActiveSection(null);
    resetDrag();
    cooldownUntilRef.current =
      performance.now() + MODAL_NAVIGATION.commitCooldownMs;
  }, [resetDrag]);

  const commitDirection = useCallback(
    (direction: 1 | -1) => {
      const activeIndex = getModalIndex(activeSectionRef.current);

      if (activeIndex === -1) {
        if (direction > 0) {
          openSection(MODAL_SECTION_KEYS[0]);
        }
        return;
      }

      const nextIndex = activeIndex + direction;

      if (nextIndex < 0) {
        close();
        return;
      }

      if (nextIndex >= MODAL_SECTION_KEYS.length) {
        accumulatedDeltaRef.current = 0;
        setDragOffsetPx(-MODAL_NAVIGATION.bottomBouncePx);
        scheduleRelease();
        cooldownUntilRef.current =
          performance.now() + MODAL_NAVIGATION.commitCooldownMs;
        return;
      }

      openSection(MODAL_SECTION_KEYS[nextIndex]);
    },
    [close, openSection, scheduleRelease],
  );

  const applyScrollDelta = useCallback(
    (deltaY: number) => {
      const now = performance.now();

      if (now < cooldownUntilRef.current) {
        return;
      }

      const activeIndex = getModalIndex(activeSectionRef.current);

      if (activeIndex === -1 && deltaY < 0) {
        return;
      }

      accumulatedDeltaRef.current += deltaY;
      const nextDrag = clamp(
        -accumulatedDeltaRef.current,
        -MODAL_NAVIGATION.maxDragPx,
        MODAL_NAVIGATION.maxDragPx,
      );

      setDragOffsetPx(nextDrag);
      scheduleRelease();

      if (
        Math.abs(accumulatedDeltaRef.current) >=
        MODAL_NAVIGATION.dragThresholdPx
      ) {
        const direction = accumulatedDeltaRef.current > 0 ? 1 : -1;
        resetDrag();
        commitDirection(direction);
      }
    },
    [commitDirection, resetDrag, scheduleRelease],
  );

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      if (shouldLetContentScroll(event.target, event.deltaY)) {
        return;
      }

      event.preventDefault();
      applyScrollDelta(event.deltaY);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      touchStartYRef.current = touch.clientY;
      touchLastYRef.current = touch.clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];

      if (!touch || touchLastYRef.current === null) {
        return;
      }

      const deltaY = touchLastYRef.current - touch.clientY;
      touchLastYRef.current = touch.clientY;

      if (shouldLetContentScroll(event.target, deltaY)) {
        return;
      }

      event.preventDefault();
      applyScrollDelta(deltaY);
    };

    const handleTouchEnd = () => {
      touchStartYRef.current = null;
      touchLastYRef.current = null;

      if (
        Math.abs(accumulatedDeltaRef.current) <
        MODAL_NAVIGATION.touchThresholdPx
      ) {
        scheduleRelease();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);

      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
      }
    };
  }, [applyScrollDelta, scheduleRelease]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        commitDirection(1);
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        commitDirection(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, commitDirection]);

  const value = useMemo(
    () => ({
      activeIndex: getModalIndex(activeSection),
      activeSection,
      close,
      dragOffsetPx,
      openSection,
    }),
    [activeSection, close, dragOffsetPx, openSection],
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}
