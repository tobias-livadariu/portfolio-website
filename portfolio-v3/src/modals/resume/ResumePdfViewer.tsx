import { memo, useEffect, useRef, useState } from "react";
import {
  AnnotationLayer,
  GlobalWorkerOptions,
  TextLayer,
  getDocument,
} from "pdfjs-dist";
import type {
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist/types/src/display/api";
import { LinkTarget, SimpleLinkService } from "pdfjs-dist/web/pdf_viewer.mjs";
import PdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "pdfjs-dist/web/pdf_viewer.css";

GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

interface Props {
  src: string;
}

type Status = "loading" | "ready" | "error";

function ResumePdfViewer({ src }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    let pdf: PDFDocumentProxy | null = null;
    let activeTasks: RenderTask[] = [];
    let lastRenderedWidth = 0;
    let isRendering = false;
    let pendingRender = false;

    const linkService = new SimpleLinkService();
    linkService.externalLinkTarget = LinkTarget.BLANK;
    linkService.externalLinkRel = "noopener noreferrer";

    const renderAll = async () => {
      if (isRendering) {
        pendingRender = true;
        return;
      }
      isRendering = true;

      try {
        const targetWidth = container.clientWidth;
        if (targetWidth <= 0 || targetWidth === lastRenderedWidth) {
          return;
        }

        if (!pdf) {
          pdf = await getDocument(src).promise;
          if (cancelled) return;
        }

        activeTasks.forEach((task) => task.cancel());
        activeTasks = [];
        container.replaceChildren();

        const dpr = window.devicePixelRatio || 1;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const pageEl = document.createElement("div");
          pageEl.className = "modal-resume-pdf-page";
          pageEl.style.width = `${viewport.width}px`;
          pageEl.style.height = `${viewport.height}px`;
          container.appendChild(pageEl);

          const canvas = document.createElement("canvas");
          canvas.className = "modal-resume-pdf-canvas";
          canvas.width = Math.round(viewport.width * dpr);
          canvas.height = Math.round(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          pageEl.appendChild(canvas);

          const renderTask = page.render({
            canvas,
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          });
          activeTasks.push(renderTask);

          try {
            await renderTask.promise;
          } catch (err) {
            if ((err as { name?: string })?.name === "RenderingCancelledException") {
              return;
            }
            throw err;
          }
          if (cancelled) return;

          const textLayerDiv = document.createElement("div");
          textLayerDiv.className = "textLayer";
          pageEl.appendChild(textLayerDiv);

          const textLayer = new TextLayer({
            textContentSource: page.streamTextContent(),
            container: textLayerDiv,
            viewport,
          });
          await textLayer.render();
          if (cancelled) return;

          const annotations = await page.getAnnotations({ intent: "display" });
          if (annotations.length > 0) {
            const annotationLayerDiv = document.createElement("div");
            annotationLayerDiv.className = "annotationLayer";
            pageEl.appendChild(annotationLayerDiv);

            const annotationLayer = new AnnotationLayer({
              div: annotationLayerDiv,
              accessibilityManager: null,
              annotationCanvasMap: null,
              annotationEditorUIManager: null,
              page,
              viewport: viewport.clone({ dontFlip: true }),
              structTreeLayer: null,
              commentManager: null,
              linkService,
              annotationStorage: pdf.annotationStorage,
            });
            await annotationLayer.render({
              annotations,
              div: annotationLayerDiv,
              page,
              viewport: viewport.clone({ dontFlip: true }),
              linkService,
              imageResourcesPath: "",
              renderForms: false,
              enableScripting: false,
              hasJSActions: false,
            });
          }
        }

        lastRenderedWidth = targetWidth;
        if (!cancelled) {
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Resume PDF render failed:", err);
          setStatus("error");
        }
      } finally {
        isRendering = false;
        if (pendingRender && !cancelled) {
          pendingRender = false;
          void renderAll();
        }
      }
    };

    const observer = new ResizeObserver(() => {
      void renderAll();
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      activeTasks.forEach((task) => task.cancel());
      observer.disconnect();
      pdf?.destroy();
    };
  }, [src]);

  return (
    <div className="modal-resume-pdf-viewer">
      <div className="modal-resume-pdf-pages" ref={containerRef} />
      {status === "loading" && (
        <div className="modal-resume-pdf-status">Rendering resume…</div>
      )}
      {status === "error" && (
        <div className="modal-resume-pdf-status modal-resume-pdf-status-error">
          Could not render resume PDF.
        </div>
      )}
    </div>
  );
}

export default memo(ResumePdfViewer);
