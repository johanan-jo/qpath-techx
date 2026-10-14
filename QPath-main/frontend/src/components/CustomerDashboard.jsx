import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package, Truck, Navigation, KeyRound, CheckCircle2,
  AlertTriangle, Building2, Clock, RotateCcw, ShieldCheck,
  Check, X, Activity, ArrowRight, Shield
} from 'lucide-react';
import { getCustomerDeliveryStatus, customerRegenerateOTP } from '../services/api';

/* ─────────────────────────────────────────────────────────────────
   CustomerDashboard — accessed via token in URL query string
   e.g. http://localhost:3000?customer=YOUR_TOKEN
   Customers see only their own delivery info.
───────────────────────────────────────────────────────────────────── */

const STEPS = [
  { id: 1, icon: Package, label: 'Order Confirmed' },
  { id: 2, icon: Truck, label: 'Out for Delivery' },
  { id: 3, icon: Navigation, label: 'Driver Approaching' },
  { id: 4, icon: KeyRound, label: 'OTP Verification' },
  { id: 5, icon: CheckCircle2, label: 'Delivered' },
];

const STATUS_STEP_MAP = {
  'Pending': 1,
  'In Progress': 2,
  'Delivering': 2,
  'Delivered': 5,
  'Failed': 4,
  'Returned to Hub & Checked In': 4,
};

const S = {
  outer: {
    minHeight: '100vh',
    background: 'var(--bg-canvas, #0f141c)',
    fontFamily: 'var(--font-sans)',
    color: 'var(--text-primary, #f8fafc)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 0 48px 0',
  },
  header: {
    width: '100%',
    background: 'var(--bg-surface, #171d28)',
    borderBottom: '1px solid var(--border-subtle, #242e3f)',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '28px',
  },
  card: {
    background: 'var(--bg-surface, #171d28)',
    border: '1px solid var(--border-subtle, #242e3f)',
    borderRadius: '6px',
    padding: '20px 24px',
    width: '100%',
    maxWidth: '540px',
    marginBottom: '14px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted, #64748b)',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  otpBox: {
    background: 'var(--bg-canvas, #0f141c)',
    border: '1px solid var(--border-strong, #334158)',
    borderRadius: '6px',
    padding: '18px',
    textAlign: 'center',
    marginBottom: '14px',
  },
  otpLabel: { fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '8px' },
  otpCode: {
    fontSize: '36px',
    fontWeight: 700,
    letterSpacing: '8px',
    color: '#60a5fa',
    fontFamily: 'var(--font-mono)',
  },
  otpExpiry: { fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '8px', fontFamily: 'var(--font-mono)' },
  stepRow: { display: 'flex', alignItems: 'flex-start', gap: '0' },
  stepDot: (active, done) => ({
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: done ? 'var(--color-success, #10b981)' : active ? 'var(--color-primary, #2563eb)' : 'var(--bg-surface-raised, #1f2737)',
    border: `1px solid ${done ? 'var(--color-success, #10b981)' : active ? 'var(--color-primary, #2563eb)' : 'var(--border-subtle, #242e3f)'}`,
    color: done || active ? '#ffffff' : 'var(--text-muted, #64748b)',
    transition: 'all 0.2s ease',
  }),
  stepLine: (done) => ({
    width: '2px',
    flex: 1,
    minHeight: '24px',
    margin: '3px 0',
    background: done ? 'var(--color-success, #10b981)' : 'var(--border-subtle, #242e3f)',
    marginLeft: '13px',
    transition: 'background 0.2s ease',
  }),
  stepLabel: (active, done) => ({
    fontSize: '12px',
    fontWeight: active ? 600 : 500,
    color: done ? 'var(--color-success, #10b981)' : active ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #64748b)',
  }),
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-subtle, #242e3f)',
  },
  infoLabel: { fontSize: '12px', color: 'var(--text-muted, #64748b)' },
  infoValue: { fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', textAlign: 'right', maxWidth: '65%' },
  btn: (color) => ({
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    background: color || 'var(--color-primary, #2563eb)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  }),
  errorBox: {
    background: 'var(--bg-surface, #171d28)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '6px',
    padding: '24px',
    textAlign: 'center',
    maxWidth: '420px',
    margin: '0 auto',
  },
};

function StatusPill({ status }) {
  const colors = {
    'Delivered': 'var(--color-success, #10b981)',
    'Pending': 'var(--color-warning, #f59e0b)',
    'In Progress': 'var(--color-primary, #2563eb)',
    'Delivering': 'var(--color-info, #0284c7)',
    'Failed': 'var(--color-danger, #ef4444)',
    'Returned to Hub & Checked In': '#8b5cf6',
    'Verified': 'var(--color-success, #10b981)',
    'Active': 'var(--color-primary, #2563eb)',
    'Expired': 'var(--color-danger, #ef4444)',
  };
  const color = colors[status] || 'var(--text-muted, #64748b)';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '3px',
      fontSize: '10px',
      fontWeight: 500,
      background: 'var(--bg-canvas, #0f141c)',
      color: color,
      border: `1px solid ${color}40`
    }}>
      {status}
    </span>
  );
}

function ProgressStepper({ currentStep, failed }) {
  const steps = failed
    ? [...STEPS.slice(0, 3), { id: 4, icon: AlertTriangle, label: 'Delivery exception' }, STEPS[4]]
    : STEPS;

  return (
    <div>
      {steps.map((step, idx) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        const isLast = idx === steps.length - 1;
        const StepIcon = step.icon;

        return (
          <div key={step.id}>
            <div style={S.stepRow}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '14px' }}>
                <div style={S.stepDot(active, done)}>
                  {done ? <Check size={14} /> : <StepIcon size={14} />}
                </div>
                {!isLast && <div style={S.stepLine(done)} />}
              </div>
              <div style={{ paddingTop: '4px', paddingBottom: isLast ? 0 : '20px' }}>
                <div style={S.stepLabel(active, done)}>{step.label}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LivePulse() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11px',
      color: 'var(--color-success, #10b981)',
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: 'var(--color-success, #10b981)',
        display: 'inline-block',
      }} />
      Live
    </span>
  );
}

function CountdownTimer({ generatedAt, expiresIn }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!expiresIn) return;
    const startTime = Date.now();
    const totalMs = expiresIn * 60 * 1000;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, totalMs - elapsed);
      setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresIn]);

  if (remaining === null) return null;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0;
  return (
    <span style={{ color: expired ? 'var(--color-danger, #ef4444)' : 'var(--text-muted, #64748b)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
      {expired ? 'OTP expired' : `Expires in ${mins}m ${secs}s`}
    </span>
  );
}

export default function CustomerDashboard({ token, onExit }) {
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenMsg, setRegenMsg] = useState(null);
  const [newOTP, setNewOTP] = useState(null);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getCustomerDeliveryStatus(token);
      setDelivery(res.data);
      setError(null);
    } catch (e) {
      if (loading) {
        setError(e.response?.data?.detail || 'Invalid delivery token or delivery record not found.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, loading]);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 6000);
    return () => clearInterval(pollRef.current);
  }, [fetchStatus]);

  const handleRegenOTP = async () => {
    setRegenLoading(true);
    setRegenMsg(null);
    try {
      const res = await customerRegenerateOTP(token);
      setNewOTP(res.data.otp);
      setRegenMsg({ type: 'success', text: 'New OTP issued. Share with your delivery operator upon arrival.' });
      fetchStatus();
    } catch (e) {
      setRegenMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to generate new OTP.' });
    } finally {
      setRegenLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={S.outer}>
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '4px',
              background: 'var(--color-primary, #2563eb)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px'
            }}>
              Q
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>QPath</span>
            <span style={{
              fontSize: '10px', fontWeight: 500,
              padding: '1px 5px', borderRadius: '3px', background: 'var(--border-strong, #334158)',
              color: 'var(--text-secondary, #94a3b8)'
            }}>
              Consignment tracking
            </span>
          </div>
          {onExit && (
            <button
              onClick={onExit}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle, #242e3f)',
                color: 'var(--text-secondary, #94a3b8)',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Exit
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '64px 0' }}>
          <Activity size={24} className="animate-spin" style={{ color: 'var(--color-primary, #2563eb)' }} />
          <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '12px' }}>Locating delivery consignment…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.outer}>
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '4px',
              background: 'var(--color-primary, #2563eb)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px'
            }}>
              Q
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>QPath</span>
            <span style={{
              fontSize: '9px', fontWeight: 600,
              padding: '1px 5px', borderRadius: '3px', background: 'var(--border-strong, #334158)',
              color: 'var(--text-secondary, #94a3b8)'
            }}>
              Consignment tracking
            </span>
          </div>
          {onExit && (
            <button
              onClick={onExit}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle, #242e3f)',
                color: 'var(--text-secondary, #94a3b8)',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Back to Portal
            </button>
          )}
        </div>
        <div style={{ padding: '64px 24px' }}>
          <div style={S.errorBox}>
            <AlertTriangle size={32} style={{ color: 'var(--color-danger, #ef4444)', margin: '0 auto 10px auto', display: 'block' }} />
            <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '6px', color: 'var(--color-danger, #ef4444)' }}>
              Consignment Not Located
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>{error}</div>
            {onExit && (
              <button
                onClick={onExit}
                style={{
                  marginTop: '16px',
                  background: 'var(--color-primary, #2563eb)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '4px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Return to Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!delivery) return null;

  const isFailed = delivery.status === 'Failed' || delivery.status === 'Returned to Hub & Checked In';
  const isDelivered = delivery.status === 'Delivered';
  const currentStep = STATUS_STEP_MAP[delivery.status] || 2;
  const otpToDisplay = newOTP || delivery.otp_display;
  const otpExpired = delivery.otp_status === 'Expired';
  const otpVerified = delivery.otp_status === 'Verified';

  return (
    <div style={S.outer}>
      {/* Top Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '4px',
            background: 'var(--color-primary, #2563eb)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '13px'
          }}>
            Q
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>QPath</span>
          <span style={{
            fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono)',
            padding: '1px 5px', borderRadius: '3px', background: 'var(--border-strong, #334158)',
            color: 'var(--text-secondary, #94a3b8)'
          }}>
            Consignment tracking
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LivePulse />
          {onExit && (
            <button
              onClick={onExit}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle, #242e3f)',
                color: 'var(--text-secondary, #94a3b8)',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Exit
            </button>
          )}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '540px', padding: '0 16px' }}>

        {/* ── Status Banner Card ── */}
        <div style={{
          ...S.card,
          textAlign: 'center',
          borderColor: isDelivered ? 'var(--color-success, #10b981)' : isFailed ? 'var(--color-danger, #ef4444)' : 'var(--border-strong, #334158)'
        }}>
          <div style={{ marginBottom: '8px' }}>
            {isDelivered ? (
              <CheckCircle2 size={36} style={{ color: 'var(--color-success, #10b981)', margin: '0 auto' }} />
            ) : isFailed ? (
              <AlertTriangle size={36} style={{ color: 'var(--color-danger, #ef4444)', margin: '0 auto' }} />
            ) : (
              <Package size={36} style={{ color: 'var(--color-primary, #2563eb)', margin: '0 auto' }} />
            )}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '2px', color: 'var(--text-primary, #f8fafc)' }}>
            {isDelivered ? 'Consignment Delivered' : isFailed ? 'Delivery Exception Logged' : 'Consignment En Route'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginBottom: '10px' }}>
            Customer: {delivery.customer_name} · Consignment #{delivery.delivery_id}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <StatusPill status={delivery.status} />
          </div>
        </div>

        {/* ── OTP Verification Box (When not delivered) ── */}
        {!isDelivered && (
          <div style={S.card}>
            <div style={S.sectionTitle}>
              <KeyRound size={13} />
              <span>Delivery OTP verification</span>
            </div>

            {otpVerified ? (
              <div style={{ ...S.otpBox, borderColor: 'var(--color-success, #10b981)' }}>
                <CheckCircle2 size={24} style={{ color: 'var(--color-success, #10b981)', margin: '0 auto 6px auto' }} />
                <div style={{ fontWeight: 600, color: 'var(--color-success, #10b981)', fontSize: '14px' }}>OTP Handshake Verified</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                  Delivery receipt confirmed by recipient.
                </div>
              </div>
            ) : otpToDisplay && !otpExpired ? (
              <div style={S.otpBox}>
                <div style={S.otpLabel}>Provide this 6-digit verification code to the delivery driver:</div>
                <div style={S.otpCode}>{otpToDisplay}</div>
                <div style={S.otpExpiry}>
                  <CountdownTimer expiresIn={delivery.otp_status === 'Active' ? 30 : 0} />
                </div>
              </div>
            ) : (
              <div style={{ ...S.otpBox, borderColor: 'var(--color-danger, #ef4444)' }}>
                <Clock size={20} style={{ color: 'var(--color-danger, #ef4444)', margin: '0 auto 6px auto' }} />
                <div style={{ fontWeight: 600, color: 'var(--color-danger, #ef4444)', fontSize: '13px', marginBottom: '2px' }}>
                  {otpExpired ? 'OTP Expired' : 'Awaiting OTP Generation'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginBottom: '10px' }}>
                  {otpExpired ? 'The previous token has expired. Generate a fresh code below.' : 'A code will be generated upon dispatch.'}
                </div>
                {otpExpired && (
                  <button
                    style={S.btn('var(--color-primary, #2563eb)')}
                    onClick={handleRegenOTP}
                    disabled={regenLoading}
                  >
                    {regenLoading ? 'Generating...' : 'Request New OTP'}
                  </button>
                )}
              </div>
            )}

            {regenMsg && (
              <div style={{
                marginTop: '8px',
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                background: regenMsg.type === 'success' ? 'var(--color-success-subtle, rgba(16, 185, 129, 0.12))' : 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
                color: regenMsg.type === 'success' ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)',
                border: `1px solid ${regenMsg.type === 'success' ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)'}40`
              }}>
                {regenMsg.text}
              </div>
            )}
          </div>
        )}

        {/* ── Tracking Progress Stepper ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            <Navigation size={13} />
            <span>Progress timeline</span>
          </div>
          <ProgressStepper currentStep={currentStep} failed={isFailed} />
        </div>

        {/* ── Delivery Details ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            <Building2 size={13} />
            <span>Consignment details</span>
          </div>

          {[
            { label: 'Destination Address', value: delivery.destination?.name || '—' },
            { label: 'Assigned Driver', value: delivery.driver_name || 'Dispatching operator…' },
            { label: 'Driver Status', value: delivery.driver_status || '—' },
            {
              label: 'Waypoints Remaining Ahead',
              value: isDelivered ? '0' : `${delivery.stops_before} stop${delivery.stops_before !== 1 ? 's' : ''}`
            },
            {
              label: 'Estimated Arrival',
              value: isDelivered
                ? `Delivered (${delivery.delivered_at || 'Completed'})`
                : `~${delivery.eta_minutes} min`
            },
            { label: 'Security Handshake', value: <StatusPill status={delivery.otp_status || '—'} /> },
          ].map(({ label, value }) => (
            <div key={label} style={S.infoRow}>
              <span style={S.infoLabel}>{label}</span>
              <span style={S.infoValue}>{value}</span>
            </div>
          ))}

          {isFailed && delivery.failed_reason && (
            <div style={{
              marginTop: '10px',
              padding: '8px 10px',
              borderRadius: '4px',
              background: 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
              border: '1px solid rgba(239,68,68,0.3)',
              fontSize: '11px',
              color: 'var(--color-danger, #ef4444)'
            }}>
              <strong>Exception Reason:</strong> {delivery.failed_reason}
            </div>
          )}
        </div>

        {/* ── Origin Hub ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            <Building2 size={13} />
            <span>Dispatch origin</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
            {delivery.depot?.name || 'Central Logistics Hub, New Delhi'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            Consignment dispatched from central facility
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted, #64748b)', padding: '12px 0' }}>
          QPath fleet dispatch · Refresh 6s · ID: {delivery.delivery_id}
        </div>
      </div>
    </div>
  );
}
