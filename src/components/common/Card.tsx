import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  style, 
  hoverable = false 
}) => {
  return (
    <div 
      className={`vlt-card ${hoverable ? 'vlt-card-hover' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};
