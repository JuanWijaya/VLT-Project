import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarDays, 
  Timer, 
  BarChart3, 
  Settings,
  Flame,
  Layers
} from 'lucide-react';
import type { NavPage } from '../../types';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export const navigationItems: Array<{ id: NavPage; label: string; icon: React.ElementType; description: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Prioritas & ringkasan harian' },
  { id: 'learning', label: 'My Learning', icon: BookOpen, description: 'Roadmap course & lesson' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, description: 'Jadwal belajar & deadline' },
  { id: 'focus', label: 'Focus Room', icon: Timer, description: 'Sesi Pomodoro terfokus' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Waktu fokus & konsistensi' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Preferensi sistem & tema' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return (
    <aside className="vlt-sidebar" aria-label="Main Navigation">
      <div className="sidebar-header">
        <div className="brand-wrapper">
          <div className="brand-icon-box">
            <Layers size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-title">VLT Platform</span>
            <span className="brand-subtitle">Plan • Execute • Track</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav-container">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              title={item.description}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="foundation-badge">
          <div className="status-dot-pulse" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem' }}>Tahap 1: Fondasi UI</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>PRD v1.0 • Client-side</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)', padding: '0 4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Flame size={13} style={{ color: 'var(--accent-amber)' }} /> MVP Self-Use
          </span>
          <span>v1.0.0-rc</span>
        </div>
      </div>
    </aside>
  );
};
