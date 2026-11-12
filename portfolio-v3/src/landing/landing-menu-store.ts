import { useSyncExternalStore } from "react";
import type { ModalSectionKey } from "../modals/modal.types";

/* What the page's ordinary HTML menu and the 3D menu need to know about each
   other. The 3D menu is drawn inside the WebGL canvas, where the keyboard and
   screen readers cannot reach it, so a matching HTML menu sits in the page:
   it takes keyboard focus on the 3D menu's behalf, and it is shown in its
   place when the 3D menu cannot be drawn. */
interface LandingMenuState {
  /* The menu entry that currently has keyboard focus. The 3D menu lights
     that entry the same way it does under the mouse. */
  focusedSection: ModalSectionKey | null;
  // True once the 3D menu has been drawn on screen.
  is3dMenuPainted: boolean;
  // True when the 3D menu failed to load and was dropped from the scene.
  has3dMenuFailed: boolean;
}

let state: LandingMenuState = {
  focusedSection: null,
  is3dMenuPainted: false,
  has3dMenuFailed: false,
};
const listeners = new Set<() => void>();

function update(changes: Partial<LandingMenuState>) {
  const next = { ...state, ...changes };

  if (
    next.focusedSection === state.focusedSection &&
    next.is3dMenuPainted === state.is3dMenuPainted &&
    next.has3dMenuFailed === state.has3dMenuFailed
  ) {
    return;
  }

  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setLandingMenuFocus(section: ModalSectionKey | null) {
  update({ focusedSection: section });
}

export function markLandingMenuPainted() {
  update({ is3dMenuPainted: true });
}

export function markLandingMenuFailed() {
  update({ has3dMenuFailed: true, is3dMenuPainted: false });
}

export function useLandingMenuFocus() {
  return useSyncExternalStore(subscribe, () => state.focusedSection);
}

/* True while the 3D menu is on screen. */
export function useIs3dMenuShowing() {
  return useSyncExternalStore(
    subscribe,
    () => state.is3dMenuPainted && !state.has3dMenuFailed,
  );
}

export function useHas3dMenuFailed() {
  return useSyncExternalStore(subscribe, () => state.has3dMenuFailed);
}
