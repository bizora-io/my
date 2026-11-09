import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  threshold?: number;
  isBn?: boolean;
  theme?: 'light' | 'dark';
}

export const ScrollToTop: React.FC<ScrollToTopProps> = ({
  threshold = 300,
  isBn = false,
  theme = 'dark',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const isLight = theme === 'light';

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={isBn ? 'উপরে স্ক্রোল করুন' : 'Scroll to top'}
      title={isBn ? 'উপরে স্ক্রোল করুন' : 'Scroll to top'}
      className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full text-white transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 ${
        isLight
          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-slate-400/50 border border-emerald-400 focus:ring-offset-white'
          : 'bg-emerald-600 hover:bg-emerald-500 shadow-2xl shadow-black/60 border border-emerald-400/30 focus:ring-offset-slate-950'
      }`}
    >
      <ArrowUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
};

export default ScrollToTop;
