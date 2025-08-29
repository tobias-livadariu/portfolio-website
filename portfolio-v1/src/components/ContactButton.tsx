import React, { useState } from 'react';

interface ContactButtonProps {
  className?: string;
}

const ContactButton: React.FC<ContactButtonProps> = ({ className = '' }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:john.doe@uwaterloo.ca?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`;
    window.location.href = mailtoUrl;
    setIsFormVisible(false);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const quickContactMethods = [
    {
      name: 'Email',
      value: 'john.doe@uwaterloo.ca',
      href: 'mailto:john.doe@uwaterloo.ca',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'LinkedIn',
      value: 'Connect on LinkedIn',
      href: 'https://linkedin.com/in/johndoe',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    }
  ];

  return (
    <div className={`glass-panel p-6 ${className}`} id="contact">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-3 accent-gradient">Get In Touch</h3>
        <p className="text-gray-300 text-sm">
          Interested in working together? Let's discuss opportunities and ideas.
        </p>
      </div>

      {!isFormVisible ? (
        <div className="space-y-4">
          <button
            onClick={() => setIsFormVisible(true)}
            className="w-full glass-button px-6 py-3 text-white font-medium flex items-center justify-center space-x-2 hover:text-accent-blue transition-colors bg-gradient-to-r from-accent-blue/10 to-accent-teal/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Send Message</span>
          </button>

          <div className="space-y-3">
            {quickContactMethods.map((method) => (
              <a
                key={method.name}
                href={method.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-3 p-3 glass-button hover:text-accent-teal transition-colors text-sm"
              >
                {method.icon}
                <span>{method.value}</span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-blue transition-colors"
              />
              <input
                type="email"
                name="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-blue transition-colors"
              />
            </div>
            
            <input
              type="text"
              name="subject"
              placeholder="Subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
              className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-blue transition-colors"
            />
            
            <textarea
              name="message"
              placeholder="Your message..."
              rows={4}
              value={formData.message}
              onChange={handleInputChange}
              required
              className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-blue transition-colors resize-none"
            />

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 glass-button px-6 py-3 text-white font-medium hover:text-accent-blue transition-colors bg-gradient-to-r from-accent-blue/10 to-accent-teal/10"
              >
                Send Message
              </button>
              <button
                type="button"
                onClick={() => setIsFormVisible(false)}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ContactButton;