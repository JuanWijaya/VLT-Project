import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarDays, 
  Timer, 
  BarChart3, 
  Settings,
  Layers,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import type { NavPage } from '../../types';
import { useAuth } from '../../context/AuthContext';

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
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari sesi VLT?')) {
      await signOut();
    }
  };

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
        {/* User Account Info Box */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6875rem',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="vlt-btn-icon"
              title="Logout"
              aria-label="Logout"
              style={{ padding: 4 }}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}

        <div className="foundation-badge">
          <div className="status-dot-pulse" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem' }}>Tahap 2A: Supabase Ready</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Auth & RLS Protected</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)', padding: '0 4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} style={{ color: 'var(--accent-emerald)' }} /> Single-User MVP
          </span>
          <span>v1.1.0-alpha</span>
        </div>
      </div>
    </aside>
  );
};
