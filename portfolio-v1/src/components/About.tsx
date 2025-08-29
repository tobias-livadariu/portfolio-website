import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="glass-panel p-4 lg:p-8 mb-8 animate-slide-up">
      <h2 className="text-xl lg:text-2xl font-bold mb-6 accent-gradient">About Me</h2>
      
      <div className="space-y-6 text-gray-300 leading-relaxed">
        <p className="text-base lg:text-lg">
          Hello! I'm a passionate Software Engineering student at the University of Waterloo, 
          driven by curiosity and a love for solving complex problems through elegant code.
        </p>
        
        <p className="text-sm lg:text-base">
          My journey in software development began with a fascination for how technology 
          shapes our world. Through my studies and hands-on experience, I've developed 
          expertise in full-stack development, with a particular interest in creating 
          scalable web applications and exploring emerging technologies.
        </p>

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <div>
            <h3 className="text-lg lg:text-xl font-semibold mb-4 text-accent-blue">What I Do</h3>
            <ul className="space-y-2 text-xs lg:text-sm">
              <li className="flex items-start">
                <span className="text-accent-teal mr-2">▸</span>
                Full-stack web development with modern frameworks
              </li>
              <li className="flex items-start">
                <span className="text-accent-teal mr-2">▸</span>
                Mobile app development and cross-platform solutions
              </li>
              <li className="flex items-start">
                <span className="text-accent-teal mr-2">▸</span>
                Database design and optimization
              </li>
              <li className="flex items-start">
                <span className="text-accent-teal mr-2">▸</span>
                API development and system architecture
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg lg:text-xl font-semibold mb-4 text-accent-blue">Interests</h3>
            <ul className="space-y-2 text-xs lg:text-sm">
              <li className="flex items-start">
                <span className="text-accent-teal mr-2">▸</span>
                Machine Learning and AI applications
              </li>
              <li className="flex items-start">
                <span className="text-accent-teal mr-2">▸</span>
                Open source contributions and collaboration
              </li>
              <li className="flex items-start">
                <span className="text-accent-teal mr-2">▸</span>
                UI/UX design and user-centered development
              </li>
              <li className="flex items-start">
                <span className="text-accent-teal mr-2">▸</span>
                Sustainable technology and green computing
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;