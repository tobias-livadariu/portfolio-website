import { useEffect } from "react";
import { MODAL_ASSETS } from "../modals.constants";
import publicPath from "../../utility/public-path";

function preloadImage(path: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = publicPath(path);
}

export default function ModalAssetPreloader({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isDisposed = false;
    const preload = () => {
      if (isDisposed) {
        return;
      }

      for (const asset of MODAL_ASSETS) {
        if (asset.endsWith(".json")) {
          void fetch(publicPath(asset));
        } else {
          preloadImage(asset);
        }
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      const callbackId = window.requestIdleCallback(preload, { timeout: 1000 });

      return () => {
        isDisposed = true;
        window.cancelIdleCallback(callbackId);
      };
    }

    const timeoutId = window.setTimeout(preload, 200);

    return () => {
      isDisposed = true;
      window.clearTimeout(timeoutId);
    };
  }, [enabled]);

  return null;
}
