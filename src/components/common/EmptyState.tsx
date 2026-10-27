import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px 20px',
      background: 'var(--bg-subtle)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border-medium)',
      margin: '12px 0',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
        marginBottom: 16,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {icon}
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        {title}
      </h3>

      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 420, marginBottom: action ? 18 : 0 }}>
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="vlt-btn vlt-btn-primary vlt-btn-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
