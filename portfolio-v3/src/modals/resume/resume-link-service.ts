/* What pdf.js's link layer needs in order to turn the résumé's link
   annotations into real anchors.

   pdf.js provides this as `SimpleLinkService` in its viewer bundle, but
   importing that one class pulls about 140 KB of unrelated viewer code into
   the résumé's download. This is the same behaviour for the one thing a
   single static document uses: web links, opened in a new tab. Links that
   would move around inside a document, run a named action or open an
   attachment do nothing, as in `SimpleLinkService`, which has no viewer to
   act on. */
const DEFAULT_LINK_REL = "noopener noreferrer nofollow";

export default class ResumeLinkService {
  externalLinkEnabled = true;
  externalLinkRel: string | null = "noopener noreferrer";
  eventBus = undefined;
  isInPresentationMode = false;

  /* Mirrors `PDFLinkService.addLinkAttributes` with its target fixed to a
     new tab. Any username or password in the address is left out of the
     tooltip. */
  addLinkAttributes(link: HTMLAnchorElement, url: string) {
    if (!url || typeof url !== "string") {
      throw new Error('A valid "url" parameter must provided.');
    }

    let displayUrl = url;

    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.username || parsedUrl.password) {
        parsedUrl.username = parsedUrl.password = "";
        displayUrl = parsedUrl.href;
      }
    } catch {
      // Not an absolute address: show it as written.
    }

    link.href = url;
    link.title = displayUrl;
    link.target = "_blank";
    link.rel =
      typeof this.externalLinkRel === "string"
        ? this.externalLinkRel
        : DEFAULT_LINK_REL;
  }

  getDestinationHash(destination: unknown) {
    if (typeof destination === "string" && destination.length > 0) {
      return this.getAnchorUrl(`#${escape(destination)}`);
    }

    if (Array.isArray(destination)) {
      return this.getAnchorUrl(`#${escape(JSON.stringify(destination))}`);
    }

    return this.getAnchorUrl("");
  }

  getAnchorUrl(anchor: string) {
    return anchor;
  }

  async goToDestination() {}

  goToPage() {}

  goToXY() {}

  executeNamedAction() {}

  executeSetOCGState() {}

  async getAttachmentContent() {
    return null;
  }
}
