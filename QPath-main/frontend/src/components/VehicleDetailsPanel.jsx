import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SlidersHorizontal, Truck, BarChart3, Package, CheckCircle2,
  AlertTriangle, Copy, ExternalLink, ChevronRight, ChevronDown,
  RefreshCw, Check, ArrowRight, X, Clock, MapPin
} from 'lucide-react';
import { verifyReturnAtHub, getAdminOTPVerificationTable } from '../services/api';
import { VEHICLE_PALETTE } from './MapView';

export default function VehicleDetailsPanel({
  vehicleRoutes = [],
  activeVehicleId,
  onSelectVehicle,
  params,
  setParams,
  onOpenDeliveryModal,
  onOptimize,
  onOpenIncidentModal,
  loading,
  comparison = [],
  onSwitchPage,
  liveDrivers = [],
  availableJobsCount = 0,
  pendingVerifications = [],
  onRefreshFleetLive,
  deliveryPoints = [],
  depot,
  lastOptimizedTime
}) {
  // Primary operational tabs: 'plan' | 'dispatch' | 'analyze'
  const [activeTab, setActiveTab] = useState('plan');

  // Admin verification state for driver returns
  const [verifyingJobId, setVerifyingJobId] = useState(null);
  const [verifySuccess, setVerifySuccess] = useState({});

  // OTP Verification Table state
  const [otpRows, setOtpRows] = useState([]);
  const [copiedToken, setCopiedToken] = useState(null);

  // Track run timestamp locally if not passed
  const [runTimestamp, setRunTimestamp] = useState(null);

  const fetchOtpRows = useCallback(async () => {
    try {
      const res = await getAdminOTPVerificationTable();
      if (res.data?.success) {
        setOtpRows(res.data.rows || []);
      }
    } catch (err) {
      console.warn('Failed to fetch OTP table:', err);
    }
  }, []);

  useEffect(() => {
    fetchOtpRows();
    const interval = setInterval(fetchOtpRows, 5000);
    return () => clearInterval(interval);
  }, [fetchOtpRows]);

  // When vehicle routes arrive, record timestamp and switch to analyze tab if on plan
  useEffect(() => {
    if (vehicleRoutes && vehicleRoutes.length > 0) {
      const now = new Date();
      setRunTimestamp(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [vehicleRoutes]);

  const handleVerifyReturn = async (jobId) => {
    setVerifyingJobId(jobId);
    try {
      const res = await verifyReturnAtHub(jobId);
      if (res.data.success) {
        setVerifySuccess(prev => ({ ...prev, [jobId]: true }));
        onRefreshFleetLive?.();
        fetchOtpRows();
        setTimeout(() => setVerifySuccess(prev => { const n = { ...prev }; delete n[jobId]; return n; }), 4000);
      }
    } catch (err) {
      console.error('Error verifying hub return:', err);
    } finally {
      setVerifyingJobId(null);
    }
  };

  // Fleet aggregate calculations from real state
  const fleetTotals = useMemo(() => {
    if (!vehicleRoutes || vehicleRoutes.length === 0) return null;
    let distance = 0;
    let time = 0;
    let cost = 0;
    let congestionSum = 0;
    let activeVehiclesCount = 0;

    vehicleRoutes.forEach(v => {
      distance += (v.total_distance_km || 0);
      time = Math.max(time, v.total_time_min || 0); // Concurrent fleet completion
      cost += (v.total_op_cost_inr || 0);
      if (v.assigned_stops && v.assigned_stops.length > 0) {
        activeVehiclesCount++;
        congestionSum += (v.average_congestion_pct || 0);
      }
    });

    const avgCongestion = activeVehiclesCount > 0 ? (congestionSum / activeVehiclesCount) : 0;
    return {
      distance: Number(distance.toFixed(2)),
      time: Number(time.toFixed(1)),
      cost: Number(cost.toFixed(0)),
      avgCongestion: Number(avgCongestion.toFixed(1)),
      activeCount: activeVehiclesCount
    };
  }, [vehicleRoutes]);

  // Real before-and-after benchmark comparison from actual algorithm comparison data
  const comparisonBenchmark = useMemo(() => {
    if (!comparison || comparison.length < 2) return null;
    const qpso = comparison.find(c => c.algorithm?.toLowerCase().includes('qpso'));
    const baseline = comparison.find(c => c.algorithm?.toLowerCase().includes('dijkstra')) || comparison[0];

    if (!qpso || !baseline || qpso === baseline) return null;
    if (baseline.total_travel_time <= 0 || baseline.total_op_cost <= 0) return null;

    const timeDiff = ((baseline.total_travel_time - qpso.total_travel_time) / baseline.total_travel_time) * 100;
    const distDiff = ((baseline.total_distance - qpso.total_distance) / baseline.total_distance) * 100;
    const costDiff = ((baseline.total_op_cost - qpso.total_op_cost) / baseline.total_op_cost) * 100;

    return {
      baselineName: baseline.algorithm || 'Baseline',
      baselineTime: baseline.total_travel_time,
      qpsoTime: qpso.total_travel_time,
      baselineDistance: baseline.total_distance,
      qpsoDistance: qpso.total_distance,
      baselineCost: baseline.total_op_cost,
      qpsoCost: qpso.total_op_cost,
      timeSavingsPct: timeDiff.toFixed(1),
      distSavingsPct: distDiff.toFixed(1),
      costSavingsPct: costDiff.toFixed(1)
    };
  }, [comparison]);

  const handleCopyToken = (token) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-surface, #171d28)',
      color: 'var(--text-primary, #f8fafc)',
      borderRight: '1px solid var(--border-subtle, #242e3f)',
      overflow: 'hidden'
    }}>

      {/* ── WORKSPACE PRIMARY TABS: Plan, Dispatch, Analyze ─────────── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle, #242e3f)',
        background: 'var(--bg-canvas, #0f141c)',
        padding: '3px',
        gap: '3px',
        flexShrink: 0
      }}>
        {[
          { id: 'plan', label: 'Plan', icon: SlidersHorizontal },
          {
            id: 'dispatch',
            label: 'Dispatch',
            icon: Truck,
            badge: pendingVerifications?.length ? `${pendingVerifications.length}` : null,
            badgeVariant: 'warning'
          },
          {
            id: 'analyze',
            label: 'Analyze',
            icon: BarChart3,
            badge: vehicleRoutes?.length ? `${vehicleRoutes.length}` : null
          },
        ].map(({ id, label, icon: Icon, badge, badgeVariant }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 4px',
                background: isActive ? 'var(--bg-surface, #171d28)' : 'transparent',
                border: 'none',
                borderRadius: '3px',
                color: isActive ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #64748b)',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={13} />
              <span>{label}</span>
              {badge && (
                <span style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  background: badgeVariant === 'warning' ? 'var(--color-warning, #f59e0b)' : 'var(--border-strong, #334158)',
                  color: badgeVariant === 'warning' ? '#000' : 'var(--text-primary, #f8fafc)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  lineHeight: 1
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB SCROLL CONTENT ────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>

        {/* ════════════════════════════════════════════════════════════
            TAB 1: PLAN (Route Planning Workflow)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'plan' && (
          <>
            {/* Section: Delivery Stops & Depot Summary */}
            <div style={{
              background: 'var(--bg-surface-raised, #1f2737)',
              border: '1px solid var(--border-subtle, #242e3f)',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                  Delivery stops
                </span>
                <button
                  onClick={onOpenDeliveryModal}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-strong, #334158)',
                    borderRadius: '3px',
                    color: 'var(--text-primary, #f8fafc)',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Manage stops</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '6px 8px', borderRadius: '3px', border: '1px solid var(--border-subtle, #242e3f)' }}>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '10px', display: 'block' }}>Configured stops</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>{deliveryPoints.length}</strong>
                </div>
                <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '6px 8px', borderRadius: '3px', border: '1px solid var(--border-subtle, #242e3f)' }}>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '10px', display: 'block' }}>Total demand</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>
                    {deliveryPoints.reduce((acc, p) => acc + (p.demand || 0), 0).toFixed(0)} kg
                  </strong>
                </div>
              </div>

              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                Hub: <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>{depot?.name || 'Connaught Place Hub'}</span>
              </div>
            </div>

            {/* Section: Fleet Sizing & Vehicle Capacity */}
            <div style={{
              background: 'var(--bg-surface-raised, #1f2737)',
              border: '1px solid var(--border-subtle, #242e3f)',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '8px' }}>
                Fleet capacity and sizing
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--text-muted, #64748b)' }}>Active vehicles:</span>
                    <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>
                      {params.numVehicles} {params.numVehicles === 1 ? 'vehicle' : 'vehicles'}
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={params.numVehicles}
                    onChange={(e) => setParams(p => ({ ...p, numVehicles: parseInt(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--text-muted, #64748b)' }}>Payload capacity per vehicle:</span>
                    <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>
                      {params.vehicleCapacity} kg
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="10"
                    value={params.vehicleCapacity}
                    onChange={(e) => setParams(p => ({ ...p, vehicleCapacity: parseFloat(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Section: Objective Function Weights */}
            <div style={{
              background: 'var(--bg-surface-raised, #1f2737)',
              border: '1px solid var(--border-subtle, #242e3f)',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                  Objective weights
                </span>
                <button
                  type="button"
                  onClick={() => setParams(p => ({ ...p, weights: { w1: 0.35, w2: 0.25, w3: 0.25, w4: 0.15 } }))}
                  style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                >
                  Reset defaults
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { key: 'w1', label: 'Travel time (w₁)', val: params.weights.w1 },
                  { key: 'w2', label: 'Distance (w₂)', val: params.weights.w2 },
                  { key: 'w3', label: 'Congestion (w₃)', val: params.weights.w3 },
                  { key: 'w4', label: 'Operating cost (w₄)', val: params.weights.w4 },
                ].map(({ key, label, val }) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: 'var(--text-muted, #64748b)' }}>{label}</span>
                      <span style={{ fontWeight: 500 }}>{val}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={val}
                      onChange={(e) => {
                        const newV = parseFloat(e.target.value);
                        setParams(p => ({
                          ...p,
                          weights: { ...p.weights, [key]: newV }
                        }));
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Swarm Parameters */}
            <div style={{
              background: 'var(--bg-surface-raised, #1f2737)',
              border: '1px solid var(--border-subtle, #242e3f)',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '8px' }}>
                Swarm algorithm settings
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '3px' }}>Swarm particles</span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={params.numParticles}
                    onChange={(e) => setParams(p => ({ ...p, numParticles: parseInt(e.target.value) || 30 }))}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      background: 'var(--bg-canvas, #0f141c)',
                      border: '1px solid var(--border-subtle, #242e3f)',
                      borderRadius: '3px',
                      color: 'var(--text-primary, #f8fafc)',
                      fontSize: '11px'
                    }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '3px' }}>Maximum iterations</span>
                  <input
                    type="number"
                    min="20"
                    max="300"
                    value={params.maxIterations}
                    onChange={(e) => setParams(p => ({ ...p, maxIterations: parseInt(e.target.value) || 80 }))}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      background: 'var(--bg-canvas, #0f141c)',
                      border: '1px solid var(--border-subtle, #242e3f)',
                      borderRadius: '3px',
                      color: 'var(--text-primary, #f8fafc)',
                      fontSize: '11px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
              <button
                onClick={() => onOptimize('qpso')}
                disabled={loading || deliveryPoints.length === 0}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  background: loading ? 'var(--bg-surface-active, #273246)' : 'var(--color-primary, #2563eb)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: loading || deliveryPoints.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : null}
                <span>{loading ? 'Optimizing routes...' : 'Run QPSO optimization'}</span>
              </button>

              <button
                onClick={onOpenIncidentModal}
                disabled={loading || deliveryPoints.length < 2}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  background: 'transparent',
                  border: '1px solid var(--border-strong, #334158)',
                  borderRadius: '4px',
                  color: 'var(--text-secondary, #94a3b8)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: loading || deliveryPoints.length < 2 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <AlertTriangle size={12} style={{ color: 'var(--color-warning, #f59e0b)' }} />
                <span>Simulate traffic incident</span>
              </button>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 2: DISPATCH (Vehicle & Driver Execution)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'dispatch' && (
          <>
            {/* Dispatch Status Summary */}
            <div style={{
              background: 'var(--bg-surface-raised, #1f2737)',
              border: '1px solid var(--border-subtle, #242e3f)',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '8px' }}>
                Dispatch operations
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px' }}>
                <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '6px', borderRadius: '3px', border: '1px solid var(--border-subtle, #242e3f)' }}>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '10px', display: 'block' }}>Fleet units</span>
                  <strong style={{ fontSize: '12px' }}>{params.numVehicles}</strong>
                </div>
                <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '6px', borderRadius: '3px', border: '1px solid var(--border-subtle, #242e3f)' }}>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '10px', display: 'block' }}>Drivers online</span>
                  <strong style={{ fontSize: '12px' }}>{liveDrivers?.length || 0}</strong>
                </div>
                <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '6px', borderRadius: '3px', border: '1px solid var(--border-subtle, #242e3f)' }}>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '10px', display: 'block' }}>Pool jobs</span>
                  <strong style={{ fontSize: '12px' }}>{availableJobsCount}</strong>
                </div>
              </div>
            </div>

            {/* Deliverables Return Check-in Queue */}
            {pendingVerifications && pendingVerifications.length > 0 && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '4px',
                padding: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-warning, #f59e0b)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Package size={12} />
                    <span>Return verification queue</span>
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-warning, #f59e0b)' }}>
                    {pendingVerifications.length} awaiting check-in
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {pendingVerifications.map((entry) => (
                    <div key={entry.job_id} style={{
                      background: 'var(--bg-canvas, #0f141c)',
                      border: '1px solid var(--border-subtle, #242e3f)',
                      borderRadius: '3px',
                      padding: '6px 8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '11px' }}>{entry.driver_name}</strong>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', marginLeft: '4px' }}>({entry.vehicle})</span>
                        </div>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted, #64748b)' }}>{entry.job_id}</span>
                      </div>

                      {entry.undelivered_items && entry.undelivered_items.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#f87171', marginBottom: '4px' }}>
                          Returned parcels: {entry.undelivered_items.map(u => u.name || u.stop_id).join(', ')}
                        </div>
                      )}

                      {verifySuccess[entry.job_id] ? (
                        <div style={{ fontSize: '10px', color: 'var(--color-success, #10b981)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={11} /> Deliverables checked in successfully.
                        </div>
                      ) : (
                        <button
                          onClick={() => handleVerifyReturn(entry.job_id)}
                          disabled={verifyingJobId === entry.job_id}
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            background: 'var(--color-primary, #2563eb)',
                            border: 'none',
                            borderRadius: '3px',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: verifyingJobId === entry.job_id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {verifyingJobId === entry.job_id ? 'Checking in...' : 'Verify return and release driver'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vehicle Assignments and Stop Sequencing */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                  Vehicle assignments
                </span>
                {activeVehicleId && (
                  <button
                    onClick={() => onSelectVehicle(null)}
                    style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {(!vehicleRoutes || vehicleRoutes.length === 0) ? (
                <div style={{
                  background: 'var(--bg-surface-raised, #1f2737)',
                  border: '1px dashed var(--border-subtle, #242e3f)',
                  borderRadius: '4px',
                  padding: '16px',
                  textAlign: 'center',
                  color: 'var(--text-muted, #64748b)',
                  fontSize: '11px'
                }}>
                  No routes dispatched yet. Run optimization in Plan tab to generate route schedules.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {vehicleRoutes.map((vRoute, idx) => {
                    const palette = VEHICLE_PALETTE[idx % VEHICLE_PALETTE.length];
                    const isSelected = activeVehicleId === vRoute.vehicle_id;
                    const stopCount = vRoute.assigned_stops?.length || 0;
                    const isStandby = stopCount === 0;

                    // Find driver assigned to this vehicle
                    const assignedDriver = liveDrivers?.find(d =>
                      d.vehicle?.toLowerCase() === `vehicle ${vRoute.vehicle_id}`.toLowerCase() ||
                      d.vehicle?.toLowerCase() === `fleet unit ${vRoute.vehicle_id}`.toLowerCase() ||
                      d.vehicle === `Unit ${vRoute.vehicle_id}`
                    );

                    return (
                      <div
                        key={vRoute.vehicle_id || idx}
                        style={{
                          background: isSelected ? 'var(--bg-surface-active, #273246)' : 'var(--bg-surface-raised, #1f2737)',
                          border: `1px solid ${isSelected ? palette.border : 'var(--border-subtle, #242e3f)'}`,
                          borderRadius: '4px',
                          padding: '8px 10px',
                          cursor: 'pointer'
                        }}
                        onClick={() => onSelectVehicle(isSelected ? null : vRoute.vehicle_id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: palette.main }} />
                            <strong style={{ fontSize: '12px' }}>Unit {vRoute.vehicle_id}</strong>
                            {assignedDriver && (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                                · {assignedDriver.driver_name}
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 500,
                            color: isStandby ? 'var(--text-muted, #64748b)' : 'var(--color-success, #10b981)'
                          }}>
                            {isStandby ? 'Standby' : `${stopCount} stops`}
                          </span>
                        </div>

                        {/* Stop Sequence Pills */}
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary, #94a3b8)',
                          marginBottom: '6px',
                          whiteSpace: 'nowrap',
                          overflowX: 'auto',
                          paddingBottom: '2px'
                        }}>
                          {!isStandby ? (
                            <>
                              <span>Hub ➔ </span>
                              {vRoute.assigned_stops.map((st, sI) => (
                                <span key={sI} style={{ color: palette.text, fontWeight: 500 }}>
                                  {st} {sI < stopCount - 1 ? '➔ ' : ''}
                                </span>
                              ))}
                              <span> ➔ Hub</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted, #64748b)', fontStyle: 'italic' }}>
                              Parked at central hub
                            </span>
                          )}
                        </div>

                        {/* Metrics Bar */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '4px',
                          fontSize: '10px',
                          background: 'var(--bg-canvas, #0f141c)',
                          padding: '4px 6px',
                          borderRadius: '3px',
                          border: '1px solid var(--border-subtle, #242e3f)'
                        }}>
                          <div>
                            <span style={{ color: 'var(--text-muted, #64748b)', display: 'block' }}>Distance</span>
                            <span>{vRoute.total_distance_km || 0} km</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted, #64748b)', display: 'block' }}>Time</span>
                            <span>{vRoute.total_time_min || 0} min</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted, #64748b)', display: 'block' }}>Congestion</span>
                            <span>{vRoute.average_congestion_pct || 0}%</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted, #64748b)', display: 'block' }}>Cost</span>
                            <span>₹{vRoute.total_op_cost_inr?.toFixed(0) || 0}</span>
                          </div>
                        </div>

                        {/* Turn-by-Turn Leg Details (when selected) */}
                        {isSelected && vRoute.legs && vRoute.legs.length > 0 && (
                          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-subtle, #242e3f)', paddingTop: '6px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', fontWeight: 500, marginBottom: '4px' }}>
                              Turn-by-turn stop schedule
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {vRoute.legs.map((leg, lIdx) => (
                                <div
                                  key={lIdx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '10px',
                                    padding: '3px 6px',
                                    background: 'var(--bg-canvas, #0f141c)',
                                    borderRadius: '2px'
                                  }}
                                >
                                  <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                                    Leg {leg.leg_index}: {leg.to_name?.slice(0, 22)}
                                  </span>
                                  <span style={{ color: '#60a5fa' }}>ETA {leg.estimated_arrival_clock}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Delivery OTP Ledger (Sub-section in Dispatch) */}
            <div style={{ borderTop: '1px solid var(--border-subtle, #242e3f)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                  Customer verification ledger
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
                  {otpRows.filter(r => r.otp_status === 'Verified').length}/{otpRows.length} verified
                </span>
              </div>

              {otpRows && otpRows.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {otpRows.map((row, rIdx) => {
                    const isVerified = row.otp_status === 'Verified';
                    const isExpired = row.otp_status === 'Expired';
                    const statusColor = isVerified ? 'var(--color-success, #10b981)' : isExpired ? 'var(--color-danger, #ef4444)' : '#60a5fa';

                    return (
                      <div
                        key={row.delivery_id || rIdx}
                        style={{
                          background: 'var(--bg-surface-raised, #1f2737)',
                          border: '1px solid var(--border-subtle, #242e3f)',
                          borderRadius: '3px',
                          padding: '6px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500, fontSize: '11px' }}>
                            {row.stop_name || row.delivery_id}
                          </span>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 500,
                            color: statusColor,
                            padding: '1px 4px',
                            borderRadius: '2px',
                            background: 'var(--bg-canvas, #0f141c)',
                            border: `1px solid ${statusColor}30`
                          }}>
                            {row.otp_status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
                          <span>Customer: {row.customer_name}</span>
                          <span>Driver: {row.driver_name || 'Unassigned'}</span>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-canvas, #0f141c)',
                          padding: '2px 5px',
                          borderRadius: '2px',
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          border: '1px solid var(--border-subtle, #242e3f)'
                        }}>
                          <span style={{ color: '#60a5fa' }}>{row.customer_token || row.delivery_id}</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleCopyToken(row.customer_token || row.delivery_id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted, #64748b)',
                                fontSize: '10px',
                                cursor: 'pointer',
                                padding: 0
                              }}
                            >
                              {copiedToken === (row.customer_token || row.delivery_id) ? 'Copied' : 'Copy'}
                            </button>
                            <a
                              href={`http://localhost:3000?customer=${row.customer_token || row.delivery_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--color-primary, #2563eb)' }}
                              title="Open tracking page"
                            >
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', textAlign: 'center', padding: '10px' }}>
                  No customer tokens registered.
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 3: ANALYZE (Performance Metrics & Comparison)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'analyze' && (
          <>
            {(!vehicleRoutes || vehicleRoutes.length === 0) ? (
              <div style={{
                background: 'var(--bg-surface-raised, #1f2737)',
                border: '1px dashed var(--border-subtle, #242e3f)',
                borderRadius: '4px',
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-muted, #64748b)',
                fontSize: '12px'
              }}>
                No optimization data available.<br />
                Run QPSO optimization in the <strong>Plan</strong> tab to generate performance metrics.
              </div>
            ) : (
              <>
                {/* Optimization Run Metadata */}
                <div style={{
                  background: 'var(--bg-surface-raised, #1f2737)',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                      Optimization run summary
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
                      {runTimestamp ? `Completed ${runTimestamp}` : 'Active solution'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-primary, #f8fafc)', fontWeight: 500 }}>
                    QPSO · Quantum Particle Swarm Optimization
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    Swarm size: {params.numParticles} particles · {params.maxIterations} iterations · Multi-vehicle BPR impedance
                  </div>
                </div>

                {/* Fleet Aggregate Summary */}
                {fleetTotals && (
                  <div style={{
                    background: 'var(--bg-surface-raised, #1f2737)',
                    border: '1px solid var(--border-subtle, #242e3f)',
                    borderRadius: '4px',
                    padding: '10px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '8px' }}>
                      Fleet-wide performance metrics
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '6px 8px', borderRadius: '3px', border: '1px solid var(--border-subtle, #242e3f)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', display: 'block' }}>Total distance</span>
                        <strong style={{ fontSize: '13px' }}>{fleetTotals.distance} km</strong>
                      </div>
                      <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '6px 8px', borderRadius: '3px', border: '1px solid var(--border-subtle, #242e3f)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', display: 'block' }}>Estimated time</span>
                        <strong style={{ fontSize: '13px' }}>{fleetTotals.time} min</strong>
                      </div>
                      <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '6px 8px', borderRadius: '3px', border: '1px solid var(--border-subtle, #242e3f)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', display: 'block' }}>Average congestion</span>
                        <strong style={{
                          fontSize: '13px',
                          color: fleetTotals.avgCongestion > 50 ? 'var(--color-warning, #f59e0b)' : 'var(--color-success, #10b981)'
                        }}>
                          {fleetTotals.avgCongestion}%
                        </strong>
                      </div>
                      <div style={{ background: 'var(--bg-canvas, #0f141c)', padding: '6px 8px', borderRadius: '3px', border: '1px solid var(--border-subtle, #242e3f)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', display: 'block' }}>Fleet operational cost</span>
                        <strong style={{ fontSize: '13px' }}>₹{fleetTotals.cost}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clear Before-and-After Comparison Against Baseline */}
                {comparisonBenchmark && (
                  <div style={{
                    background: 'var(--bg-surface-raised, #1f2737)',
                    border: '1px solid var(--border-subtle, #242e3f)',
                    borderRadius: '4px',
                    padding: '10px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '8px' }}>
                      Comparison vs {comparisonBenchmark.baselineName}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'var(--bg-canvas, #0f141c)', borderRadius: '3px' }}>
                        <span style={{ color: 'var(--text-muted, #64748b)' }}>Travel time</span>
                        <div>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted, #64748b)', marginRight: '6px' }}>
                            {comparisonBenchmark.baselineTime} min
                          </span>
                          <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>
                            {comparisonBenchmark.qpsoTime} min
                          </strong>
                          <span style={{ color: 'var(--color-success, #10b981)', marginLeft: '6px', fontWeight: 600 }}>
                            -{comparisonBenchmark.timeSavingsPct}%
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'var(--bg-canvas, #0f141c)', borderRadius: '3px' }}>
                        <span style={{ color: 'var(--text-muted, #64748b)' }}>Total distance</span>
                        <div>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted, #64748b)', marginRight: '6px' }}>
                            {comparisonBenchmark.baselineDistance} km
                          </span>
                          <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>
                            {comparisonBenchmark.qpsoDistance} km
                          </strong>
                          <span style={{ color: 'var(--color-success, #10b981)', marginLeft: '6px', fontWeight: 600 }}>
                            -{comparisonBenchmark.distSavingsPct}%
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'var(--bg-canvas, #0f141c)', borderRadius: '3px' }}>
                        <span style={{ color: 'var(--text-muted, #64748b)' }}>Operating cost</span>
                        <div>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted, #64748b)', marginRight: '6px' }}>
                            ₹{comparisonBenchmark.baselineCost}
                          </span>
                          <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>
                            ₹{comparisonBenchmark.qpsoCost}
                          </strong>
                          <span style={{ color: 'var(--color-success, #10b981)', marginLeft: '6px', fontWeight: 600 }}>
                            -{comparisonBenchmark.costSavingsPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-Vehicle Metrics Table */}
                <div style={{
                  background: 'var(--bg-surface-raised, #1f2737)',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '8px' }}>
                    Vehicle unit breakdown
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {vehicleRoutes.map((v, i) => {
                      const pal = VEHICLE_PALETTE[i % VEHICLE_PALETTE.length];
                      const isSelected = activeVehicleId === v.vehicle_id;
                      return (
                        <div
                          key={i}
                          onClick={() => onSelectVehicle(isSelected ? null : v.vehicle_id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            background: isSelected ? 'var(--bg-surface-active, #273246)' : 'var(--bg-canvas, #0f141c)',
                            border: `1px solid ${isSelected ? pal.border : 'var(--border-subtle, #242e3f)'}`,
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: pal.main }} />
                            <strong style={{ color: isSelected ? pal.text : 'var(--text-primary, #f8fafc)' }}>
                              Unit {v.vehicle_id}
                            </strong>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', color: 'var(--text-muted, #64748b)' }}>
                            <span>{v.total_distance_km || 0} km</span>
                            <span>{v.total_time_min || 0} min</span>
                            <span style={{ color: 'var(--text-primary, #f8fafc)' }}>₹{v.total_op_cost_inr?.toFixed(0) || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Switch to Detailed Benchmark View */}
                <button
                  onClick={() => onSwitchPage('comparison')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px solid var(--border-strong, #334158)',
                    borderRadius: '4px',
                    color: 'var(--text-primary, #f8fafc)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <BarChart3 size={12} />
                  <span>Open comprehensive algorithm benchmark</span>
                </button>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
