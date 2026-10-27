import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { MyLearningPage } from './pages/MyLearningPage';
import { CalendarPage } from './pages/CalendarPage';
import { FocusRoomPage } from './pages/FocusRoomPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { NavPage } from './types';

export const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');

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
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
