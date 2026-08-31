/* Module-level latch for the cursor-driven camera tilt.
   
   Selecting a render mode from inside a modal first unscrolls the page back to
   the starfield. Letting the pointer keep tilting the camera through that
   automated scroll reads as an unintended lurch, so the tilt is suppressed for
   the whole scripted sequence and released once the transition settles.

   This is deliberately not React state: PointerCameraShift samples it inside
   useFrame, so a plain module flag avoids re-rendering the entire R3F tree
   (starfield included) twice per mode change. */
let locked = false;

export function setPointerShiftLocked(nextLocked: boolean) {
  locked = nextLocked;
}

export function isPointerShiftLocked() {
  return locked;
}
