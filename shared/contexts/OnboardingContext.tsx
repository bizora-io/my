import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface Step {
  target: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  route: string;
}

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  steps: Step[];
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const steps: Step[] = [
    {
      target: 'body',
      title: "Welcome to Bizora! 🚀",
      content: "Let's take a quick interactive tour to get you familiar with your new high-performance business dashboard and high-speed sales terminal.",
      placement: 'center',
      route: '/'
    },
    {
      target: '#dashboard-header',
      title: "Dashboard Header",
      content: "This shows your current operations hub. Keep track of daily performance, language filters, and real-time summaries.",
      placement: 'bottom',
      route: '/'
    },
    {
      target: '#today-sales-card',
      title: "Today's Sales Summary",
      content: "Keep a pulse on your financial health. Monitor critical indicators like Today's Sales, Net Profit, and Cash Position instantly.",
      placement: 'bottom',
      route: '/'
    },
    {
      target: '#sales-target-card',
      title: "Track Sales Goals 📈",
      content: "Set monthly sales targets for your team or store, and monitor progress in real-time.",
      placement: 'top',
      route: '/'
    },
    {
      target: '#quick-create-btn',
      title: "Instant Creation Shortcuts",
      content: "Need to create a fast sale, purchase invoice, or add a new product? Use this dropdown button from any page!",
      placement: 'bottom',
      route: '/'
    },
    {
      target: '#sidebar-link-sale',
      title: "Let's Visit the POS Terminal 🛒",
      content: "Clicking 'Sale' opens our high-speed, real-time selling screen. Let's transition there automatically to see how it works!",
      placement: 'right',
      route: '/'
    },
    {
      target: '#sell-container',
      title: "Point of Sale (POS) Hub",
      content: "Welcome to the high-speed sales panel. This screen is highly optimized for rapid checkout, barcode scanning, and multi-payment configurations.",
      placement: 'center',
      route: '/sale'
    },
    {
      target: '#product-search-input',
      title: "Instant Search or Barcode Scan",
      content: "Search for items by name, category, or barcode. Clicking a product card adds it to the active cart instantly.",
      placement: 'bottom',
      route: '/sale'
    },
    {
      target: '#customer-select-section',
      title: "Customer & Split Accounts",
      content: "Select 'Walk-in Customer' or search for a registered customer. Track their past history, dues, and transaction logs automatically.",
      placement: 'bottom',
      route: '/sale'
    },
    {
      target: '#checkout-summary-section',
      title: "Totals, Installments, & checkout 💳",
      content: "Apply discount coupon codes, manage dynamic taxes, or support multiple split payment modes (Cash, Card, Mobile, Due, Installment Plans). Then hit 'Confirm Sale' to print or send the invoice!",
      placement: 'top',
      route: '/sale'
    },
    {
      target: 'body',
      title: "You're All Set! 🎉",
      content: "You have completed the Bizora interactive tour. Get ready to streamline your operations, monitor profits, and scale your business!",
      placement: 'center',
      route: '/sale'
    }
  ];

  useEffect(() => {
    // Check if user has completed onboarding before
    const hasCompleted = localStorage.getItem('bizora_onboarding_completed');
    if (!hasCompleted) {
      // Delay slightly for initial layout rendering
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // When active step changes, check if we need to redirect
  useEffect(() => {
    if (isActive && steps[currentStep]) {
      const step = steps[currentStep];
      // Normalizing '/' and '/admin' (as '/' usually redirects or loads Overview)
      const currentPath = location.pathname;
      const targetRoute = step.route;
      
      // If we need to go to '/' but we're on /admin (or vice versa), check if they are equivalent.
      const isDashboardRoute = (currentPath === '/' || currentPath === '/admin');
      const isTargetDashboard = (targetRoute === '/' || targetRoute === '/admin');

      if (!(isDashboardRoute && isTargetDashboard) && currentPath !== targetRoute) {
        navigate(targetRoute);
      }
    }
  }, [currentStep, isActive]);

  const startTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const endTour = () => {
    setIsActive(false);
    localStorage.setItem('bizora_onboarding_completed', 'true');
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <OnboardingContext.Provider value={{ isActive, currentStep, steps, startTour, endTour, nextStep, prevStep }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
