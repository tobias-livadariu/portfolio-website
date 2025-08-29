import React from 'react';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  return (
    <aside className={`glass-panel fixed left-6 top-6 bottom-6 w-80 p-6 z-10 animate-fade-in ${className}`}>
      <div className="flex flex-col h-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 accent-gradient">
            John Doe
          </h1>
          <p className="text-gray-300 text-sm mb-4">
            University of Waterloo<br />
            Software Engineering Student
          </p>
          <div className="text-xs text-gray-400 space-y-1">
            <p>📅 Born: January 15, 2002</p>
            <p>📧 john.doe@uwaterloo.ca</p>
            <p>📍 Waterloo, ON, Canada</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <nav className="space-y-3">
              <a 
                href="#about" 
                className="block text-gray-300 hover:text-accent-blue transition-colors duration-200 text-sm"
              >
                About Me
              </a>
              <a 
                href="#portfolio" 
                className="block text-gray-300 hover:text-accent-blue transition-colors duration-200 text-sm"
              >
                Portfolio
              </a>
              <a 
                href="#experience" 
                className="block text-gray-300 hover:text-accent-blue transition-colors duration-200 text-sm"
              >
                Experience
              </a>
              <a 
                href="#contact" 
                className="block text-gray-300 hover:text-accent-blue transition-colors duration-200 text-sm"
              >
                Contact
              </a>
            </nav>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {['React', 'TypeScript', 'Node.js', 'Python', 'Java', 'C++'].map((skill) => (
                <span 
                  key={skill}
                  className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex space-x-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-accent-blue transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.164 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-accent-blue transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a 
              href="mailto:john.doe@uwaterloo.ca" 
              className="text-gray-400 hover:text-accent-blue transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;