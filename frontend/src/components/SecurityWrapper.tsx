import React from 'react';

interface SecurityWrapperProps {
  children: React.ReactNode;
}

const SecurityWrapper: React.FC<SecurityWrapperProps> = ({ children }) => {
  // Render children directly. This avoids any cross-origin sandboxed iframe issues
  // with window property access (like outerWidth/innerHeight) and event prevention.
  return (
    <div className="security-wrapper h-full w-full">
      {children}
    </div>
  );
};

export default SecurityWrapper;
