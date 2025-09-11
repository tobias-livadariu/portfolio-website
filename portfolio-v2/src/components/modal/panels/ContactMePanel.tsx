import { DevicePhone, Mail, Github, Dashboard } from "@nsmr/pixelart-react";

export default function ContactMePanel() {
  return (
    <div className="flex flex-col space-y-6 text-light-gray">
      <p className="text-[20px] font-pressstart"># REACH OUT</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="tel:6479063238" className="pixel-contact-btn flex items-center px-4 py-2 font-pixelemu text-[14px] bg-campfire-ash/20 hover:bg-campfire-ash/30 text-campfire">
          <DevicePhone className="w-6 h-6" />
          <span className="ml-3">Cellular (647-906-3238)</span>
        </a>

        <a href="mailto:tlivadar@uwaterloo.ca" className="pixel-contact-btn flex items-center px-4 py-2 font-pixelemu text-[14px] bg-campfire-ash/20 hover:bg-campfire-ash/30 text-campfire">
          <Mail className="w-6 h-6" />
          <span className="ml-3">Email</span>
        </a>

        <a href="https://linkedin.com/in/tobias-livadariu" target="_blank" rel="noreferrer" className="pixel-contact-btn flex items-center px-4 py-2 font-pixelemu text-[14px] bg-campfire-ash/20 hover:bg-campfire-ash/30 text-campfire">
          <Dashboard className="w-6 h-6" />
          <span className="ml-3">LinkedIn</span>
        </a>

        <a href="https://github.com/tobias-livadariu" target="_blank" rel="noreferrer" className="pixel-contact-btn flex items-center px-4 py-2 font-pixelemu text-[14px] bg-campfire-ash/20 hover:bg-campfire-ash/30 text-campfire">
          <Github className="w-6 h-6" />
          <span className="ml-3">GitHub</span>
        </a>
      </div>
    </div>
  );
}
