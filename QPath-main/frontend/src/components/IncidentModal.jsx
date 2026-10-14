import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, X, ShieldAlert, Activity, ArrowRight } from 'lucide-react';

export default function IncidentModal({
  isOpen,
  onClose,
  deliveryPoints = [],
  onApplyIncident,
  onResetIncident,
  activeModifiers = {},
  loading = false
}) {
  const [fromStopIdx, setFromStopIdx] = useState(1);
  const [toStopIdx, setToStopIdx] = useState(2);
  const [severity, setSeverity] = useState(0.95);
  const [incidentType, setIncidentType] = useState('Severe Road Blockage / Emergency');

  if (!isOpen) return null;

  const hasActiveIncidents = Object.keys(activeModifiers).length > 0;

  const handleApply = (e) => {
    e.preventDefault();
    if (fromStopIdx === toStopIdx) {
      alert('Source and destination stops must be different.');
      return;
    }
    const corridorKey1 = `${fromStopIdx}->${toStopIdx}`;
    const corridorKey2 = `${toStopIdx}->${fromStopIdx}`;
    const updatedModifiers = {
      ...activeModifiers,
      [corridorKey1]: severity,
      [corridorKey2]: severity
    };
    onApplyIncident(updatedModifiers, {
      fromLabel: `D${fromStopIdx}`,
      toLabel: `D${toStopIdx}`,
      severity,
      incidentType
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 7, 12, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 9900,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-surface-raised, #1f2737)',
        border: '1px solid var(--border-strong, #334158)',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle, #242e3f)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface, #171d28)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--color-danger, #ef4444)'
            }}>
              <ShieldAlert size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>
                Traffic Incident & Corridor Shock Simulation
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                Inject localized congestion impedance to test real-time QPSO re-optimization
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleApply} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Simulation disclaimer */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '6px',
            padding: '10px 12px',
            fontSize: '11px',
            color: 'var(--color-warning, #f59e0b)',
            lineHeight: 1.4,
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start'
          }}>
            <Activity size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Simulated Evaluation:</strong> This feature injects dynamic edge penalties into the VRP network graph to simulate sudden road closures or bottlenecks. It does not overwrite genuine live sensor telemetry.
            </div>
          </div>

          {/* Corridor Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                Incident Corridor From:
              </label>
              <select
                value={fromStopIdx}
                onChange={(e) => setFromStopIdx(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--bg-canvas, #0f141c)',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12px'
                }}
              >
                {deliveryPoints.map((pt, i) => (
                  <option key={i} value={i + 1}>
                    Stop D{i + 1} ({pt.name?.slice(0, 24) || `Stop ${i + 1}`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                Corridor To:
              </label>
              <select
                value={toStopIdx}
                onChange={(e) => setToStopIdx(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--bg-canvas, #0f141c)',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12px'
                }}
              >
                {deliveryPoints.map((pt, i) => (
                  <option key={i} value={i + 1}>
                    Stop D{i + 1} ({pt.name?.slice(0, 24) || `Stop ${i + 1}`})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Incident Type & Severity */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
              Incident Scenario / Cause:
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'var(--bg-canvas, #0f141c)',
                border: '1px solid var(--border-subtle, #242e3f)',
                borderRadius: '4px',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '12px'
              }}
            >
              <option value="Severe Road Blockage / Emergency">Severe Road Blockage / Emergency (Near 100% Impedance)</option>
              <option value="Major Multi-Lane Accident">Major Multi-Lane Collision (80% Congestion Delay)</option>
              <option value="Unplanned Utility Road Work">Unplanned Utility Work (65% Congestion Delay)</option>
              <option value="Adverse Monsoon Waterlogging">Flash Waterlogging / Urban Flooding (90% Congestion Delay)</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Impedance Shock Factor:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger, #ef4444)', fontWeight: 600 }}>
                {(severity * 100).toFixed(0)}% Delay Penalty
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={severity}
              onChange={(e) => setSeverity(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Active Incidents Overview */}
          {hasActiveIncidents && (
            <div style={{
              background: 'var(--bg-canvas, #0f141c)',
              border: '1px solid var(--border-subtle, #242e3f)',
              borderRadius: '4px',
              padding: '8px 12px',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                Active Incident Modifiers: <strong style={{ color: 'var(--color-danger, #ef4444)' }}>{Object.keys(activeModifiers).length / 2} corridors</strong>
              </span>
              <button
                type="button"
                onClick={onResetIncident}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-info, #0284c7)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={12} /> Reset to Normal
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '9px 14px',
                background: 'transparent',
                border: '1px solid var(--border-subtle, #242e3f)',
                borderRadius: '4px',
                color: 'var(--text-secondary, #94a3b8)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || deliveryPoints.length < 2}
              style={{
                flex: 2,
                padding: '9px 14px',
                background: 'var(--color-danger, #ef4444)',
                border: 'none',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ArrowRight size={14} />
              {loading ? 'Re-optimizing Swarm...' : 'Apply Shock & Re-optimize'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
