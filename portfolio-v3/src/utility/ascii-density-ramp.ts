/**
 * Shared light-to-dark glyph ordering for the site's image-like ASCII art.
 *
 * Keep shape-specific characters such as slashes out of this ramp: this is for
 * continuous tone, where every glyph should read as a small patch of ink. The
 * About portrait and small vault sigils deliberately share it so both surfaces
 * have the same texture when rendered through Iosevka Term.
 */
export const ASCII_DENSITY_RAMP = " .,:;irsXA253hMHGS#9B&@";
