import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyLearningPage } from './pages/MyLearningPage';
import { CalendarPage } from './pages/CalendarPage';
import { FocusRoomPage } from './pages/FocusRoomPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Layers } from 'lucide-react';
import type { NavPage } from './types';

export const MainAppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');

  // Loading state saat memeriksa session Supabase
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        gap: 16,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: '0 8px 20px rgba(79, 70, 229, 0.35)',
        }}>
          <Layers size={26} />
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Memuat sesi VLT...
        </div>
      </div>
    );
  }

  // Lindungi seluruh halaman aplikasi: jika belum terautentikasi, tampilkan LoginPage
  if (!user) {
    return <LoginPage />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'learning':
        return <MyLearningPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'focus':
        return <FocusRoomPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderCurrentPage()}
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
