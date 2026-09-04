let resumePdfViewerPromise:
  | ReturnType<typeof importResumePdfViewer>
  | undefined;

function importResumePdfViewer() {
  return import("./ResumePdfViewer");
}

/* React.lazy and the post-startup warmer share one promise, so approaching
   the resume never downloads or evaluates the PDF viewer more than once. */
export default function preloadResumePdfViewer() {
  resumePdfViewerPromise ??= importResumePdfViewer();
  return resumePdfViewerPromise;
}
