import React from 'react';

export type BadgeVariant = 'primary' | 'emerald' | 'amber' | 'rose' | 'subtle';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'primary', 
  icon,
  className = '' 
}) => {
  return (
    <span className={`vlt-badge vlt-badge-${variant} ${className}`}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
};
