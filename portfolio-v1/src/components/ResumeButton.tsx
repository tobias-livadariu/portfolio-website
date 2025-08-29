import React from 'react';

interface ResumeButtonProps {
  className?: string;
}

const ResumeButton: React.FC<ResumeButtonProps> = ({ className = '' }) => {
  const handleDownload = () => {
    const resumeUrl = '/resume.pdf';
    const link = document.createElement('a');
    link.href = resumeUrl;
    link.download = 'John_Doe_Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = () => {
    window.open('/resume.pdf', '_blank');
  };

  return (
    <div className={`glass-panel p-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-3 accent-gradient">Resume</h3>
        <p className="text-gray-300 text-sm mb-6">
          Download or view my resume to see my complete experience, education, and skills.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleView}
            className="glass-button px-6 py-3 text-white font-medium flex items-center justify-center space-x-2 hover:text-accent-blue transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>View Resume</span>
          </button>
          
          <button
            onClick={handleDownload}
            className="glass-button px-6 py-3 text-white font-medium flex items-center justify-center space-x-2 hover:text-accent-teal transition-colors bg-gradient-to-r from-accent-blue/10 to-accent-teal/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download PDF</span>
          </button>
        </div>

        <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-400">
          <span>📄 Software Engineering Resume</span>
          <span>•</span>
          <span>📅 Updated January 2025</span>
        </div>
      </div>
    </div>
  );
};

export default ResumeButton;