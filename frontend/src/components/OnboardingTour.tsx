import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

export const OnboardingTour: React.FC = () => {
  const { isActive, currentStep, steps, nextStep, prevStep, endTour } = useOnboarding();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!isActive || !step) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      if (!step.target || step.target === 'body') {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.target);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });

    // Rapid check interval to handle navigation loads and rendering changes smoothly
    const interval = setInterval(updateRect, 150);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      clearInterval(interval);
    };
  }, [isActive, currentStep, step?.target]);

  if (!isActive || !step) return null;

  const getTooltipStyle = () => {
    if (!rect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const,
        zIndex: 9999,
      };
    }

    const margin = 14;
    const tooltipWidth = 350;
    let top = rect.bottom + margin;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    const placement = step.placement;

    if (placement === 'top') {
      top = rect.top - margin;
    } else if (placement === 'left') {
      top = rect.top + rect.height / 2;
      left = rect.left - tooltipWidth - margin;
    } else if (placement === 'right') {
      top = rect.top + rect.height / 2;
      left = rect.right + margin;
    }

    const padding = 16;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    if (placement === 'left' || placement === 'right') {
      top = Math.max(padding, Math.min(screenHeight - 200, top));
    } else {
      left = Math.max(padding, Math.min(screenWidth - tooltipWidth - padding, left));
    }

    return {
      top: top,
      left: left,
      position: 'fixed' as const,
      width: tooltipWidth,
      zIndex: 9999,
      transform: placement === 'top' ? 'translateY(-100%)' : (placement === 'left' || placement === 'right') ? 'translateY(-50%)' : undefined,
    };
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Background Dim Overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px] transition-opacity duration-300 pointer-events-auto"
        style={{ zIndex: 9997 }}
        onClick={endTour}
      />

      {/* Spotlight spotlight element */}
      {rect && (
        <div 
          className="fixed rounded-xl pointer-events-none transition-all duration-300 border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] bg-transparent"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.7)',
            zIndex: 9998,
          }}
        >
          {/* Glow indicator */}
          <span className="absolute -inset-1 rounded-xl border border-indigo-400 animate-ping opacity-75 pointer-events-none" />
        </div>
      )}

      {/* Popover Tooltip */}
      <div 
        style={getTooltipStyle()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 flex flex-col pointer-events-auto transition-all duration-300 animate-in zoom-in-95 duration-200"
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <h4 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">{step.title}</h4>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full border border-indigo-100/50">
              {currentStep + 1}/{steps.length}
            </span>
            <button 
              onClick={endTour}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-slate-600 text-xs leading-relaxed mb-5 font-medium">
          {step.content}
        </div>

        <div className="flex flex-col gap-3 mt-auto">
          {/* Enhanced Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-300 rounded-full shadow-xs" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-slate-400 font-medium normal-case">
                {steps.length - currentStep - 1 === 0 ? 'Last step' : `${steps.length - currentStep - 1} left`}
              </span>
            </span>

            <div className="flex items-center gap-1.5">
              {currentStep < steps.length - 1 && (
                <button 
                  onClick={endTour}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 font-semibold rounded-lg transition-all mr-1"
                >
                  Skip
                </button>
              )}

              {currentStep > 0 && (
                <button 
                  onClick={prevStep}
                  className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 font-bold flex items-center gap-0.5 border border-slate-200 hover:border-slate-300 rounded-lg transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}

              <button 
                onClick={nextStep}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-0.5 rounded-lg shadow-sm hover:shadow transition-all"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
