import { useEffect } from "react";
import { MODAL_ASSETS } from "../modals.constants";
import publicPath from "../../utility/public-path";

function preloadImage(path: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = publicPath(path);
}

export default function ModalAssetPreloader() {
  useEffect(() => {
    for (const asset of MODAL_ASSETS) {
      if (asset.endsWith(".json")) {
        void fetch(publicPath(asset));
      } else {
        preloadImage(asset);
      }
    }
  }, []);

  return null;
}
