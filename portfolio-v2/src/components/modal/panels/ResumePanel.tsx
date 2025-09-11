// TODO: Paste your Google Drive FILE ID below (the string between /d/ and /view in the URL)
const DRIVE_ID = "1J4pOm1PnVdsCDL9Tp-9v2_JQKk7rNE_m";

// Optional cache-buster to force preview refresh after you upload a new version in Drive
// e.g., change to '?v=2025-09-10' when you update your resume
const CACHE_BUSTER = "?v=2025-09-10"; // TODO(optional): set like '?v=2025-09-10'

const PREVIEW_SRC  = `https://drive.google.com/file/d/${DRIVE_ID}/preview${CACHE_BUSTER}`;
const OPEN_SRC     = `https://drive.google.com/file/d/${DRIVE_ID}/view`;
const DOWNLOAD_SRC = `https://drive.google.com/uc?export=download&id=${DRIVE_ID}`;

export default function ResumePanel() {
  return (
    <div className="flex flex-col space-y-4 text-light-gray">
      {/* Pixel-framed viewer */}
      <div className="pixel-frame bg-[#070B14] p-2">
        <div className="h-[65vh]">
          {/* If the preview fails (ad-block/permissions), action buttons below provide fallbacks */}
          <iframe
            className="w-full h-full"
            src={PREVIEW_SRC}
            loading="lazy"
            allow="autoplay"
            title="Tobias Livadariu — Resume Preview"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a href={OPEN_SRC} target="_blank" rel="noreferrer"
           className="pixel-contact-btn w-full flex items-center px-4 py-2 font-pixelemu text-[14px] bg-campfire-ash/20 hover:bg-campfire-ash/30 text-campfire">
          <span>Open in Google Drive</span>
        </a>
        <a href={DOWNLOAD_SRC}
           className="pixel-contact-btn w-full flex items-center px-4 py-2 font-pixelemu text-[14px] bg-campfire-ash/20 hover:bg-campfire-ash/30 text-campfire">
          <span>Download PDF</span>
        </a>
        <a href="/files/Resume.pdf" target="_blank" rel="noreferrer"
           className="pixel-contact-btn w-full flex items-center px-4 py-2 font-pixelemu text-[14px] bg-campfire-ash/20 hover:bg-campfire-ash/30 text-campfire">
          <span>Local Fallback {/* TODO(optional): place a copy at /public/files/Resume.pdf */}</span>
        </a>
      </div>

      <p className="text-[12px] text-soft-gray">
        If the preview doesn't load, use the buttons above. Drive sharing must be set to
        <span className="ml-1 font-pixelemu">Anyone with the link — Viewer</span>.
      </p>
    </div>
  );
}
