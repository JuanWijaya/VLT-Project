import React from 'react';
import { Sun, Moon, Layers, ShieldCheck, LogOut } from 'lucide-react';
import type { NavPage } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { navigationItems } from './Sidebar';

interface HeaderProps {
  currentPage: NavPage;
}

export const Header: React.FC<HeaderProps> = ({ currentPage }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const currentItem = navigationItems.find((item) => item.id === currentPage);

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'V';
  const displayEmail = user?.email || 'Self-Use Mode';

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari sesi VLT?')) {
      await signOut();
    }
  };

  return (
    <header className="vlt-header">
      <div className="header-left">
        {/* Mobile brand presentation */}
        <div className="header-mobile-brand">
          <div className="brand-icon-box" style={{ width: 32, height: 32, borderRadius: 8 }}>
            <Layers size={17} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>VLT</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginLeft: 6 }}>{currentItem?.label}</span>
          </div>
        </div>

        {/* Desktop title presentation */}
        <div className="header-title-wrapper">
          <h1 className="header-page-title">{currentItem?.label || 'Dashboard'}</h1>
          <span className="header-page-subtitle">{currentItem?.description}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Status pill: Personal Self-Use */}
        <div className="user-status-pill" title={`Terautentikasi: ${displayEmail}`}>
          <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
          <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email ? user.email.split('@')[0] : 'Self-Use'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label={`Ganti ke tema ${resolvedTheme === 'dark' ? 'terang' : 'gelap'}`}
          title={`Tema saat ini: ${resolvedTheme === 'dark' ? 'Gelap (Dark)' : 'Terang (Light)'}. Klik untuk beralih.`}
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Pill */}
        <div 
          className="user-avatar"
          title={`Akun: ${displayEmail}`}
        >
          {userInitial}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="vlt-btn-icon"
          title="Keluar dari akun (Logout)"
          aria-label="Logout"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
