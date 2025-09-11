import type { PropsWithChildren } from "react";

interface ImageTextCaptionProps {
  imageUrl: string;
  imageAlt: string;
  imageCaption: string;
}

export default function ImageTextCaption(props: PropsWithChildren<ImageTextCaptionProps>) {
  const { imageUrl, imageAlt, imageCaption, children } = props
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="pixel-frame max-w-[300px] sm:max-w-[400px] md:max-w-none">
          <img
            src={imageUrl}
            alt={imageAlt}
            className="md:w-[30vw] lg:w-[25vw] xl:w-[20vw] h-auto object-cover"
          />
        </div>
        <p className="hidden md:block text-[14px] text-light-gray mt-2 text-center md:text-left">
          {imageCaption}
        </p>
      </div>

      <div className="space-y-4 text-campfire-ash leading-relaxed text-[16px]">
        {children}
      </div>
    </div>
  );
}