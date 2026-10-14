import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export default function NotificationToast({ notification, onDismiss }) {
  if (!notification) return null;

  const typeConfig = {
    warning: {
      border: '1px solid rgba(245, 158, 11, 0.4)',
      bg: 'var(--bg-surface-raised, #1f2737)',
      iconColor: 'var(--color-warning, #f59e0b)',
      Icon: AlertTriangle
    },
    error: {
      border: '1px solid rgba(239, 68, 68, 0.4)',
      bg: 'var(--bg-surface-raised, #1f2737)',
      iconColor: 'var(--color-danger, #ef4444)',
      Icon: XCircle
    },
    success: {
      border: '1px solid rgba(16, 185, 129, 0.4)',
      bg: 'var(--bg-surface-raised, #1f2737)',
      iconColor: 'var(--color-success, #10b981)',
      Icon: CheckCircle2
    },
    info: {
      border: '1px solid var(--border-strong, #334158)',
      bg: 'var(--bg-surface-raised, #1f2737)',
      iconColor: 'var(--color-primary, #2563eb)',
      Icon: Info
    }
  };

  const current = typeConfig[notification.type || 'info'] || typeConfig.info;
  const IconComponent = current.Icon;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      maxWidth: '420px',
      padding: '12px 14px',
      borderRadius: '6px',
      background: current.bg,
      border: current.border,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px'
    }}>
      <IconComponent size={16} style={{ color: current.iconColor, flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #f8fafc)', marginBottom: '2px' }}>
          {notification.title || 'System Notification'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.4 }}>
          {notification.message}
        </div>
        {notification.savings && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-success, #10b981)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            {notification.savings}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted, #64748b)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
