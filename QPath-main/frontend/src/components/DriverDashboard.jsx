import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck, Navigation, CheckCircle2, Clock, AlertTriangle,
  LogOut, MapPin, ExternalLink, RefreshCw, ChevronRight,
  Shield, Package, AlertCircle, ArrowRight, Check,
  Layers, Compass, ArrowUpRight, XCircle, X, FileText, RotateCcw, KeyRound, Building2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getDriverView, acceptJob, completeDelivery, failDelivery, completeReturnToHub, releaseDriver } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import OTPVerifyModal from './OTPVerifyModal';

// Map auto-centering component
function RecenterOnDriver({ center, zoom = 13 }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Custom Numbered Marker Icon Builder
function createStopIcon(label, status) {
  let bgColor = '#171d28';
  let borderColor = '#3b82f6';
  let badgeSymbol = label.replace(/^[dD]/, '');

  if (status === 'In Progress') {
    bgColor = '#171d28';
    borderColor = '#f59e0b';
  } else if (status === 'Delivered') {
    bgColor = '#059669';
    borderColor = '#10b981';
    badgeSymbol = '✓';
  } else if (status === 'Failed') {
    bgColor = '#dc2626';
    borderColor = '#ef4444';
    badgeSymbol = '✕';
  }

  const html = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: ${bgColor};
      border: 1.5px solid ${borderColor};
      border-radius: 50%;
      color: #ffffff;
      font-weight: 600;
      font-size: 11px;
      font-family: var(--font-sans);
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      cursor: pointer;
    ">
      ${badgeSymbol}
    </div>
  `;

  return L.divIcon({
    className: 'custom-driver-stop-marker',
    html: html,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12]
  });
}

function createDepotIcon() {
  const html = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: #171d28;
      border: 1.5px solid #3b82f6;
      border-radius: 4px;
      color: #60a5fa;
      font-weight: 700;
      font-size: 9px;
      font-family: var(--font-sans);
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      cursor: pointer;
    ">
      HUB
    </div>
  `;
  return L.divIcon({
    className: 'custom-driver-depot-marker',
    html: html,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  });
}

export default function DriverDashboard({ user, onLogout }) {
  const driverId = user?.driver_id || 'driver1';
  const driverName = user?.name || 'Driver 1';
  const assignedVehicle = user?.assigned_vehicle || 'Vehicle 1';

  // Live GPS tracking
  const { coords: userGps } = useGeolocation('delhi');

  // View state: 'jobs' (Available Jobs) or 'route' (Active Delivery Cockpit)
  const [activeTab, setActiveTab] = useState('jobs');
  const [driverView, setDriverView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acceptingJobId, setAcceptingJobId] = useState(null);
  const [completingStopId, setCompletingStopId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Failure modal state
  const [failModalStop, setFailModalStop] = useState(null);
  const [failReason, setFailReason] = useState('Customer unavailable / Not home');
  const [failCustomNotes, setFailCustomNotes] = useState('');
  const [failingStopId, setFailingStopId] = useState(null);

  // Return to hub state
  const [completingReturn, setCompletingReturn] = useState(false);
  const [returnSubmitted, setReturnSubmitted] = useState(false);
  const [releasingDriver, setReleasingDriver] = useState(false);

  // OTP Verification modal state
  const [otpModalStop, setOtpModalStop] = useState(null);

  // Poll driver data from backend
  const fetchDriverData = useCallback(async () => {
    try {
      const res = await getDriverView(driverId);
      const data = res.data;
      setDriverView(data);

      if (data.active_job) {
        setActiveTab('route');
      }
      setErrorMessage(null);
    } catch (err) {
      console.error('Error fetching driver view:', err);
      setErrorMessage('Failed to connect to Dispatch server. Retrying…');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchDriverData();
    const interval = setInterval(fetchDriverData, 5000);
    return () => clearInterval(interval);
  }, [fetchDriverData]);

  // Handle accepting a job
  const handleAcceptJob = async (jobId) => {
    setAcceptingJobId(jobId);
    setErrorMessage(null);
    try {
      const gps = userGps?.lat ? { lat: userGps.lat, lng: userGps.lng } : { lat: 28.6139, lng: 77.2090 };
      const res = await acceptJob(driverId, jobId, gps);
      if (res.data?.success) {
        setSuccessMessage(`Job ${jobId} accepted! Route optimized.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        await fetchDriverData();
        setActiveTab('route');
      }
    } catch (err) {
      console.error('Error accepting job:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to accept job.');
    } finally {
      setAcceptingJobId(null);
    }
  };

  // Handle completing a delivery stop
  const handleCompleteDelivery = async (stopId) => {
    if (!driverView?.active_job?.job_id) return;
    setCompletingStopId(stopId);
    setErrorMessage(null);
    try {
      const gps = userGps?.lat ? { lat: userGps.lat, lng: userGps.lng } : { lat: 28.6139, lng: 77.2090 };
      const res = await completeDelivery(driverId, driverView.active_job.job_id, stopId, gps);
      if (res.data?.success) {
        setSuccessMessage('Delivery completed. Remaining stops re-optimized.');
        setTimeout(() => setSuccessMessage(null), 4000);
        await fetchDriverData();
      }
    } catch (err) {
      console.error('Error completing delivery:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to complete delivery.');
    } finally {
      setCompletingStopId(null);
    }
  };

  // Handle reporting failed delivery
  const handleFailDelivery = async () => {
    if (!failModalStop || !driverView?.active_job?.job_id) return;
    const stopId = failModalStop.id;
    setFailingStopId(stopId);
    setErrorMessage(null);

    const fullReason = failCustomNotes.trim()
      ? `${failReason}: ${failCustomNotes.trim()}`
      : failReason;

    try {
      const gps = userGps?.lat ? { lat: userGps.lat, lng: userGps.lng } : { lat: 28.6139, lng: 77.2090 };
      const res = await failDelivery(driverId, driverView.active_job.job_id, stopId, fullReason, gps);
      if (res.data?.success) {
        setSuccessMessage(`Logged as Undelivered: ${fullReason}. Route re-optimized.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setFailModalStop(null);
        setFailCustomNotes('');
        await fetchDriverData();
      }
    } catch (err) {
      console.error('Error recording failed delivery:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to record exception.');
    } finally {
      setFailingStopId(null);
    }
  };

  // Handle return to hub
  const handleCompleteReturn = async () => {
    if (!driverView?.active_job?.job_id) return;
    setCompletingReturn(true);
    setErrorMessage(null);
    try {
      const gps = userGps?.lat ? { lat: userGps.lat, lng: userGps.lng } : { lat: 28.6139, lng: 77.2090 };
      const res = await completeReturnToHub(driverId, driverView.active_job.job_id, gps);
      if (res.data?.success) {
        setReturnSubmitted(true);
        setSuccessMessage('Arrived at Central Hub. Awaiting Admin check-in.');
        await fetchDriverData();
      }
    } catch (err) {
      console.error('Error completing return:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to submit hub arrival.');
    } finally {
      setCompletingReturn(false);
    }
  };

  // Handle claiming another job
  const handleClaimAnotherJob = async () => {
    setReleasingDriver(true);
    try {
      await releaseDriver(driverId);
      await fetchDriverData();
      setActiveTab('jobs');
    } catch (err) {
      console.error('Error releasing driver:', err);
      setActiveTab('jobs');
    } finally {
      setReleasingDriver(false);
    }
  };

  const availableJobs = driverView?.available_jobs || [];
  const currentJob = driverView?.active_job;
  const activeRoute = driverView?.active_route;
  const googleMapsUrl = driverView?.google_maps_url;
  const isReturningToHub = driverView?.is_returning_to_hub;

  // Stops and metrics
  const stops = currentJob?.delivery_points || [];
  const remainingStops = stops.filter(s => s.status !== 'Delivered' && s.status !== 'Failed');
  const deliveredStops = stops.filter(s => s.status === 'Delivered');
  const failedStops = stops.filter(s => s.status === 'Failed');
  const nextStop = remainingStops[0] || null;

  // Polyline coords for map
  const polylineCoords = activeRoute?.path_coords?.map(p => [p.lat, p.lng]) || [];
  const mapCenter = userGps?.lat
    ? [userGps.lat, userGps.lng]
    : currentJob?.depot?.lat
      ? [currentJob.depot.lat, currentJob.depot.lng]
      : [28.6139, 77.2090];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--bg-canvas, #0f141c)',
      color: 'var(--text-primary, #f8fafc)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden'
    }}>
      {/* ── Driver Header ── */}
      <header style={{
        backgroundColor: 'var(--bg-surface, #171d28)',
        borderBottom: '1px solid var(--border-subtle, #242e3f)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            background: 'var(--color-primary, #2563eb)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px'
          }}>
            Q
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                QPath
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '1px 5px',
                borderRadius: '3px',
                backgroundColor: 'var(--border-strong, #334158)',
                color: 'var(--text-secondary, #94a3b8)'
              }}>
                Driver cockpit
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '1px 5px',
                borderRadius: '3px',
                backgroundColor: 'var(--color-primary-subtle, rgba(37, 99, 235, 0.12))',
                color: '#60a5fa'
              }}>
                {assignedVehicle}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
              <span>Operator: <strong style={{ color: 'var(--text-secondary, #94a3b8)' }}>{driverName}</strong> ({driverId})</span>
              <span>·</span>
              <span style={{
                color: driverView?.driver?.status === 'En Route' ? '#60a5fa' : 'var(--color-success, #10b981)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px'
              }}>
                ● {driverView?.driver?.status || 'Available'}
              </span>
            </div>
          </div>
        </div>

        {/* View Navigation Tabs & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-canvas, #0f141c)',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid var(--border-subtle, #242e3f)'
          }}>
            <button
              onClick={() => setActiveTab('jobs')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: activeTab === 'jobs' ? 'var(--bg-surface, #171d28)' : 'transparent',
                color: activeTab === 'jobs' ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #64748b)',
                fontSize: '11px',
                fontWeight: activeTab === 'jobs' ? 600 : 500,
                cursor: 'pointer'
              }}
            >
              <Package size={13} />
              <span>Available jobs ({availableJobs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('route')}
              disabled={!currentJob}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: activeTab === 'route' ? 'var(--bg-surface, #171d28)' : 'transparent',
                color: activeTab === 'route' ? 'var(--text-primary, #f8fafc)' : currentJob ? 'var(--text-muted, #64748b)' : 'var(--border-strong, #334158)',
                fontSize: '11px',
                fontWeight: activeTab === 'route' ? 600 : 500,
                cursor: currentJob ? 'pointer' : 'not-allowed'
              }}
            >
              <Navigation size={13} />
              <span>Active route</span>
              {currentJob && currentJob.status !== 'Completed' && (
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  backgroundColor: '#60a5fa', display: 'inline-block'
                }} />
              )}
            </button>
          </div>

          <button
            onClick={fetchDriverData}
            title="Refresh dispatch feed"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-canvas, #0f141c)',
              border: '1px solid var(--border-subtle, #242e3f)',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} />
          </button>

          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-subtle, #242e3f)',
              color: 'var(--text-secondary, #94a3b8)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <LogOut size={12} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Alerts ── */}
      {errorMessage && (
        <div style={{
          margin: '10px 16px 0 16px',
          padding: '8px 12px',
          backgroundColor: 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '4px',
          color: 'var(--color-danger, #ef4444)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          margin: '10px 16px 0 16px',
          padding: '8px 12px',
          backgroundColor: 'var(--color-success-subtle, rgba(16, 185, 129, 0.12))',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '4px',
          color: 'var(--color-success, #10b981)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={14} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── TAB 1: AVAILABLE DELIVERY JOBS ── */}
      {activeTab === 'jobs' && (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f1f5f9)', margin: '0 0 2px 0' }}>
              Dispatch Jobs Pool
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', margin: 0 }}>
              Select a batch to accept. Route immediately calculates from your live GPS position using QPSO.
            </p>
          </div>

          {availableJobs.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--bg-surface, #171d28)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #242e3f)',
              padding: '48px 20px',
              textAlign: 'center',
              color: 'var(--text-muted, #64748b)'
            }}>
              <Package size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', marginBottom: '4px' }}>
                No Available Batches in Pool
              </div>
              <div style={{ fontSize: '12px' }}>
                All delivery batches are currently assigned. Check back shortly or request Admin to publish new routes.
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '14px'
            }}>
              {availableJobs.map((job) => {
                const isAccepting = acceptingJobId === job.job_id;
                return (
                  <div
                    key={job.job_id}
                    style={{
                      backgroundColor: 'var(--bg-surface, #171d28)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, #242e3f)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Card Header: Job ID & Priority */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          backgroundColor: 'var(--bg-canvas, #0f141c)',
                          color: '#60a5fa',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          border: '1px solid var(--border-subtle, #242e3f)'
                        }}>
                          {job.job_id}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono)' }}>
                          {job.created_at}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: job.priority === 'High Priority' ? 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))' : 'var(--color-primary-subtle, rgba(37, 99, 235, 0.12))',
                        color: job.priority === 'High Priority' ? 'var(--color-danger, #ef4444)' : 'var(--color-primary, #2563eb)',
                        border: `1px solid ${job.priority === 'High Priority' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(37, 99, 235, 0.3)'}`
                      }}>
                        {job.priority}
                      </span>
                    </div>

                    {/* Job Title */}
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', margin: '0 0 10px 0' }}>
                      {job.title}
                    </h3>

                    {/* Metrics Bar */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '6px',
                      backgroundColor: 'var(--bg-canvas, #0f141c)',
                      borderRadius: '4px',
                      padding: '8px',
                      marginBottom: '12px',
                      border: '1px solid var(--border-subtle, #242e3f)'
                    }}>
                      <div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Stops</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', fontFamily: 'var(--font-mono)' }}>
                          {job.num_deliveries}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Distance</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                          {job.total_distance_km} km
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Est. time</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
                          {Math.round(job.estimated_time_min)} min
                        </div>
                      </div>
                    </div>

                    {/* Delivery Destinations */}
                    <div style={{ flex: 1, marginBottom: '14px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', fontWeight: 600, marginBottom: '4px' }}>
                        Delivery destinations:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {job.delivery_points.map((pt, pIdx) => (
                          <div
                            key={pt.id || pIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                              backgroundColor: 'var(--bg-canvas, #0f141c)',
                              padding: '5px 8px',
                              borderRadius: '3px',
                              border: '1px solid var(--border-subtle, #242e3f)'
                            }}
                          >
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '18px',
                              height: '18px',
                              borderRadius: '3px',
                              backgroundColor: 'var(--color-primary, #2563eb)',
                              color: '#ffffff',
                              fontSize: '9px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {pt.label || `D${pIdx+1}`}
                            </span>
                            <span style={{ flex: 1, color: 'var(--text-secondary, #94a3b8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {pt.name}
                            </span>
                            <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                              {pt.demand}kg
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Accept Job Button */}
                    <button
                      type="button"
                      disabled={isAccepting}
                      onClick={() => handleAcceptJob(job.job_id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '9px 14px',
                        backgroundColor: 'var(--color-primary, #2563eb)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isAccepting ? 'not-allowed' : 'pointer',
                        opacity: isAccepting ? 0.7 : 1
                      }}
                    >
                      <span>{isAccepting ? 'Optimizing Trajectory…' : 'Accept Job & Start Routing'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ACTIVE DELIVERY COCKPIT ── */}
      {activeTab === 'route' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top Live Progress KPI Bar */}
          <div style={{
            backgroundColor: 'var(--bg-surface, #171d28)',
            borderBottom: '1px solid var(--border-subtle, #242e3f)',
            padding: '8px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '8px'
          }}>
            <div style={{ backgroundColor: 'var(--bg-canvas, #0f141c)', borderRadius: '4px', padding: '8px 10px', border: '1px solid var(--border-subtle, #242e3f)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Active job</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                {currentJob?.job_id || 'No job active'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-canvas, #0f141c)', borderRadius: '4px', padding: '8px 10px', border: '1px solid var(--border-subtle, #242e3f)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Delivery progress</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success, #10b981)', fontFamily: 'var(--font-mono)' }}>
                {deliveredStops.length} / {stops.length} stops delivered
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-canvas, #0f141c)', borderRadius: '4px', padding: '8px 10px', border: '1px solid var(--border-subtle, #242e3f)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Remaining distance</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', fontFamily: 'var(--font-mono)' }}>
                {activeRoute?.total_distance_km ? `${activeRoute.total_distance_km.toFixed(1)} km` : '0 km'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-canvas, #0f141c)', borderRadius: '4px', padding: '8px 10px', border: '1px solid var(--border-subtle, #242e3f)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Est. remaining time</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
                {activeRoute?.total_time_min ? `${Math.round(activeRoute.total_time_min)} min` : '0 min'}
              </div>
            </div>
          </div>

          {/* Optimized Delivery Sequence Banner */}
          {activeRoute?.sequence_str && (
            <div style={{
              backgroundColor: 'var(--bg-canvas, #0f141c)',
              borderBottom: '1px solid var(--border-subtle, #242e3f)',
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '11px'
            }}>
              <span style={{ color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Compass size={13} />
                QPSO sequence:
              </span>
              <span style={{
                color: 'var(--text-primary, #f8fafc)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px'
              }}>
                GPS Fix ➔ {activeRoute.sequence_str}
              </span>
              <span style={{ marginLeft: 'auto', color: activeRoute.traffic_color || 'var(--color-success, #10b981)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: activeRoute.traffic_color || 'var(--color-success, #10b981)' }} />
                {activeRoute.traffic_condition || 'Free Flow'}
              </span>
            </div>
          )}

          {/* Split View: Left List, Right Map */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left: Stop Cards */}
            <div style={{
              width: '420px',
              backgroundColor: 'var(--bg-surface, #171d28)',
              borderRight: '1px solid var(--border-subtle, #242e3f)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflowY: 'auto'
            }}>
              {/* Return to Hub Banner */}
              {isReturningToHub && (
                <div style={{
                  margin: '12px',
                  padding: '14px',
                  backgroundColor: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <Building2 size={24} style={{ color: '#a78bfa', margin: '0 auto 6px auto' }} />
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#c4b5fd', margin: '0 0 2px 0' }}>
                    Return to Central Hub Required
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 10px 0' }}>
                    Deliveries finished. <strong>{failedStops.length} undelivered parcel(s)</strong> must be returned for admin check-in.
                  </p>

                  {/* Confirm Arrived / Pending Verification */}
                  <div>
                    {returnSubmitted || currentJob?.status === 'Pending Admin Verification' ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '4px',
                        fontSize: '11px', color: '#fbbf24', fontWeight: 600
                      }}>
                        <Clock size={13} />
                        <span>Arrived at Hub — Awaiting Admin Verification</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleCompleteReturn}
                        disabled={completingReturn}
                        style={{
                          width: '100%',
                          padding: '8px 14px',
                          backgroundColor: completingReturn ? 'var(--border-strong, #334158)' : 'var(--color-primary, #2563eb)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: completingReturn ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>{completingReturn ? 'Submitting Arrival...' : 'Confirm Arrived at Hub'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Job Completed All-Delivered Card */}
              {!isReturningToHub && remainingStops.length === 0 && stops.length > 0 && (
                <div style={{
                  margin: '12px',
                  padding: '18px 16px',
                  backgroundColor: 'var(--color-success-subtle, rgba(16, 185, 129, 0.12))',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <CheckCircle2 size={32} style={{ color: 'var(--color-success, #10b981)', margin: '0 auto 8px auto' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-success, #10b981)', margin: '0 0 4px 0' }}>
                    Shift Batch Completed
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 12px 0' }}>
                    All {stops.length} deliveries in {currentJob?.job_id} successfully dispatched.
                  </p>
                  <button
                    onClick={handleClaimAnotherJob}
                    disabled={releasingDriver}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: releasingDriver ? 'var(--border-strong, #334158)' : 'var(--color-primary, #2563eb)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: releasingDriver ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {releasingDriver ? 'Releasing Unit...' : 'Claim Next Job Batch ➔'}
                  </button>
                </div>
              )}

              {/* Stop Cards */}
              <div style={{ padding: '10px', flex: 1 }}>

                {/* Hub Origin Card (Stop 0) */}
                {stops.length > 0 && currentJob?.depot && (
                  <div style={{
                    backgroundColor: 'var(--bg-canvas, #0f141c)',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle, #242e3f)',
                    padding: '10px 12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={14} style={{ color: 'var(--color-primary, #2563eb)' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary, #f1f5f9)' }}>
                          Central Logistics Hub
                        </span>
                      </div>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: 'var(--color-success, #10b981)', backgroundColor: 'var(--color-success-subtle, rgba(16, 185, 129, 0.12))',
                        padding: '1px 5px', borderRadius: '2px', border: '1px solid rgba(16,185,129,0.3)'
                      }}>
                        ORIGIN ✓
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono)' }}>
                      {currentJob.depot.lat?.toFixed(4)}, {currentJob.depot.lng?.toFixed(4)}
                    </div>
                  </div>
                )}

                {stops.map((stop, index) => {
                  const isDelivered = stop.status === 'Delivered';
                  const isFailed = stop.status === 'Failed';
                  const isCompleting = completingStopId === stop.id;
                  const isFailing = failingStopId === stop.id;
                  const isNext = !isDelivered && !isFailed && nextStop?.id === stop.id;

                  const googleStopUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`;

                  let cardBg = 'var(--bg-canvas, #0f141c)';
                  let cardBorder = 'var(--border-subtle, #242e3f)';
                  if (isDelivered) {
                    cardBg = 'rgba(16, 185, 129, 0.04)';
                    cardBorder = 'rgba(16, 185, 129, 0.25)';
                  } else if (isFailed) {
                    cardBg = 'rgba(239, 68, 68, 0.05)';
                    cardBorder = 'rgba(239, 68, 68, 0.3)';
                  } else if (isNext) {
                    cardBg = 'var(--bg-surface-raised, #1f2737)';
                    cardBorder = 'var(--color-primary, #2563eb)';
                  }

                  return (
                    <div
                      key={stop.id || index}
                      style={{
                        backgroundColor: cardBg,
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: cardBorder,
                        padding: '10px 12px',
                        marginBottom: '8px',
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      {/* Stop Top Line */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: isDelivered ? 'var(--color-success, #10b981)' : isFailed ? 'var(--color-danger, #ef4444)' : isNext ? 'var(--color-primary, #2563eb)' : 'var(--border-strong, #334158)',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)'
                          }}>
                            {isDelivered ? '✓' : isFailed ? '✕' : index + 1}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f1f5f9)' }}>
                            {stop.label || `D${index+1}`}: {stop.name}
                          </span>
                        </div>

                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 5px',
                          borderRadius: '2px',
                          backgroundColor: isDelivered ? 'var(--color-success-subtle, rgba(16, 185, 129, 0.12))' : isFailed ? 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))' : 'var(--bg-canvas, #0f141c)',
                          color: isDelivered ? 'var(--color-success, #10b981)' : isFailed ? 'var(--color-danger, #ef4444)' : '#60a5fa',
                          border: `1px solid ${isDelivered ? 'rgba(16,185,129,0.3)' : isFailed ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle, #242e3f)'}`
                        }}>
                          {isFailed ? 'FAILED' : isDelivered ? 'DELIVERED' : 'PENDING'}
                        </span>
                      </div>

                      {/* Demand & Details */}
                      <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', marginBottom: '8px', display: 'flex', gap: '10px', fontFamily: 'var(--font-mono)' }}>
                        <span>Demand: {stop.demand} kg</span>
                        {stop.delivered_at && <span style={{ color: 'var(--color-success, #10b981)' }}>At {stop.delivered_at}</span>}
                      </div>

                      {/* Failure Reason Callout */}
                      {isFailed && (
                        <div style={{
                          backgroundColor: 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '3px',
                          padding: '6px 8px',
                          marginBottom: '8px',
                          fontSize: '10px',
                          color: 'var(--color-danger, #ef4444)'
                        }}>
                          <strong>Exception:</strong> {stop.failed_reason || 'Undelivered'}
                        </div>
                      )}

                      {/* Action Row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-subtle, #242e3f)'
                      }}>
                        {isDelivered ? (
                          <span style={{ fontSize: '11px', color: 'var(--color-success, #10b981)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> Completed
                          </span>
                        ) : isFailed ? (
                          <span style={{ fontSize: '11px', color: 'var(--color-danger, #ef4444)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <RotateCcw size={12} /> Hub Return Scheduled
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              disabled={isCompleting || isFailing}
                              onClick={() => setOtpModalStop(stop)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 9px',
                                backgroundColor: 'var(--color-primary, #2563eb)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <KeyRound size={11} />
                              <span>Verify OTP</span>
                            </button>

                            <button
                              type="button"
                              disabled={isCompleting || isFailing}
                              onClick={() => handleCompleteDelivery(stop.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 8px',
                                backgroundColor: 'transparent',
                                color: 'var(--color-success, #10b981)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCircle2 size={11} />
                              <span>{isCompleting ? '...' : 'Quick'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isCompleting || isFailing}
                              onClick={() => {
                                setFailModalStop(stop);
                                setFailReason('Customer unavailable / Not home');
                                setFailCustomNotes('');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 8px',
                                backgroundColor: 'transparent',
                                color: 'var(--color-danger, #ef4444)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <XCircle size={11} />
                              <span>Failed</span>
                            </button>
                          </div>
                        )}

                        <a
                          href={googleStopUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            color: 'var(--text-secondary, #94a3b8)',
                            textDecoration: 'none',
                            padding: '4px 6px',
                            borderRadius: '3px',
                            border: '1px solid var(--border-subtle, #242e3f)'
                          }}
                        >
                          <Navigation size={10} />
                          <span>Nav</span>
                          <ExternalLink size={9} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Driver Dedicated Map */}
            <div style={{ flex: 1, height: '100%', position: 'relative' }}>
              {googleMapsUrl && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '60px',
                  zIndex: 1000,
                  backgroundColor: 'var(--bg-surface, #171d28)',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                    Active turn-by-turn route: <strong style={{ color: '#60a5fa' }}>{currentJob?.job_id}</strong>
                  </span>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'var(--color-primary, #2563eb)',
                      color: '#ffffff',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    <span>Open External Maps</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}

              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ width: '100%', height: '100%', backgroundColor: '#0f141c' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <RecenterOnDriver center={mapCenter} />

                {/* Driver Live GPS Marker */}
                {userGps?.lat && userGps?.lng && (
                  <CircleMarker
                    center={[userGps.lat, userGps.lng]}
                    radius={8}
                    pathOptions={{
                      fillColor: '#60a5fa',
                      fillOpacity: 1,
                      color: '#ffffff',
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div style={{ color: '#000', fontSize: '11px' }}>
                        <strong>Driver GPS Position</strong><br />
                        {userGps.lat.toFixed(4)}, {userGps.lng.toFixed(4)}
                      </div>
                    </Popup>
                  </CircleMarker>
                )}

                {/* Central Hub Marker */}
                {currentJob?.depot && (
                  <Marker
                    position={[currentJob.depot.lat, currentJob.depot.lng]}
                    icon={createDepotIcon()}
                  >
                    <Popup>
                      <div style={{ minWidth: '160px' }}>
                        <strong>Central Logistics Hub</strong><br />
                        {currentJob.depot.name}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Stops Markers */}
                {stops.map((stop, i) => (
                  <Marker
                    key={stop.id || i}
                    position={[stop.lat, stop.lng]}
                    icon={createStopIcon(stop.label || `D${i+1}`, stop.status)}
                  >
                    <Popup>
                      <div style={{ minWidth: '170px' }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '2px' }}>
                          {stop.label || `D${i+1}`}: {stop.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                          Status: {stop.status || 'Pending'}<br />
                          Demand: {stop.demand} kg
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Remaining Route Polyline */}
                {polylineCoords.length > 1 && (
                  <Polyline
                    positions={polylineCoords}
                    pathOptions={{
                      color: activeRoute?.traffic_color || '#3b82f6',
                      weight: 4,
                      opacity: 0.9,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* Undelivered Package Modal */}
      {failModalStop && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 7, 12, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface-raised, #1f2737)',
            border: '1px solid var(--border-strong, #334158)',
            borderRadius: '6px',
            maxWidth: '480px',
            width: '100%',
            padding: '20px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '4px',
                  background: 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
                  color: 'var(--color-danger, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <AlertTriangle size={15} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                    Report delivery exception
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                    {failModalStop.label}: {failModalStop.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setFailModalStop(null); setFailCustomNotes(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748b)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              backgroundColor: 'var(--color-danger-subtle, rgba(239, 68, 68, 0.12))',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '4px',
              padding: '8px 10px',
              marginBottom: '14px',
              fontSize: '11px',
              color: 'var(--color-danger, #ef4444)'
            }}>
              This exception logs to the Central Operations console immediately. Remaining route will re-optimize, and return to Central Hub will be scheduled.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
                Exception Reason:
              </label>
              <select
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-canvas, #0f141c)',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12px'
                }}
              >
                <option value="Customer unavailable / Not home">Customer unavailable / Not home</option>
                <option value="Address incorrect / Cannot locate premise">Address incorrect / Cannot locate premise</option>
                <option value="Customer refused delivery / Cancelled order">Customer refused delivery / Cancelled order</option>
                <option value="Access restricted / Gate locked">Access restricted / Gate locked</option>
                <option value="Package damaged in transit">Package damaged in transit</option>
                <option value="Payment / OTP verification failed">Payment / OTP verification failed</option>
                <option value="Business closed / Outside delivery hours">Business closed / Outside delivery hours</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
                Additional remarks:
              </label>
              <textarea
                rows={2}
                value={failCustomNotes}
                onChange={(e) => setFailCustomNotes(e.target.value)}
                placeholder="Details of attempt…"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-canvas, #0f141c)',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '11px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setFailModalStop(null); setFailCustomNotes(''); }}
                style={{
                  padding: '7px 12px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  color: 'var(--text-secondary, #94a3b8)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={failingStopId !== null}
                onClick={handleFailDelivery}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 14px',
                  backgroundColor: 'var(--color-danger, #ef4444)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: failingStopId !== null ? 'not-allowed' : 'pointer'
                }}
              >
                <XCircle size={14} />
                <span>{failingStopId !== null ? 'Re-optimizing...' : 'Confirm Exception'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OTP Verification Modal ── */}
      {otpModalStop && (
        <OTPVerifyModal
          stop={otpModalStop}
          driverId={driverId}
          driverGps={userGps?.lat ? { lat: userGps.lat, lng: userGps.lng } : { lat: 28.6139, lng: 77.2090 }}
          onSuccess={(data) => {
            setOtpModalStop(null);
            setSuccessMessage(`OTP Handshake verified. Consignment marked as Delivered.`);
            setTimeout(() => setSuccessMessage(null), 4000);
            fetchDriverData();
          }}
          onCancel={() => setOtpModalStop(null)}
        />
      )}
    </div>
  );
}
