import React, { useState, useRef, useEffect } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, X, ShieldCheck, Activity } from 'lucide-react';
import { verifyDeliveryOTP } from '../services/api';

/* ─────────────────────────────────────────────────────────────────
   OTPVerifyModal — Embedded in DriverDashboard stop cards.
   Driver enters the customer's 6-digit OTP to verify delivery.
   Backend is sole authority — no client-side OTP logic.
───────────────────────────────────────────────────────────────────── */

export default function OTPVerifyModal({ stop, driverId, driverGps, onSuccess, onCancel }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 80);
  }, []);

  const otp = digits.join('');

  const handleDigit = (idx, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = v;
    setDigits(newDigits);
    setError(null);

    if (v && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
      setFocusIdx(idx + 1);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const newDigits = [...digits];
      newDigits[idx - 1] = '';
      setDigits(newDigits);
      inputRefs.current[idx - 1]?.focus();
      setFocusIdx(idx - 1);
    } else if (e.key === 'Enter' && otp.length === 6) {
      handleSubmit();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      setError(null);
      inputRefs.current[5]?.focus();
      setFocusIdx(5);
    }
    e.preventDefault();
  };

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await verifyDeliveryOTP(stop.id, otp, driverId, driverGps);
      setSuccess(true);
      setTimeout(() => onSuccess(res.data), 1000);
    } catch (e) {
      setError(e.response?.data?.detail || 'OTP verification failed. Please check the code with customer.');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
        setFocusIdx(0);
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 12, 0.75)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        padding: '16px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div style={{
        background: 'var(--bg-surface-raised, #1f2737)',
        border: '1px solid var(--border-strong, #334158)',
        borderRadius: '6px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            background: 'var(--color-primary-subtle, rgba(37, 99, 235, 0.12))',
            color: 'var(--color-primary, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <KeyRound size={15} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
              Delivery OTP Handshake
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
              Recipient: <strong style={{ color: 'var(--text-secondary, #94a3b8)' }}>{stop?.name || 'Customer'}</strong>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-canvas, #0f141c)',
          border: '1px solid var(--border-subtle, #242e3f)',
          borderRadius: '4px',
          padding: '8px 10px',
          fontSize: '11px',
          color: 'var(--text-muted, #64748b)',
          marginBottom: '16px',
          lineHeight: 1.4
        }}>
          Ask customer for the 6-digit OTP visible on their live QPath Tracking screen.
        </div>

        {/* OTP Digit Inputs */}
        {!success && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                style={{
                  width: '44px',
                  height: '48px',
                  background: 'var(--bg-canvas, #0f141c)',
                  border: `1.5px solid ${error ? 'var(--color-danger, #ef4444)' : focusIdx === i ? 'var(--color-primary, #2563eb)' : d ? 'var(--color-success, #10b981)' : 'var(--border-subtle, #242e3f)'}`,
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontSize: '22px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary, #f8fafc)',
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onFocus={() => setFocusIdx(i)}
                disabled={loading || success}
              />
            ))}
          </div>
        )}

        {/* Feedback Messages */}
        {error && (
          <div style={{
            background: 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            padding: '8px 10px',
            fontSize: '11px',
            color: 'var(--color-danger, #ef4444)',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            background: 'var(--color-success-subtle, rgba(16, 185, 129, 0.12))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '4px',
            padding: '12px',
            textAlign: 'center',
            marginBottom: '14px'
          }}>
            <CheckCircle2 size={24} style={{ color: 'var(--color-success, #10b981)', margin: '0 auto 4px auto' }} />
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-success, #10b981)' }}>OTP Verified</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Delivery registered successfully.</div>
          </div>
        )}

        {/* Actions */}
        {!success && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle, #242e3f)',
                background: 'transparent',
                color: 'var(--text-secondary, #94a3b8)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || otp.length < 6}
              style={{
                flex: 1.5,
                padding: '8px 12px',
                borderRadius: '4px',
                border: 'none',
                background: 'var(--color-primary, #2563eb)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer',
                opacity: otp.length < 6 ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
            >
              <ShieldCheck size={14} />
              <span>{loading ? 'Verifying...' : 'Verify OTP'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
