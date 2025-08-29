import React from 'react';

interface Project {
  id: number;
  title: string;
  description: string;
  role: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
}

const PortfolioGrid: React.FC = () => {
  const projects: Project[] = [
    {
      id: 1,
      title: "E-Commerce Platform",
      description: "A full-stack e-commerce solution with user authentication, payment processing, and inventory management. Built with React, Node.js, and PostgreSQL.",
      role: "Full-Stack Developer",
      technologies: ["React", "Node.js", "PostgreSQL", "Stripe", "AWS"],
      githubUrl: "https://github.com",
      liveUrl: "https://demo.com"
    },
    {
      id: 2,
      title: "Task Management System",
      description: "A collaborative project management tool with real-time updates, file sharing, and team collaboration features.",
      role: "Frontend Lead",
      technologies: ["React", "TypeScript", "Socket.io", "MongoDB"],
      githubUrl: "https://github.com"
    },
    {
      id: 3,
      title: "Weather Analytics Dashboard",
      description: "A data visualization platform that aggregates weather data from multiple APIs and presents insights through interactive charts.",
      role: "Data Engineer",
      technologies: ["Python", "Flask", "D3.js", "Redis", "Docker"],
      githubUrl: "https://github.com",
      liveUrl: "https://weather-analytics.com"
    },
    {
      id: 4,
      title: "Mobile Fitness Tracker",
      description: "Cross-platform mobile app for tracking workouts, nutrition, and health metrics with social features and progress analytics.",
      role: "Mobile Developer",
      technologies: ["React Native", "Firebase", "Redux", "Chart.js"],
      githubUrl: "https://github.com"
    },
    {
      id: 5,
      title: "AI Code Review Tool",
      description: "Machine learning-powered tool that analyzes code quality, suggests improvements, and detects potential bugs automatically.",
      role: "ML Engineer",
      technologies: ["Python", "TensorFlow", "FastAPI", "Docker", "GitHub API"],
      githubUrl: "https://github.com"
    },
    {
      id: 6,
      title: "Real-time Chat Platform",
      description: "Scalable messaging platform with end-to-end encryption, file sharing, and video calling capabilities.",
      role: "Backend Developer",
      technologies: ["Node.js", "WebRTC", "Socket.io", "MongoDB", "WebSockets"],
      githubUrl: "https://github.com",
      liveUrl: "https://chat-platform.com"
    }
  ];

  return (
    <section id="portfolio" className="mb-8">
      <div className="glass-panel p-8 mb-6">
        <h2 className="text-2xl font-bold mb-4 accent-gradient">Portfolio</h2>
        <p className="text-gray-300 mb-6">
          A collection of projects showcasing my technical skills and problem-solving approach. 
          Each project represents a unique challenge and learning opportunity.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <div 
            key={project.id} 
            className="glass-panel p-6 hover:scale-105 transition-all duration-300 animate-slide-up group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-accent-blue transition-colors">
                {project.title}
              </h3>
              <span className="text-xs text-accent-teal bg-accent-teal/10 px-2 py-1 rounded-full">
                {project.role}
              </span>
            </div>

            <p className="text-gray-300 text-sm mb-4 line-clamp-3">
              {project.description}
            </p>

            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {project.technologies.map((tech) => (
                  <span 
                    key={tech}
                    className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/10"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex space-x-4 pt-2">
              {project.githubUrl && (
                <a 
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  title="View Source"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.164 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                </a>
              )}
              {project.liveUrl && (
                <a 
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-accent-blue transition-colors"
                  title="View Live Demo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PortfolioGrid;