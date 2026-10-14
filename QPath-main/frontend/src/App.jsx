import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Navigation, BarChart3, Truck, Layers, MapPin, Compass,
  LogOut, Shield, Activity, Wifi, WifiOff, AlertTriangle,
  CheckCircle2, RefreshCw, SlidersHorizontal
} from 'lucide-react';
import { optimizeRealRoute, compareRealRoute, getMe, getAdminFleetLive } from './services/api';
import { useGeolocation } from './hooks/useGeolocation';
import { useTraffic } from './hooks/useTraffic';

import MapView from './components/MapView';
import VehicleDetailsPanel from './components/VehicleDetailsPanel';
import DeliveryModal from './components/DeliveryModal';
import IncidentModal from './components/IncidentModal';
import ComparisonPage from './components/ComparisonPage';
import NotificationToast from './components/NotificationToast';
import LoginPage from './components/LoginPage';
import DriverDashboard from './components/DriverDashboard';
import CustomerDashboard from './components/CustomerDashboard';

/* ─────────────────────────────────────────
   Default routing parameters
───────────────────────────────────────── */
const DEFAULT_PARAMS = {
  numVehicles: 1,
  vehicleCapacity: 100,
  weights: { w1: 0.35, w2: 0.25, w3: 0.25, w4: 0.15 },
  numParticles: 30,
  maxIterations: 80,
  selectedAlgorithm: 'qpso',
};

const DEFAULT_DELIVERY_POINTS = [
  { id: 'd1', name: 'India Gate, New Delhi',          lat: 28.6129, lng: 77.2295, demand: 15.0 },
  { id: 'd2', name: 'AIIMS Hospital, Ansari Nagar',   lat: 28.5672, lng: 77.2100, demand: 20.0 },
  { id: 'd3', name: 'Karol Bagh Market',              lat: 28.6517, lng: 77.1906, demand: 12.0 },
  { id: 'd4', name: 'Lajpat Nagar Central Market',    lat: 28.5700, lng: 77.2400, demand: 18.0 },
];

/* ─────────────────────────────────────────
   Root Application
───────────────────────────────────────── */
export default function App() {
  /* ── Customer Portal Direct Link Token (e.g. ?customer=TOKEN or ?token=TOKEN) ── */
  const [customerToken, setCustomerToken] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('customer') || p.get('token') || p.get('track') || null;
    } catch {
      return null;
    }
  });

  /* ── Authentication & Role Session ── */
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('qpath_auth_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('qpath_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  /* ── Live Fleet State for Admin ── */
  const [fleetLive, setFleetLive] = useState(null);

  /* ── Page navigation: 'operations' | 'comparison' ── */
  const [appPage, setAppPage] = useState('operations');

  /* ── GPS depot ── */
  const { coords: userGps, status: geoStatus, requestLocation } = useGeolocation('delhi');
  const [depotLocation, setDepotLocation] = useState({
    lat: 28.6139, lng: 77.2090, name: 'Connaught Place Hub, New Delhi',
  });

  /* ── Delivery stops ── */
  const [deliveryPoints, setDeliveryPoints] = useState(DEFAULT_DELIVERY_POINTS);
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [isDeliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [isIncidentModalOpen, setIncidentModalOpen] = useState(false);

  /* ── Optimization params ── */
  const [params, setParams] = useState(DEFAULT_PARAMS);

  /* ── Results ── */
  const [vehicleRoutes, setVehicleRoutes] = useState([]);
  const [assignedMarkersInfo, setAssignedMarkersInfo] = useState({});
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ── Active vehicle highlight ── */
  const [activeVehicleId, setActiveVehicleId] = useState(null);

  /* ── Congestion modifiers (traffic shock simulation) ── */
  const [congestionModifiers, setCongestionModifiers] = useState({});

  /* ── Notifications ── */
  const [notification, setNotification] = useState(null);

  /* ── Live traffic WebSocket ── */
  const { trafficState, wsConnected } = useTraffic();

  /* ─────────────────── Live Fleet Polling for Admin ─────────────────── */
  const fetchFleetLive = useCallback(async () => {
    if (currentUser?.role === 'admin') {
      try {
        const res = await getAdminFleetLive();
        setFleetLive(res.data);
      } catch (e) {
        console.warn('Fleet live sync failed:', e);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchFleetLive();
      const interval = setInterval(fetchFleetLive, 4000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchFleetLive]);

  /* ─────────────────── Synchronized Stop Statuses ─────────────────── */
  const effectiveDeliveryPoints = useMemo(() => {
    if (!fleetLive?.delivery_stops || fleetLive.delivery_stops.length === 0) {
      return deliveryPoints;
    }
    return deliveryPoints.map(dp => {
      const match = fleetLive.delivery_stops.find(s =>
        (s.name && dp.name && s.name.toLowerCase() === dp.name.toLowerCase()) ||
        (s.id && dp.id && s.id === dp.id) ||
        (Math.abs(s.lat - dp.lat) < 0.001 && Math.abs(s.lng - dp.lng) < 0.001)
      );
      if (match) {
        return {
          ...dp,
          status: match.status,
          delivered_at: match.delivered_at,
          failed_reason: match.failed_reason,
          failed_at: match.failed_at,
          failed_by: match.failed_by,
          assigned_driver_name: match.assigned_driver_name,
          assigned_vehicle: match.assigned_vehicle
        };
      }
      return dp;
    });
  }, [deliveryPoints, fleetLive]);

  /* ─────────────────── Auth Verification ─────────────────── */
  useEffect(() => {
    if (authToken && !currentUser) {
      getMe()
        .then(res => setCurrentUser(res.data))
        .catch(() => {
          localStorage.removeItem('qpath_auth_token');
          localStorage.removeItem('qpath_user');
          setAuthToken(null);
          setCurrentUser(null);
        });
    }
  }, [authToken, currentUser]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('qpath_auth_token');
    localStorage.removeItem('qpath_user');
    setAuthToken(null);
    setCurrentUser(null);
    setNotification({
      type: 'info',
      title: 'Session Terminated',
      message: 'You have been securely signed out.',
    });
  }, []);

  /* ─────────────────── GPS sync ─────────────────── */
  useEffect(() => {
    if (userGps?.lat) {
      setDepotLocation(userGps);
      setNotification({
        type: 'success',
        title: 'Hub Location Calibrated',
        message: `Depot anchored to verified GPS fix (${userGps.lat.toFixed(4)}, ${userGps.lng.toFixed(4)})`,
      });
    }
  }, [userGps]);

  /* ─────────────────── Delivery Point Handlers ─────────────────── */
  const handleAddPoint = useCallback((newPt) => {
    setDeliveryPoints(prev => [...prev, newPt]);
    setNotification({ type: 'info', title: 'Waypoint Appended', message: `Added: ${newPt.name}` });
  }, []);

  const handleRemovePoint = useCallback((index) => {
    setDeliveryPoints(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleReorderPoint = useCallback((fromIndex, toIndex) => {
    setDeliveryPoints(prev => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setDeliveryPoints([]);
    setVehicleRoutes([]);
    setAssignedMarkersInfo({});
    setSelectedStopId(null);
  }, []);

  /* ── Add stop by map click ── */
  const handleMapClick = useCallback((latlng) => {
    if (isDeliveryModalOpen || isIncidentModalOpen) return;
    setDeliveryPoints(prev => {
      const newIdx = prev.length + 1;
      const newPt = {
        id: `dp_${Date.now()}`,
        name: `Stop D${newIdx} (${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)})`,
        lat: latlng.lat,
        lng: latlng.lng,
        demand: 15.0,
      };
      setNotification({ type: 'info', title: 'Waypoint Dropped', message: `Added: ${newPt.name}` });
      return [...prev, newPt];
    });
  }, [isDeliveryModalOpen, isIncidentModalOpen]);

  /* ─────────────────── Build API payload ─────────────────── */
  const buildPayload = useCallback((algo = 'qpso', modifiers = {}) => ({
    depot: {
      lat: depotLocation.lat,
      lng: depotLocation.lng,
      name: depotLocation.name || 'Central Hub',
    },
    delivery_points: deliveryPoints.map((pt, idx) => ({
      id: pt.id || `d_${idx + 1}`,
      name: pt.name || `D${idx + 1}`,
      lat: pt.lat,
      lng: pt.lng,
      demand: pt.demand || 10.0,
    })),
    num_vehicles: params.numVehicles,
    vehicle_capacity: params.vehicleCapacity,
    algorithm: algo,
    weights: {
      travel_time: params.weights.w1,
      distance:    params.weights.w2,
      congestion:  params.weights.w3,
      op_cost:     params.weights.w4,
    },
    num_particles:        params.numParticles,
    max_iterations:       params.maxIterations,
    congestion_modifiers: modifiers,
  }), [depotLocation, deliveryPoints, params]);

  /* ─────────────────── QPSO Optimize ─────────────────── */
  const handleOptimize = useCallback(async (algo = 'qpso') => {
    if (deliveryPoints.length === 0) {
      alert('Please configure at least one delivery waypoint before optimizing.');
      return;
    }
    setLoading(true);
    setActiveVehicleId(null);
    try {
      const payload = buildPayload(algo, congestionModifiers);
      const res = await optimizeRealRoute(payload);
      const data = res.data;
      setVehicleRoutes(data.vehicle_routes || []);
      setAssignedMarkersInfo(data.assigned_markers_info || {});
      setNotification({
        type: 'success',
        title: 'QPSO Fleet Plan Generated',
        message: `Routed ${deliveryPoints.length} stops across ${params.numVehicles} vehicle(s) in ${data.total_travel_time?.toFixed(1)} min.`,
        savings: `Estimated Cost: ₹${data.total_op_cost?.toFixed(0)}`,
      });

      // Background comparison benchmark sync
      try {
        const compRes = await compareRealRoute(payload);
        const compList = compRes.data?.comparison || [];
        setComparisonData(compList);
      } catch (cErr) {
        console.warn('Background comparison sync error:', cErr);
      }
    } catch (err) {
      console.error('Optimization failed:', err);
      setNotification({
        type: 'error',
        title: 'Optimization Error',
        message: err.response?.data?.detail || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [deliveryPoints, buildPayload, congestionModifiers, params.numVehicles]);

  /* ─────────────────── Comparison Trigger ─────────────────── */
  const handleCompare = useCallback(async () => {
    if (deliveryPoints.length === 0) {
      alert('Please configure at least one delivery waypoint before benchmarking algorithms.');
      return;
    }
    setLoading(true);
    try {
      const res = await compareRealRoute(buildPayload('qpso', congestionModifiers));
      const data = res.data;
      const list = data.comparison || (Array.isArray(data) ? data : []);
      setComparisonData(list);
      if (data.vehicle_routes) {
        setVehicleRoutes(data.vehicle_routes);
        setAssignedMarkersInfo(data.assigned_markers_info || {});
      }
      setNotification({
        type: 'success',
        title: 'Benchmark Run Complete',
        message: `Evaluated ${list.length} optimization algorithms.`,
      });
    } catch (err) {
      console.error('Comparison failed:', err);
      setNotification({
        type: 'error',
        title: 'Benchmark Failed',
        message: err.response?.data?.detail || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [deliveryPoints, buildPayload, congestionModifiers]);

  /* ─────────────────── Incident Handlers ─────────────────── */
  const handleApplyIncident = useCallback(async (modifiers, meta) => {
    setCongestionModifiers(modifiers);
    setIncidentModalOpen(false);
    setNotification({
      type: 'warning',
      title: 'Corridor Incident Injected',
      message: `${meta.incidentType} on ${meta.fromLabel} ➔ ${meta.toLabel} (${(meta.severity * 100).toFixed(0)}% delay penalty). Swarm dynamically re-routing...`,
    });
    setLoading(true);
    try {
      const payload = buildPayload('qpso', modifiers);
      const res = await optimizeRealRoute(payload);
      const data = res.data;
      setVehicleRoutes(data.vehicle_routes || []);
      setAssignedMarkersInfo(data.assigned_markers_info || {});

      try {
        const compRes = await compareRealRoute(payload);
        setComparisonData(compRes.data?.comparison || []);
      } catch (cErr) {
        console.warn('Background comparison update error:', cErr);
      }

      setTimeout(() => {
        setNotification({
          type: 'success',
          title: 'Dynamic Re-Route Applied',
          message: `Swarm avoided bottleneck. Revised ETA: ${data.total_travel_time?.toFixed(1)} min | ${data.total_distance?.toFixed(2)} km`,
        });
      }, 600);
    } catch (err) {
      console.error('Re-route failed:', err);
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  const handleResetIncident = useCallback(async () => {
    setCongestionModifiers({});
    setIncidentModalOpen(false);
    setNotification({
      type: 'info',
      title: 'Incidents Cleared',
      message: 'Restored standard network impedance. Re-optimizing baseline routes...',
    });
    setLoading(true);
    try {
      const payload = buildPayload('qpso', {});
      const res = await optimizeRealRoute(payload);
      const data = res.data;
      setVehicleRoutes(data.vehicle_routes || []);
      setAssignedMarkersInfo(data.assigned_markers_info || {});
      try {
        const compRes = await compareRealRoute(payload);
        setComparisonData(compRes.data?.comparison || []);
      } catch (cErr) {
        console.warn('Background comparison update error:', cErr);
      }
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  /* ─────────────────────────── RENDER ─────────────────────────── */
  // 1. Customer Tracking Isolated View
  if (customerToken) {
    return (
      <CustomerDashboard
        token={customerToken}
        onExit={() => {
          setCustomerToken(null);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('customer');
            url.searchParams.delete('token');
            url.searchParams.delete('track');
            window.history.replaceState({}, document.title, url.pathname);
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  // 2. Unauthenticated Login
  if (!authToken || !currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user, token) => {
          setCurrentUser(user);
          setAuthToken(token);
        }}
        onTrackCustomer={(token) => {
          setCustomerToken(token);
        }}
      />
    );
  }

  // 3. Driver Role Isolated Cockpit
  if (currentUser.role === 'driver') {
    return (
      <DriverDashboard
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Admin Fleet Dispatch & Operations Platform
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-canvas, #0f141c)',
      color: 'var(--text-primary, #f8fafc)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden',
    }}>

      {/* ════════════════ TOP NAVIGATION ════════════════ */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-surface, #171d28)',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-subtle, #242e3f)',
        flexShrink: 0,
        zIndex: 100,
      }}>
        {/* Left: Branding & Workspace Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: 'var(--color-primary, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px'
            }}>
              Q
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.2px', color: 'var(--text-primary, #f8fafc)' }}>
                QPath
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '1px 6px',
                borderRadius: '3px',
                background: 'var(--border-strong, #334158)',
                color: 'var(--text-secondary, #94a3b8)'
              }}>
                Fleet operations
              </span>
            </div>
          </div>

          {/* Workspace Switcher */}
          <nav style={{
            display: 'flex',
            background: 'var(--bg-canvas, #0f141c)',
            border: '1px solid var(--border-subtle, #242e3f)',
            borderRadius: '4px',
            padding: '2px',
            gap: '2px'
          }}>
            {[
              { id: 'operations', label: 'Route operations', icon: Navigation },
              { id: 'comparison', label: 'Algorithm benchmark', icon: BarChart3 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setAppPage(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 12px',
                  borderRadius: '3px',
                  border: 'none',
                  background: appPage === id ? 'var(--bg-surface, #171d28)' : 'transparent',
                  color: appPage === id ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #64748b)',
                  fontSize: '11px',
                  fontWeight: appPage === id ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={12} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Center: Genuine Telemetry Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
          {/* WebSocket Traffic Feed Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: wsConnected ? 'var(--color-success, #10b981)' : 'var(--text-muted, #64748b)',
            fontSize: '11px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: wsConnected ? 'var(--color-success, #10b981)' : 'var(--text-muted, #64748b)',
              display: 'inline-block'
            }} />
            <span>{wsConnected ? 'Live traffic' : 'Traffic offline'}</span>
          </div>

          {/* GPS Depot Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: geoStatus === 'granted' ? 'var(--color-success, #10b981)' : 'var(--text-muted, #64748b)',
            fontSize: '11px'
          }}>
            <Compass size={11} />
            <span>{geoStatus === 'granted' ? 'GPS locked' : 'Default hub'}</span>
            {geoStatus !== 'granted' && (
              <button
                onClick={requestLocation}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-info, #0284c7)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Fix
              </button>
            )}
          </div>

          {/* Fleet Summary Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-canvas, #0f141c)',
            border: '1px solid var(--border-subtle, #242e3f)',
            borderRadius: '4px',
            padding: '3px 8px',
            fontSize: '11px',
            color: 'var(--text-secondary, #94a3b8)'
          }}>
            <span>{params.numVehicles} {params.numVehicles === 1 ? 'vehicle' : 'vehicles'}</span>
            <span>·</span>
            <span>{deliveryPoints.length} stops</span>
            {fleetLive?.drivers && (
              <>
                <span>·</span>
                <span>{fleetLive.drivers.length} drivers</span>
              </>
            )}
          </div>

          {/* Real QPSO Execution State */}
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-primary, #2563eb)',
              fontWeight: 500,
              fontSize: '11px'
            }}>
              <RefreshCw size={12} className="animate-spin" />
              <span>Optimizing routes…</span>
            </div>
          )}
        </div>

        {/* Right: Operator Profile & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
              {currentUser.name || currentUser.username}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
              Administrator
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle, #242e3f)',
              color: 'var(--text-secondary, #94a3b8)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            title="Sign out of operations session"
          >
            <LogOut size={12} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* ════════════════ OPERATIONS PAGE ════════════════ */}
      {appPage === 'operations' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* LEFT: DISPATCH SIDEBAR (25-28% Width) */}
          <div style={{
            width: '360px',
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <VehicleDetailsPanel
              vehicleRoutes={vehicleRoutes}
              activeVehicleId={activeVehicleId}
              onSelectVehicle={setActiveVehicleId}
              params={params}
              setParams={setParams}
              onOpenDeliveryModal={() => setDeliveryModalOpen(true)}
              onOptimize={handleOptimize}
              onOpenIncidentModal={() => setIncidentModalOpen(true)}
              loading={loading}
              comparison={comparisonData}
              onSwitchPage={setAppPage}
              liveDrivers={fleetLive?.drivers || []}
              availableJobsCount={fleetLive?.total_available_jobs || 0}
              pendingVerifications={fleetLive?.pending_verifications || []}
              onRefreshFleetLive={fetchFleetLive}
              deliveryPoints={deliveryPoints}
              depot={depotLocation}
            />
          </div>

          {/* CENTER: LARGE MAP CANVAS (72-75% Width) */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <MapView
              isRealWorldMode={true}
              depot={depotLocation}
              deliveryPoints={effectiveDeliveryPoints}
              vehicleRoutes={vehicleRoutes}
              assignedMarkersInfo={assignedMarkersInfo}
              activeVehicleId={activeVehicleId}
              onSelectVehicle={setActiveVehicleId}
              onMapClick={handleMapClick}
              graphData={null}
              trafficState={trafficState}
              activeDrivers={fleetLive?.drivers || []}
              selectedStopId={selectedStopId}
              onSelectStop={setSelectedStopId}
              hasActiveIncidents={Object.keys(congestionModifiers).length > 0}
            />

            {/* QPSO Computation Overlay */}
            {loading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 20, 28, 0.7)',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                backdropFilter: 'blur(2px)',
              }}>
                <RefreshCw size={26} className="animate-spin" style={{ color: 'var(--color-primary, #2563eb)' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                  Optimizing multi-vehicle routes
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', textAlign: 'center', maxWidth: '320px', lineHeight: 1.4 }}>
                  Evaluating road impedance matrix and quantum particle swarm convergence…
                </div>
              </div>
            )}

            {/* Empty stops map hint */}
            {!isDeliveryModalOpen && vehicleRoutes.length === 0 && deliveryPoints.length === 0 && (
              <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-surface, #171d28)',
                border: '1px solid var(--border-subtle, #242e3f)',
                borderRadius: '4px',
                padding: '8px 14px',
                fontSize: '11px',
                color: 'var(--text-secondary, #94a3b8)',
                zIndex: 800,
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
              }}>
                Click map canvas to drop waypoints, or select <strong style={{ color: 'var(--color-primary, #2563eb)' }}>Manage stops</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ BENCHMARK COMPARISON PAGE ════════════════ */}
      {appPage === 'comparison' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ComparisonPage
            comparison={comparisonData}
            onRunComparison={handleCompare}
            loading={loading}
            params={params}
            setParams={setParams}
          />
        </div>
      )}

      {/* ════════════════ DELIVERY STOPS MODAL ════════════════ */}
      <DeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        depot={depotLocation}
        deliveryPoints={deliveryPoints}
        onAddPoint={handleAddPoint}
        onRemovePoint={handleRemovePoint}
        onReorderPoint={handleReorderPoint}
        onClearAll={handleClearAll}
        onOptimize={() => {
          setDeliveryModalOpen(false);
          handleOptimize('qpso');
        }}
        geoStatus={geoStatus}
        onRequestGps={requestLocation}
      />

      {/* ════════════════ INCIDENT SIMULATION MODAL ════════════════ */}
      <IncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIncidentModalOpen(false)}
        deliveryPoints={deliveryPoints}
        onApplyIncident={handleApplyIncident}
        onResetIncident={handleResetIncident}
        activeModifiers={congestionModifiers}
        loading={loading}
      />

      {/* ════════════════ NOTIFICATION BANNER ════════════════ */}
      <NotificationToast
        notification={notification}
        onDismiss={() => setNotification(null)}
      />

    </div>
  );
}
