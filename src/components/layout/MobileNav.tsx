import React from 'react';
import type { NavPage } from '../../types';
import { navigationItems } from './Sidebar';

interface MobileNavProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  return (
    <nav className="vlt-bottom-nav" aria-label="Mobile Navigation">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-label={item.label}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
