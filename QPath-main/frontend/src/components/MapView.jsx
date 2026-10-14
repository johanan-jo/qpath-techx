import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  Layers, MapPin, Eye, EyeOff, Navigation, Truck,
  ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, X, Compass, Activity
} from 'lucide-react';

// Fix default leaflet marker icon asset issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Understated, professional enterprise vehicle palette
export const VEHICLE_PALETTE = [
  { main: '#2563eb', text: '#60a5fa', name: 'Unit 1', border: '#3b82f6', bgSubtle: 'rgba(37, 99, 235, 0.12)' },
  { main: '#059669', text: '#34d399', name: 'Unit 2', border: '#10b981', bgSubtle: 'rgba(5, 150, 105, 0.12)' },
  { main: '#d97706', text: '#fbbf24', name: 'Unit 3', border: '#f59e0b', bgSubtle: 'rgba(217, 119, 6, 0.12)' },
  { main: '#7c3aed', text: '#a78bfa', name: 'Unit 4', border: '#8b5cf6', bgSubtle: 'rgba(124, 58, 237, 0.12)' },
  { main: '#db2777', text: '#f472b6', name: 'Unit 5', border: '#ec4899', bgSubtle: 'rgba(219, 39, 119, 0.12)' }
];

// Calculate bearing between two coordinate points for direction chevrons
function computeBearing(p1, p2) {
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Subtle directional chevron along route segments
const createDirectionalArrowIcon = (bearing, color = '#94a3b8') => {
  return L.divIcon({
    className: 'route-directional-arrow',
    html: `
      <div style="
        transform: rotate(${bearing}deg);
        width: 12px;
        height: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        pointer-events: none;
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M6 15L12 9L18 15" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

// Refined, compact numbered stop icon
const createNumberedDeliveryIcon = (label, vehicleId = 1, status = 'Pending', isSelected = false) => {
  const isDelivered = status === 'Delivered';
  const isFailed = status === 'Failed';
  const palette = VEHICLE_PALETTE[(vehicleId - 1) % VEHICLE_PALETTE.length] || VEHICLE_PALETTE[0];

  let bg = '#171d28';
  let border = palette.border;
  let text = '#f8fafc';
  let symbol = label.replace(/^[dD]/, '');

  if (isDelivered) {
    bg = '#059669';
    border = '#10b981';
    symbol = '✓';
  } else if (isFailed) {
    bg = '#dc2626';
    border = '#ef4444';
    symbol = '✕';
  }

  const ringStyle = isSelected ? `outline: 2px solid #3b82f6; outline-offset: 1px;` : '';

  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `
      <div style="
        background: ${bg};
        color: ${text};
        border: 1.5px solid ${border};
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-sans);
        font-weight: 600;
        font-size: 11px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        cursor: pointer;
        ${ringStyle}
      ">
        ${symbol}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12]
  });
};

// Distinct Central Hub Depot Marker (uncluttered, understated)
const createDepotIcon = () => {
  return L.divIcon({
    className: 'custom-depot-marker',
    html: `
      <div style="
        background: #171d28;
        color: #60a5fa;
        border: 1.5px solid #3b82f6;
        border-radius: 4px;
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-sans);
        font-weight: 700;
        font-size: 9px;
        letter-spacing: 0.3px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      ">
        HUB
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  });
};

// Compact Driver GPS Location Marker
const createDriverTruckIcon = (driverName, vehicleName, color = '#10b981') => {
  return L.divIcon({
    className: 'custom-driver-truck-marker',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #171d28;
        border: 1px solid #334158;
        border-radius: 4px;
        padding: 3px 7px;
        color: #f8fafc;
        font-size: 11px;
        font-family: var(--font-sans);
        font-weight: 500;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        white-space: nowrap;
      ">
        <span style="color: ${color}; font-size: 8px;">●</span>
        <span>${driverName || vehicleName}</span>
      </div>
    `,
    iconSize: [100, 22],
    iconAnchor: [50, 11],
    popupAnchor: [0, -13]
  });
};

// Map click handler to add delivery stops
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

// Map center controller
function MapCenterController({ center, zoom, resetTrigger }) {
  const map = useMap();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if ((!hasInitializedRef.current || resetTrigger) && center && center[0] && center[1]) {
      map.setView(center, zoom || 13, { animate: hasInitializedRef.current });
      hasInitializedRef.current = true;
    }
  }, [center, zoom, map, resetTrigger]);

  return null;
}

// Determine traffic overlay color
function getTrafficColor(leg) {
  if (leg.traffic_color) return leg.traffic_color;
  const pct = leg.congestion_pct || (leg.congestion ? leg.congestion * 100 : 25);
  if (pct < 35) return '#10b981'; // Low / Free flow
  if (pct < 65) return '#f59e0b'; // Moderate
  return '#ef4444';              // Severe / Congestion
}

export default function MapView({
  isRealWorldMode = true,
  depot,
  deliveryPoints = [],
  vehicleRoutes = [],
  assignedMarkersInfo = {},
  activeVehicleId = null,
  onSelectVehicle,
  onMapClick,
  graphData,
  trafficState,
  activeDrivers = [],
  selectedStopId = null,
  onSelectStop,
  hasActiveIncidents = false
}) {
  const centerLat = depot?.lat || 28.6139;
  const centerLng = depot?.lng || 77.2090;
  const [recenterCounter, setRecenterCounter] = useState(0);

  // Map layer visibility toggles
  const [layers, setLayers] = useState({
    routes: true,
    traffic: false, // Optional traffic overlay as requested
    stops: true,
    depot: true,
    arrows: true,
    drivers: true,
  });

  // Layer toggles menu dropdown
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Collapsible Legend State
  const [legendOpen, setLegendOpen] = useState(false);

  const toggleLayer = (key) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Directional chevrons along legs
  const directionalArrows = useMemo(() => {
    if (!layers.arrows || !vehicleRoutes || vehicleRoutes.length === 0) return [];
    const arrows = [];

    vehicleRoutes.forEach((vRoute, vIdx) => {
      const isDimmed = activeVehicleId !== null && activeVehicleId !== vRoute.vehicle_id;
      if (isDimmed) return;

      const palette = VEHICLE_PALETTE[vIdx % VEHICLE_PALETTE.length];

      vRoute.legs?.forEach((leg, legIdx) => {
        const coords = leg.path_coords || [];
        if (coords.length < 2) return;

        const step = Math.max(10, Math.floor(coords.length / 3));
        for (let idx = Math.floor(step / 2); idx < coords.length - 1; idx += step) {
          const p1 = coords[idx];
          const p2 = coords[idx + 1];
          const bearing = computeBearing(p1, p2);

          arrows.push({
            key: `arrow_${vIdx}_${legIdx}_${idx}`,
            lat: p1.lat,
            lng: p1.lng,
            bearing,
            color: palette.border
          });
        }
      });
    });

    return arrows;
  }, [vehicleRoutes, activeVehicleId, layers.arrows]);

  // Find active vehicle data for HUD
  const activeVehicleData = useMemo(() => {
    if (!activeVehicleId) return null;
    return vehicleRoutes?.find(v => v.vehicle_id === activeVehicleId) || null;
  }, [activeVehicleId, vehicleRoutes]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      
      {/* ── LEAFLET MAP CANVAS ────────────────────────────────────────── */}
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        style={{ height: '100%', width: '100%', background: '#0f141c' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapCenterController center={[centerLat, centerLng]} zoom={13} resetTrigger={recenterCounter} />
        <MapClickHandler onMapClick={onMapClick} />

        {isRealWorldMode ? (
          <>
            {/* 1. Operations Depot */}
            {layers.depot && depot && (
              <Marker position={[depot.lat, depot.lng]} icon={createDepotIcon()}>
                <Popup>
                  <div style={{ minWidth: '190px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{
                        background: 'rgba(37, 99, 235, 0.12)',
                        color: '#60a5fa',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 600,
                      }}>
                        Central hub
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc', marginBottom: '2px' }}>
                      {depot.name || 'Central Logistics Hub'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {depot.lat?.toFixed(4)}, {depot.lng?.toFixed(4)}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#10b981', borderTop: '1px solid #242e3f', paddingTop: '5px' }}>
                      Fleet dispatch and return point
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 2. Numbered Delivery Stops */}
            {layers.stops && deliveryPoints.map((pt, idx) => {
              const label = pt.label || `D${idx + 1}`;
              const meta = assignedMarkersInfo[label] || {};
              const assignedVeh = meta.assigned_vehicle || 1;
              const isSelected = selectedStopId === pt.id;
              const isDelivered = pt.status === 'Delivered';
              const isFailed = pt.status === 'Failed';

              return (
                <Marker
                  key={pt.id || `dp_${idx}`}
                  position={[pt.lat, pt.lng]}
                  icon={createNumberedDeliveryIcon(label, assignedVeh, pt.status, isSelected)}
                  eventHandlers={{
                    click: () => onSelectStop && onSelectStop(pt.id)
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '220px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc' }}>
                          Stop {label}
                        </span>
                        <span style={{
                          background: isDelivered ? 'rgba(16, 185, 129, 0.12)' : isFailed ? 'rgba(239, 68, 68, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                          color: isDelivered ? '#10b981' : isFailed ? '#ef4444' : '#60a5fa',
                          border: `1px solid ${isDelivered ? '#10b981' : isFailed ? '#ef4444' : '#3b82f6'}`,
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: '3px'
                        }}>
                          {isDelivered ? 'Delivered' : isFailed ? 'Failed' : `Unit ${assignedVeh}`}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
                        {pt.name}
                      </div>

                      {isFailed && (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '5px 8px',
                          borderRadius: '3px',
                          marginBottom: '6px',
                          fontSize: '11px',
                          color: '#f87171'
                        }}>
                          <strong>Exception:</strong> {pt.failed_reason || 'Undelivered'}<br/>
                          {pt.failed_at && <span style={{ fontSize: '10px', color: '#94a3b8' }}>Logged: {pt.failed_at}</span>}
                        </div>
                      )}

                      <div style={{
                        background: '#111622',
                        padding: '6px 8px',
                        borderRadius: '3px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        fontSize: '11px',
                        border: '1px solid #242e3f'
                      }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Sequence</span>
                          <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                            #{meta.sequence_index || (idx + 1)} of {meta.total_stops_in_vehicle || deliveryPoints.length}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Payload</span>
                          <span style={{ color: '#f8fafc', fontWeight: 500 }}>{pt.demand || 10} kg</span>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Estimated arrival</span>
                          <span style={{ color: '#60a5fa', fontWeight: 500 }}>
                            {meta.estimated_arrival_clock || `+${((idx + 1) * 12)} min`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* 3. Driver Fleet GPS Markers */}
            {layers.drivers && activeDrivers?.map((driver, dIdx) => {
              if (!driver.current_location?.lat || !driver.current_location?.lng) return null;
              return (
                <Marker
                  key={`active_driver_${driver.driver_id || dIdx}`}
                  position={[driver.current_location.lat, driver.current_location.lng]}
                  icon={createDriverTruckIcon(driver.driver_name, driver.vehicle, driver.route_color || '#10b981')}
                >
                  <Popup>
                    <div style={{ minWidth: '180px' }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc', marginBottom: '2px' }}>
                        {driver.driver_name} ({driver.driver_id})
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                        Assigned vehicle: <strong style={{ color: '#f8fafc' }}>{driver.vehicle}</strong><br/>
                        Status: <span style={{ color: driver.status === 'En Route' ? '#60a5fa' : '#10b981', fontWeight: 500 }}>{driver.status}</span><br/>
                        Completed stops: <strong>{driver.completed_count || 0} / {driver.total_stops || 0}</strong>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* 4. Solid Route Lines & Distinct Traffic Overlays */}
            {layers.routes && vehicleRoutes?.map((vRoute, vIdx) => {
              const palette = VEHICLE_PALETTE[vIdx % VEHICLE_PALETTE.length];
              const isSelected = activeVehicleId === vRoute.vehicle_id;
              const isDimmed = activeVehicleId !== null && !isSelected;

              if (!vRoute.polyline || vRoute.polyline.length === 0) return null;
              const fullPositions = vRoute.polyline.map(p => Array.isArray(p) ? [p[0], p[1]] : [p.lat, p.lng]);

              return (
                <React.Fragment key={`veh_route_${vIdx}`}>
                  {/* Clean, solid route line */}
                  <Polyline
                    positions={fullPositions}
                    color={palette.main}
                    weight={isSelected ? 5 : isDimmed ? 2 : 4}
                    opacity={isDimmed ? 0.2 : isSelected ? 0.95 : 0.75}
                    dashArray={isDimmed ? '4, 4' : null}
                    eventHandlers={{
                      click: () => onSelectVehicle && onSelectVehicle(isSelected ? null : vRoute.vehicle_id)
                    }}
                  />

                  {/* Optional Traffic Overlay - Distinct dashed congestion layer */}
                  {layers.traffic && vRoute.legs?.map((leg, legIdx) => {
                    const legPts = leg.path_coords?.map(p => [p.lat, p.lng]) || [];
                    if (legPts.length < 2) return null;
                    const trafficColor = getTrafficColor(leg);

                    return (
                      <Polyline
                        key={`leg_${vIdx}_${legIdx}`}
                        positions={legPts}
                        color={trafficColor}
                        weight={isSelected ? 3 : 2}
                        opacity={isDimmed ? 0.15 : 0.85}
                        dashArray="6, 6"
                        lineCap="round"
                        lineJoin="round"
                      >
                        <Popup>
                          <div style={{ minWidth: '190px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ color: palette.text, fontWeight: 600, fontSize: '12px' }}>
                                Unit {vRoute.vehicle_id} · Leg {legIdx + 1}
                              </span>
                              <span style={{
                                background: trafficColor,
                                color: '#000',
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: '2px'
                              }}>
                                {leg.traffic_condition || 'Traffic'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#cbd5e1', margin: '4px 0' }}>
                              {leg.from_name} ➔ {leg.to_name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                              Distance: <strong style={{ color: '#f8fafc' }}>{leg.distance_km} km</strong><br/>
                              Estimated time: <strong style={{ color: '#f8fafc' }}>{leg.travel_time_min} min</strong><br/>
                              Congestion: <strong style={{ color: trafficColor }}>{leg.congestion_pct}%</strong><br/>
                              ETA: <strong style={{ color: '#60a5fa' }}>{leg.estimated_arrival_clock}</strong>
                            </div>
                          </div>
                        </Popup>
                      </Polyline>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* 5. Direction Chevrons */}
            {directionalArrows.map((arrow) => (
              <Marker
                key={arrow.key}
                position={[arrow.lat, arrow.lng]}
                icon={createDirectionalArrowIcon(arrow.bearing, arrow.color)}
                interactive={false}
              />
            ))}
          </>
        ) : null}
      </MapContainer>

      {/* ── TOP-LEFT MAP TOOLBAR ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        zIndex: 1000,
        display: 'flex',
        gap: '6px',
        alignItems: 'center'
      }}>
        {/* Recenter Hub Button */}
        <button
          onClick={() => setRecenterCounter(c => c + 1)}
          style={{
            background: 'var(--bg-surface, #171d28)',
            border: '1px solid var(--border-subtle, #242e3f)',
            borderRadius: '4px',
            padding: '6px 10px',
            color: 'var(--text-secondary, #94a3b8)',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
          title="Center view on Operations Hub"
        >
          <Compass size={13} />
          <span>Center hub</span>
        </button>

        {/* Layers Dropdown Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowLayerMenu(m => !m)}
            style={{
              background: showLayerMenu ? 'var(--bg-surface-active, #273246)' : 'var(--bg-surface, #171d28)',
              border: '1px solid var(--border-subtle, #242e3f)',
              borderRadius: '4px',
              padding: '6px 10px',
              color: 'var(--text-secondary, #94a3b8)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}
          >
            <Layers size={13} />
            <span>Map layers</span>
            <ChevronDown size={12} />
          </button>

          {showLayerMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: 'var(--bg-surface-raised, #1f2737)',
              border: '1px solid var(--border-strong, #334158)',
              borderRadius: '4px',
              padding: '6px',
              minWidth: '170px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              zIndex: 1100
            }}>
              {[
                { key: 'routes', label: 'Vehicle routes' },
                { key: 'traffic', label: 'Traffic overlays' },
                { key: 'stops', label: 'Delivery stops' },
                { key: 'depot', label: 'Central hub' },
                { key: 'arrows', label: 'Direction chevrons' },
                { key: 'drivers', label: 'Driver GPS markers' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: layers[key] ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #64748b)',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface, #171d28)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={() => toggleLayer(key)}
                    style={{ margin: 0, cursor: 'pointer' }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Active Incident Indicator Badge */}
        {hasActiveIncidents && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-danger, #ef4444)',
            padding: '5px 9px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <AlertTriangle size={12} />
            <span>Incident active</span>
          </div>
        )}
      </div>

      {/* ── TOP-RIGHT COLLAPSIBLE LEGEND ───────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 1000,
        background: 'var(--bg-surface, #171d28)',
        border: '1px solid var(--border-subtle, #242e3f)',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        maxWidth: '220px',
        overflow: 'hidden'
      }}>
        <div
          onClick={() => setLegendOpen(o => !o)}
          style={{
            padding: '7px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-secondary, #94a3b8)',
            background: legendOpen ? 'var(--bg-surface-raised, #1f2737)' : 'transparent',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} />
            <span>Map legend</span>
          </div>
          {legendOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>

        {legendOpen && (
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle, #242e3f)' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted, #64748b)', marginBottom: '4px' }}>
                Congestion level
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '3px', borderRadius: '1px', background: '#10b981' }}/>
                  <span>&lt; 35% Free flow</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '3px', borderRadius: '1px', background: '#f59e0b' }}/>
                  <span>35–65% Moderate delay</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '3px', borderRadius: '1px', background: '#ef4444' }}/>
                  <span>&gt; 65% Heavy congestion</span>
                </div>
              </div>
            </div>

            {vehicleRoutes && vehicleRoutes.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle, #242e3f)', paddingTop: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted, #64748b)', marginBottom: '4px' }}>
                  Fleet units
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {vehicleRoutes.map((v, i) => {
                    const pal = VEHICLE_PALETTE[i % VEHICLE_PALETTE.length];
                    const isStandby = !v.assigned_stops || v.assigned_stops.length === 0;
                    const isSelected = activeVehicleId === v.vehicle_id;
                    return (
                      <div
                        key={i}
                        onClick={() => onSelectVehicle && onSelectVehicle(isSelected ? null : v.vehicle_id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: isSelected ? pal.text : 'var(--text-secondary, #94a3b8)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          background: isSelected ? pal.bgSubtle : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: pal.main }}/>
                          <span>Unit {v.vehicle_id}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
                          {isStandby ? 'Standby' : `${v.assigned_stops.length} stops`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DOCKED SELECTED VEHICLE BAR ─────────────────────────────────── */}
      {activeVehicleData && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          zIndex: 1000,
          background: 'var(--bg-surface, #171d28)',
          border: '1px solid var(--border-strong, #334158)',
          borderRadius: '4px',
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: VEHICLE_PALETTE[(activeVehicleData.vehicle_id - 1) % VEHICLE_PALETTE.length]?.main || '#3b82f6'
            }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary, #f8fafc)' }}>
                Unit {activeVehicleData.vehicle_id} highlighted
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                {activeVehicleData.assigned_stops?.length || 0} stops assigned
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
              <div>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>Distance: </span>
                <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{activeVehicleData.total_distance_km || 0} km</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>Time: </span>
                <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{activeVehicleData.total_time_min || 0} min</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>Cost: </span>
                <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>₹{activeVehicleData.total_op_cost_inr?.toFixed(0) || 0}</strong>
              </div>
            </div>

            <button
              onClick={() => onSelectVehicle(null)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle, #242e3f)',
                borderRadius: '3px',
                color: 'var(--text-secondary, #94a3b8)',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <X size={12} />
              <span>Show all fleet</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
