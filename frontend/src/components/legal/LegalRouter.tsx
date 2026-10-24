import React, { useState, useEffect } from 'react';
import LegalOverviewPage from './LegalOverviewPage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import TermsOfServicePage from './TermsOfServicePage';
import CookiePolicyPage from './CookiePolicyPage';
import RefundPolicyPage from './RefundPolicyPage';
import DataSecurityPage from './DataSecurityPage';
import AccountDeletionPage from './AccountDeletionPage';

export function getLegalDocFromLocation(): string {
  if (typeof window === 'undefined') return 'overview';
  const full = (window.location.hash + window.location.pathname).toLowerCase();

  if (full.includes('privacy')) return 'privacy';
  if (full.includes('terms')) return 'terms';
  if (full.includes('cookie')) return 'cookies';
  if (full.includes('refund')) return 'refunds';
  if (full.includes('security') || full.includes('processing')) return 'security';
  if (full.includes('deletion') || full.includes('delete')) return 'deletion';
  return 'overview';
}

export const LegalRouter: React.FC = () => {
  const [doc, setDoc] = useState<string>(() => getLegalDocFromLocation());

  useEffect(() => {
    const handleLocation = () => {
      setDoc(getLegalDocFromLocation());
    };
    window.addEventListener('hashchange', handleLocation);
    window.addEventListener('popstate', handleLocation);
    return () => {
      window.removeEventListener('hashchange', handleLocation);
      window.removeEventListener('popstate', handleLocation);
    };
  }, []);

  switch (doc) {
    case 'privacy':
      return <PrivacyPolicyPage />;
    case 'terms':
      return <TermsOfServicePage />;
    case 'cookies':
      return <CookiePolicyPage />;
    case 'refunds':
      return <RefundPolicyPage />;
    case 'security':
      return <DataSecurityPage />;
    case 'deletion':
      return <AccountDeletionPage />;
    default:
      return <LegalOverviewPage />;
  }
};
export default LegalRouter;

