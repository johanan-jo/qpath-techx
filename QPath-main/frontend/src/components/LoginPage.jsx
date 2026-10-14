import React, { useState } from 'react';
import { Shield, Truck, Lock, User, ArrowRight, AlertCircle, KeyRound, Search } from 'lucide-react';
import { loginUser } from '../services/api';

export default function LoginPage({ onLoginSuccess, onTrackCustomer }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customerTokenInput, setCustomerTokenInput] = useState('');

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!customerTokenInput.trim()) return;
    if (onTrackCustomer) {
      onTrackCustomer(customerTokenInput.trim());
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await loginUser(username.trim(), password.trim());
      const { token, user } = res.data;
      localStorage.setItem('qpath_auth_token', token);
      localStorage.setItem('qpath_user', JSON.stringify(user));
      if (onLoginSuccess) {
        onLoginSuccess(user, token);
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.detail || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-canvas, #0f141c)',
      fontFamily: 'var(--font-sans)',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--bg-surface, #171d28)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle, #242e3f)',
        boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.8)',
        padding: '32px 28px',
        boxSizing: 'border-box'
      }}>
        {/* Logo and Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            background: 'var(--color-primary, #2563eb)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '18px',
            marginBottom: '12px'
          }}>
            Q
          </div>
          <h1 style={{
            margin: '0 0 4px 0',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary, #f8fafc)',
            letterSpacing: '-0.3px'
          }}>
            QPath Operations Platform
          </h1>
          <p style={{
            margin: 0,
            fontSize: '11px',
            color: 'var(--text-muted, #64748b)',
            lineHeight: '1.4'
          }}>
            Intelligent Fleet Dispatch & Optimization Engine
          </p>
        </div>

        {/* Demo Credentials Quick Fill Pills */}
        <div style={{
          backgroundColor: 'var(--bg-canvas, #0f141c)',
          border: '1px solid var(--border-subtle, #242e3f)',
          borderRadius: '6px',
          padding: '10px 12px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--text-muted, #64748b)',
            marginBottom: '6px'
          }}>
            <span>Operator quick-fill credentials</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin123')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: username === 'admin' ? 'var(--text-primary, #f8fafc)' : 'var(--text-secondary, #94a3b8)',
                backgroundColor: username === 'admin' ? 'var(--bg-surface-raised, #1f2737)' : 'transparent',
                border: '1px solid',
                borderColor: username === 'admin' ? 'var(--color-primary, #2563eb)' : 'var(--border-subtle, #242e3f)',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Shield size={12} style={{ color: 'var(--color-primary, #2563eb)' }} />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('driver1', 'driver1')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: username === 'driver1' ? 'var(--text-primary, #f8fafc)' : 'var(--text-secondary, #94a3b8)',
                backgroundColor: username === 'driver1' ? 'var(--bg-surface-raised, #1f2737)' : 'transparent',
                border: '1px solid',
                borderColor: username === 'driver1' ? 'var(--color-success, #10b981)' : 'var(--border-subtle, #242e3f)',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Truck size={12} style={{ color: 'var(--color-success, #10b981)' }} />
              <span>Driver 1</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            color: 'var(--color-danger, #ef4444)',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary, #94a3b8)',
              marginBottom: '4px'
            }}>
              Operator Username
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted, #64748b)'
              }}>
                <User size={14} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or driver1"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  backgroundColor: 'var(--bg-canvas, #0f141c)',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary, #94a3b8)',
              marginBottom: '4px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted, #64748b)'
              }}>
                <Lock size={14} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  backgroundColor: 'var(--bg-canvas, #0f141c)',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              background: 'var(--color-primary, #2563eb)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Operations Console'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Customer Delivery Tracking Section */}
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: 'var(--bg-canvas, #0f141c)',
          border: '1px solid var(--border-subtle, #242e3f)',
          borderRadius: '4px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--text-muted, #64748b)',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <KeyRound size={12} />
            <span>End-customer consignment tracking</span>
          </div>
          <form onSubmit={handleTrackSubmit} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={customerTokenInput}
              onChange={(e) => setCustomerTokenInput(e.target.value)}
              placeholder="Paste delivery token..."
              style={{
                flex: 1,
                padding: '6px 10px',
                backgroundColor: 'var(--bg-surface, #171d28)',
                border: '1px solid var(--border-subtle, #242e3f)',
                borderRadius: '3px',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)'
              }}
            />
            <button
              type="submit"
              disabled={!customerTokenInput.trim()}
              style={{
                padding: '6px 12px',
                background: customerTokenInput.trim() ? 'var(--color-info, #0284c7)' : 'var(--border-strong, #334158)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '3px',
                cursor: customerTokenInput.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap'
              }}
            >
              Track ➔
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '10px',
          color: 'var(--text-muted, #64748b)'
        }}>
          Role-isolated dispatch: Administrators control full fleet; Drivers see assigned routes.
        </div>
      </div>
    </div>
  );
}
