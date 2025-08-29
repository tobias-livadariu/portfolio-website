import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import About from './components/About';
import PortfolioGrid from './components/PortfolioGrid';
import ResumeButton from './components/ResumeButton';
import ContactButton from './components/ContactButton';

function App() {
  useEffect(() => {
    document.title = 'John Doe - Software Engineering Student';
  }, []);

  const smoothScroll = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen relative">
      <Sidebar className="lg:block hidden" />
      
      <main className="lg:ml-96 lg:pl-8 px-4 lg:pr-8 py-8 max-w-6xl">
        <div className="space-y-8">
          <About />
          
          <section id="experience" className="glass-panel p-4 lg:p-8 animate-slide-up">
            <h2 className="text-xl lg:text-2xl font-bold mb-6 accent-gradient">Experience</h2>
            
            <div className="space-y-6">
              <div className="border-l-2 border-accent-blue/30 pl-4 lg:pl-6">
                <div className="mb-4">
                  <h3 className="text-base lg:text-lg font-semibold text-white">Software Engineering Intern</h3>
                  <p className="text-accent-teal text-sm lg:text-base">TechCorp Inc. • Summer 2024</p>
                  <p className="text-gray-400 text-xs lg:text-sm">Waterloo, ON</p>
                </div>
                <ul className="text-gray-300 text-xs lg:text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="text-accent-teal mr-2 mt-1">▸</span>
                    Developed and maintained microservices using Node.js and Express, serving 10k+ daily users
                  </li>
                  <li className="flex items-start">
                    <span className="text-accent-teal mr-2 mt-1">▸</span>
                    Implemented automated testing pipelines, reducing bug reports by 35%
                  </li>
                  <li className="flex items-start">
                    <span className="text-accent-teal mr-2 mt-1">▸</span>
                    Collaborated with cross-functional teams using Agile methodologies
                  </li>
                </ul>
              </div>

              <div className="border-l-2 border-accent-blue/30 pl-4 lg:pl-6">
                <div className="mb-4">
                  <h3 className="text-base lg:text-lg font-semibold text-white">Research Assistant</h3>
                  <p className="text-accent-teal text-sm lg:text-base">University of Waterloo • Fall 2023</p>
                  <p className="text-gray-400 text-xs lg:text-sm">Waterloo, ON</p>
                </div>
                <ul className="text-gray-300 text-xs lg:text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="text-accent-teal mr-2 mt-1">▸</span>
                    Assisted in machine learning research for natural language processing applications
                  </li>
                  <li className="flex items-start">
                    <span className="text-accent-teal mr-2 mt-1">▸</span>
                    Developed data preprocessing scripts in Python, improving model accuracy by 12%
                  </li>
                  <li className="flex items-start">
                    <span className="text-accent-teal mr-2 mt-1">▸</span>
                    Published findings in undergraduate research symposium
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <PortfolioGrid />
          
          <div className="grid lg:grid-cols-2 gap-8">
            <ResumeButton />
            <ContactButton />
          </div>
        </div>
      </main>

      <button
        onClick={() => smoothScroll('about')}
        className="fixed bottom-4 lg:bottom-8 right-4 lg:right-8 glass-button p-2 lg:p-3 text-accent-blue hover:text-white transition-colors animate-bounce"
        title="Scroll to top"
      >
        <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}

export default App
