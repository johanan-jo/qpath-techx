import React, { useState } from 'react';
import {
  Package, Search, Plus, Trash2, ArrowUp, ArrowDown,
  Building2, Compass, X, Check, MapPin, Sliders
} from 'lucide-react';
import { searchAddress } from '../services/api';

export default function DeliveryModal({
  isOpen,
  onClose,
  depot,
  deliveryPoints = [],
  onAddPoint,
  onRemovePoint,
  onReorderPoint,
  onClearAll,
  onOptimize,
  geoStatus,
  onRequestGps
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualDemand, setManualDemand] = useState('15');

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchAddress(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSelectResult = (res) => {
    onAddPoint({
      id: `d_${Date.now()}`,
      name: res.short_name || res.name,
      lat: res.lat,
      lng: res.lng,
      demand: 15.0
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddManual = (e) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates.');
      return;
    }
    onAddPoint({
      id: `d_${Date.now()}`,
      name: manualName.trim() || `Stop (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      lat,
      lng,
      demand: parseFloat(manualDemand) || 15.0
    });
    setManualName('');
    setManualLat('');
    setManualLng('');
    setShowManualForm(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 7, 12, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 9000,
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
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8)',
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
              background: 'var(--color-primary-subtle, rgba(37, 99, 235, 0.12))',
              color: 'var(--color-primary, #2563eb)'
            }}>
              <Package size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>
                Delivery Waypoints & Stops Configuration
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                Manage destination geolocations, package payload demands, and route sequence
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

        {/* Modal Body */}
        <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Starting Depot Card */}
          <div style={{
            background: 'var(--bg-canvas, #0f141c)',
            border: '1px solid var(--border-subtle, #242e3f)',
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building2 size={18} style={{ color: 'var(--color-primary, #2563eb)' }} />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                  Central depot / hub (origin)
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                  {depot?.name || 'Central Logistics Hub'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono)' }}>
                  {depot?.lat?.toFixed(4)}, {depot?.lng?.toFixed(4)}
                </div>
              </div>
            </div>

            <button
              onClick={onRequestGps}
              style={{
                background: geoStatus === 'granted' ? 'var(--color-success-subtle, rgba(16, 185, 129, 0.12))' : 'var(--bg-surface-raised, #1f2737)',
                border: `1px solid ${geoStatus === 'granted' ? 'var(--color-success, #10b981)' : 'var(--border-strong, #334158)'}`,
                color: geoStatus === 'granted' ? 'var(--color-success, #10b981)' : 'var(--text-secondary, #94a3b8)',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Compass size={12} />
              <span>{geoStatus === 'granted' ? 'GPS Calibrated' : 'Calibrate GPS'}</span>
            </button>
          </div>

          {/* Search Place / Address */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
              Add Stop via OpenStreetMap Address Search:
            </label>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Search landmark, street, or market (e.g. Connaught Place, India Gate)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle, #242e3f)',
                  background: 'var(--bg-canvas, #0f141c)',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '12px'
                }}
              />
              <button
                type="submit"
                disabled={searching}
                style={{
                  padding: '8px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'var(--color-primary, #2563eb)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Search size={13} />
                <span>{searching ? 'Searching...' : 'Search'}</span>
              </button>
            </form>

            {searchResults.length > 0 && (
              <div style={{
                marginTop: '4px',
                background: 'var(--bg-canvas, #0f141c)',
                border: '1px solid var(--border-strong, #334158)',
                borderRadius: '4px',
                maxHeight: '160px',
                overflowY: 'auto'
              }}>
                {searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectResult(res)}
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid var(--border-subtle, #242e3f)',
                      fontSize: '11px',
                      color: 'var(--text-primary, #f8fafc)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-raised, #1f2737)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <strong>+ {res.short_name}</strong>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>{res.name}</div>
                    </div>
                    <span style={{ color: 'var(--color-primary, #2563eb)', fontWeight: 600 }}>Select</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Coordinate Input Bar Toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowManualForm(!showManualForm)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-info, #0284c7)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 0'
              }}
            >
              {showManualForm ? 'Hide Coordinate Form' : '+ Add via GPS Coordinates'}
            </button>
          </div>

          {showManualForm && (
            <form onSubmit={handleAddManual} style={{
              background: 'var(--bg-canvas, #0f141c)',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle, #242e3f)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <input
                type="text"
                placeholder="Waypoint Name (e.g. Zone 4 Distribution Center)"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle, #242e3f)', background: 'var(--bg-surface, #171d28)', color: '#fff', fontSize: '11px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number" step="any" placeholder="Latitude (e.g. 28.6129)"
                  value={manualLat} onChange={(e) => setManualLat(e.target.value)} required
                  style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle, #242e3f)', background: 'var(--bg-surface, #171d28)', color: '#fff', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                />
                <input
                  type="number" step="any" placeholder="Longitude (e.g. 77.2295)"
                  value={manualLng} onChange={(e) => setManualLng(e.target.value)} required
                  style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle, #242e3f)', background: 'var(--bg-surface, #171d28)', color: '#fff', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                />
                <input
                  type="number" min="1" max="500" placeholder="Demand kg"
                  value={manualDemand} onChange={(e) => setManualDemand(e.target.value)}
                  style={{ width: '80px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle, #242e3f)', background: 'var(--bg-surface, #171d28)', color: '#fff', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '6px 10px',
                  borderRadius: '3px',
                  border: 'none',
                  background: 'var(--color-primary, #2563eb)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer',
                  alignSelf: 'flex-start'
                }}
              >
                + Append Stop
              </button>
            </form>
          )}

          {/* Current Stops List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                Configured Stops ({deliveryPoints.length})
              </span>
              {deliveryPoints.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-danger, #ef4444)', fontSize: '11px', cursor: 'pointer' }}
                >
                  Clear All
                </button>
              )}
            </div>

            {deliveryPoints.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-muted, #64748b)',
                fontSize: '12px',
                border: '1px dashed var(--border-subtle, #242e3f)',
                borderRadius: '6px'
              }}>
                No stops added yet. Search an address, enter GPS coordinates, or click directly on the live map canvas.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                {deliveryPoints.map((pt, idx) => (
                  <div
                    key={pt.id || idx}
                    style={{
                      background: 'var(--bg-canvas, #0f141c)',
                      border: '1px solid var(--border-subtle, #242e3f)',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-primary, #2563eb)',
                      background: 'var(--color-primary-subtle, rgba(37, 99, 235, 0.12))',
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }}>
                      D{idx + 1}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pt.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono)' }}>
                        {pt.lat?.toFixed(4)}, {pt.lng?.toFixed(4)} · Payload: {pt.demand || 10} kg
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onReorderPoint(idx, idx - 1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: idx === 0 ? 'var(--border-strong, #334158)' : 'var(--text-secondary, #94a3b8)',
                          padding: '2px 4px',
                          cursor: idx === 0 ? 'default' : 'pointer'
                        }}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === deliveryPoints.length - 1}
                        onClick={() => onReorderPoint(idx, idx + 1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: idx === deliveryPoints.length - 1 ? 'var(--border-strong, #334158)' : 'var(--text-secondary, #94a3b8)',
                          padding: '2px 4px',
                          cursor: idx === deliveryPoints.length - 1 ? 'default' : 'pointer'
                        }}
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemovePoint(idx)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #64748b)', cursor: 'pointer', padding: '2px 4px' }}
                      title="Remove stop"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border-subtle, #242e3f)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface, #171d28)'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
            {deliveryPoints.length} total waypoints active
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 12px',
                background: 'transparent',
                border: '1px solid var(--border-subtle, #242e3f)',
                borderRadius: '4px',
                color: 'var(--text-secondary, #94a3b8)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={onOptimize}
              disabled={deliveryPoints.length === 0}
              style={{
                padding: '7px 14px',
                background: 'var(--color-primary, #2563eb)',
                border: 'none',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: deliveryPoints.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Apply & Run QPSO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
