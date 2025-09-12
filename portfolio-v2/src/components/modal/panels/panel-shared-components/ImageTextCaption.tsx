import type { PropsWithChildren } from "react";
import { useTilt } from "./useTilt.ts";

interface ImageTextCaptionProps {
  imageUrl: string;
  imageAlt: string;
  imageCaption: string;
  href?: string;        // click-through link (image becomes the link)
  newTab?: boolean;     // default true
  tilt?: boolean;       // default true
  tiltMaxDeg?: number;  // default 8
  tiltScale?: number;   // default 1.02
  showBadge?: boolean;  // default true — small "Open" badge on image corner
}

export default function ImageTextCaption(props: PropsWithChildren<ImageTextCaptionProps>) {
  const { 
    imageUrl, 
    imageAlt, 
    imageCaption, 
    children,
    href,
    newTab = true,
    tilt = true,
    tiltMaxDeg = 8,
    tiltScale = 1.02,
    showBadge = true,
  } = props;
  
  const tiltRef = useTilt<HTMLDivElement>({ maxDeg: tiltMaxDeg, scale: tiltScale });
  const anchorProps = newTab ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <div className="flex flex-col items-center flex-shrink-0">
        {/* IMAGE BLOCK */}
        {href ? (
          <a href={href} aria-label={imageAlt || 'Open project'} {...anchorProps} className="block">
            <div
              ref={tilt ? tiltRef : undefined}
              className="pixel-frame pixel-frame-hover tilt-card max-w-[300px] sm:max-w-[400px] md:max-w-none"
            >
              <div className="tilt-inner">
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className="md:w-[30vw] lg:w-[25vw] xl:w-[20vw] h-auto object-cover"
                  loading="lazy"
                />
                {showBadge && (
                  <div className="tilt-badge" aria-hidden="true">
                    Open
                  </div>
                )}
                <div className="tilt-glare" aria-hidden="true" />
              </div>
            </div>
          </a>
        ) : (
          <div className="pixel-frame max-w-[300px] sm:max-w-[400px] md:max-w-none">
            <img
              src={imageUrl}
              alt={imageAlt}
              className="md:w-[30vw] lg:w-[25vw] xl:w-[20vw] h-auto object-cover"
              loading="lazy"
            />
          </div>
        )}
        
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