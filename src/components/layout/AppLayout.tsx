import React from 'react';
import type { NavPage } from '../../types';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import './layout.css';

interface AppLayoutProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  return (
    <div className="app-container">
      {/* Desktop Navigation Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="main-content-area">
        <Header currentPage={currentPage} />
        
        <main className="page-wrapper animate-fade-in" key={currentPage}>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </div>
  );
};
