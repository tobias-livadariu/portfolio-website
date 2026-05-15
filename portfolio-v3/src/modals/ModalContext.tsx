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

function getDirection(value: number): 1 | -1 {
  return value > 0 ? 1 : -1;
}

function normalizeWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }

  return event.deltaY;
}

function getDampedDragOffset(distancePx: number, maxOffsetPx: number) {
  const easedDistance = Math.pow(Math.max(0, distancePx), 0.82) * 0.72;

  return Math.min(maxOffsetPx, easedDistance);
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

function getContentScrollable(target: EventTarget | null, deltaY: number) {
  const scrollable = getScrollableParent(target);

  if (!scrollable) {
    return null;
  }

  if (deltaY > 0) {
    return scrollable.scrollTop + scrollable.clientHeight <
      scrollable.scrollHeight - 2
      ? scrollable
      : null;
  }

  if (deltaY < 0) {
    return scrollable.scrollTop > 2 ? scrollable : null;
  }

  return scrollable;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<ModalSectionKey | null>(
    null,
  );
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isOpening, setIsOpening] = useState(false);
  const [isScrollInteracting, setIsScrollInteracting] = useState(false);
  const activeSectionRef = useRef(activeSection);
  const accumulatedDeltaRef = useRef(0);
  const gestureDirectionRef = useRef<1 | -1 | null>(null);
  const gestureEventCountRef = useRef(0);
  const lastGestureAtRef = useRef(0);
  const releaseTimerRef = useRef<number | null>(null);
  const inertiaLockRef = useRef(false);
  const inertiaLockUntilRef = useRef(0);
  const inertiaUnlockTimerRef = useRef<number | null>(null);
  const boundaryGateUntilRef = useRef(0);
  const boundaryGateDirectionRef = useRef<1 | -1 | null>(null);
  const openingTimerRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchLastYRef = useRef<number | null>(null);

  const resetGesture = useCallback(() => {
    accumulatedDeltaRef.current = 0;
    gestureDirectionRef.current = null;
    gestureEventCountRef.current = 0;
    lastGestureAtRef.current = 0;
  }, []);

  const resetVisualDrag = useCallback(() => {
    setDragOffsetPx(0);
    setIsScrollInteracting(false);
  }, []);

  const resetDrag = useCallback(() => {
    resetGesture();
    resetVisualDrag();
  }, [resetGesture, resetVisualDrag]);

  const scheduleRelease = useCallback(() => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
    }

    releaseTimerRef.current = window.setTimeout(() => {
      resetVisualDrag();
      releaseTimerRef.current = null;
    }, MODAL_NAVIGATION.releaseDelayMs);
  }, [resetVisualDrag]);

  const markContentScroll = useCallback(
    (direction: 1 | -1) => {
      boundaryGateDirectionRef.current = direction;
      boundaryGateUntilRef.current =
        performance.now() + MODAL_NAVIGATION.boundaryGateMs;
      resetDrag();
    },
    [resetDrag],
  );

  const scheduleInertiaUnlock = useCallback(() => {
    if (inertiaUnlockTimerRef.current !== null) {
      window.clearTimeout(inertiaUnlockTimerRef.current);
    }

    const remainingMs = Math.max(
      0,
      inertiaLockUntilRef.current - performance.now(),
    );

    inertiaUnlockTimerRef.current = window.setTimeout(() => {
      if (!inertiaLockRef.current) {
        inertiaUnlockTimerRef.current = null;
        return;
      }

      inertiaLockRef.current = false;
      inertiaLockUntilRef.current = 0;
      inertiaUnlockTimerRef.current = null;
      resetDrag();
    }, remainingMs);
  }, [resetDrag]);

  const lockUntilWheelQuiet = useCallback(() => {
    inertiaLockRef.current = true;
    inertiaLockUntilRef.current =
      performance.now() + MODAL_NAVIGATION.inertiaQuietMs;
    scheduleInertiaUnlock();
  }, [scheduleInertiaUnlock]);

  const triggerOpenAnimation = useCallback(() => {
    setIsOpening(true);

    if (openingTimerRef.current !== null) {
      window.clearTimeout(openingTimerRef.current);
    }

    openingTimerRef.current = window.setTimeout(() => {
      setIsOpening(false);
      openingTimerRef.current = null;
    }, MODAL_NAVIGATION.openAnimationMs);
  }, []);

  const openSection = useCallback(
    (section: ModalSectionKey) => {
      const wasClosed = activeSectionRef.current === null;

      activeSectionRef.current = section;
      setActiveSection(section);
      resetDrag();

      if (wasClosed) {
        triggerOpenAnimation();
      }
    },
    [resetDrag, triggerOpenAnimation],
  );

  const close = useCallback(() => {
    activeSectionRef.current = null;
    setActiveSection(null);
    resetDrag();
  }, [resetDrag]);

  const commitDirection = useCallback(
    (direction: 1 | -1) => {
      const activeIndex = getModalIndex(activeSectionRef.current);

      if (activeIndex === -1) {
        if (direction > 0) {
          openSection(MODAL_SECTION_KEYS[0]);
          lockUntilWheelQuiet();
        }
        return;
      }

      const nextIndex = activeIndex + direction;

      if (nextIndex < 0) {
        close();
        lockUntilWheelQuiet();
        return;
      }

      if (nextIndex >= MODAL_SECTION_KEYS.length) {
        scheduleRelease();
        return;
      }

      openSection(MODAL_SECTION_KEYS[nextIndex]);
      lockUntilWheelQuiet();
    },
    [close, lockUntilWheelQuiet, openSection, scheduleRelease],
  );

  const applyScrollDelta = useCallback(
    (deltaY: number, source: "touch" | "wheel") => {
      const maxDelta =
        source === "touch"
          ? MODAL_NAVIGATION.maxTouchDeltaPx
          : MODAL_NAVIGATION.maxWheelDeltaPx;
      const normalizedDelta = clamp(deltaY, -maxDelta, maxDelta);

      if (Math.abs(normalizedDelta) < 0.5) {
        return;
      }

      const direction = getDirection(normalizedDelta);
      const activeIndex = getModalIndex(activeSectionRef.current);
      const now = performance.now();

      if (activeIndex === -1 && direction < 0) {
        return;
      }

      if (
        lastGestureAtRef.current > 0 &&
        now - lastGestureAtRef.current > MODAL_NAVIGATION.gestureQuietMs
      ) {
        resetGesture();
      }

      if (gestureDirectionRef.current !== direction) {
        resetGesture();
      }

      gestureDirectionRef.current = direction;
      lastGestureAtRef.current = now;
      accumulatedDeltaRef.current += normalizedDelta;
      gestureEventCountRef.current += 1;

      const distance = Math.abs(accumulatedDeltaRef.current);
      const nextIndex = activeIndex + direction;
      const hasNextPanel =
        activeIndex !== -1 &&
        nextIndex >= 0 &&
        nextIndex < MODAL_SECTION_KEYS.length;
      const maxDrag = hasNextPanel
        ? MODAL_NAVIGATION.maxDragPx
        : MODAL_NAVIGATION.bottomBouncePx;

      if (activeIndex !== -1 && source === "touch") {
        setIsScrollInteracting(true);
        setDragOffsetPx(-direction * getDampedDragOffset(distance, maxDrag));
        scheduleRelease();
      }

      const threshold =
        activeIndex === -1
          ? MODAL_NAVIGATION.homeOpenThresholdPx
          : source === "touch"
            ? MODAL_NAVIGATION.touchSwitchThresholdPx
            : MODAL_NAVIGATION.panelSwitchThresholdPx;
      const hasEnoughEvents =
        source === "touch" ||
        gestureEventCountRef.current >=
          MODAL_NAVIGATION.minWheelEventsBeforeCommit;

      if (
        distance >= threshold &&
        hasEnoughEvents &&
        (activeIndex === -1 || hasNextPanel || nextIndex < 0)
      ) {
        resetDrag();
        commitDirection(direction);
      }
    },
    [commitDirection, resetDrag, resetGesture, scheduleRelease],
  );

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      const deltaY = normalizeWheelDelta(event);

      if (Math.abs(deltaY) < 0.5) {
        return;
      }

      const direction = getDirection(deltaY);

      if (getContentScrollable(event.target, deltaY)) {
        markContentScroll(direction);
        return;
      }

      if (inertiaLockRef.current) {
        if (performance.now() < inertiaLockUntilRef.current) {
          event.preventDefault();
          return;
        }

        inertiaLockRef.current = false;
        inertiaLockUntilRef.current = 0;
      }

      if (
        boundaryGateDirectionRef.current === direction &&
        performance.now() < boundaryGateUntilRef.current
      ) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      applyScrollDelta(deltaY, "wheel");
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

      if (Math.abs(deltaY) < 0.5) {
        return;
      }

      const direction = getDirection(deltaY);

      if (getContentScrollable(event.target, deltaY)) {
        markContentScroll(direction);
        return;
      }

      if (
        boundaryGateDirectionRef.current === direction &&
        performance.now() < boundaryGateUntilRef.current
      ) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      applyScrollDelta(deltaY, "touch");
    };

    const handleTouchEnd = () => {
      touchStartYRef.current = null;
      touchLastYRef.current = null;
      scheduleRelease();
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

      if (inertiaUnlockTimerRef.current !== null) {
        window.clearTimeout(inertiaUnlockTimerRef.current);
      }

      if (openingTimerRef.current !== null) {
        window.clearTimeout(openingTimerRef.current);
      }
    };
  }, [
    applyScrollDelta,
    markContentScroll,
    scheduleInertiaUnlock,
    scheduleRelease,
  ]);

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
      isOpening,
      isScrollInteracting,
      openSection,
    }),
    [
      activeSection,
      close,
      dragOffsetPx,
      isOpening,
      isScrollInteracting,
      openSection,
    ],
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}
