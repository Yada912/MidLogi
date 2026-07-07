import React, { useState, useEffect } from 'react';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { LOCATION_PRESETS, PACKAGE_SIZES, CATEGORIES } from '../../../lib/mockData';
import type { DriverRoute, UserProfile } from '../../../lib/storage';
import type { Coordinate } from '../../../lib/mockData';
import * as api from '../../../lib/api';

interface AngkutProps {
  navigate: (screen: string) => void;
  userProfile: UserProfile;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Makanan':    'restaurant',
  'Elektronik': 'devices',
  'Dokumen':    'description',
  'Pakaian':    'checkroom',
  'Lainnya':    'category',
};

const HANDLING_OPTIONS = [
  { key: 'Jaga dari Air',  icon: 'water_drop',         label: 'Jaga dari Air' },
  { key: 'Mudah Pecah',    icon: 'crisis_alert',        label: 'Mudah Pecah'  },
  { key: 'Harus Tegak',    icon: 'vertical_align_top',  label: 'Harus Tegak'  },
  { key: 'Jaga Suhu',      icon: 'ac_unit',             label: 'Jaga Suhu'    },
];

export const Angkut: React.FC<AngkutProps> = ({ navigate, userProfile }) => {
  const [departureTime,       setDepartureTime]       = useState('08:00');
  const [waypoints,           setWaypoints]           = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [maxPackets,          setMaxPackets]          = useState(3);
  const [maxPackageSize,      setMaxPackageSize]      = useState<'XS'|'S'|'M'|'L'|'XL'>('L');
  const [acceptedCategories,  setAcceptedCategories]  = useState<string[]>(['Dokumen', 'Pakaian', 'Makanan']);
  const [acceptedHandling,    setAcceptedHandling]    = useState<string[]>([]);
  const [mapPickIndex,        setMapPickIndex]        = useState<number|null>(null);

  // Saved driver routes state
  const [saveRouteName, setSaveRouteName] = useState('');
  const [savedDriverRoutes, setSavedDriverRoutes] = useState<any[]>([]);

  // Load saved route on mount
  useEffect(() => {
    api.fetchDriverRoute(userProfile.id).then(route => {
      if (route && route.waypoints.length > 0) {
        setDepartureTime(route.departureTime);
        setWaypoints(route.waypoints);
        setMaxPackets(route.maxPackets);
        setMaxPackageSize(route.maxPackageSize);
        setAcceptedCategories(route.acceptedCategories);
      } else {
        setWaypoints([
          { name: 'Rumah (Kebayoran Baru)', lat: -6.2442, lng: 106.7973 },
          { name: 'Kuningan (Kantor)',      lat: -6.2230, lng: 106.8294 },
        ]);
      }
    });
  }, [userProfile.id]);

  // Sync saved route presets from localStorage (UI-only, per-browser)
  useEffect(() => {
    const local = localStorage.getItem('kirimin_saved_driver_routes');
    if (local) {
      setSavedDriverRoutes(JSON.parse(local));
    }
  }, []);

  const addWaypoint = () => {
    const unused = LOCATION_PRESETS.find(p => !waypoints.some(w => Math.abs(w.lat - p.lat) < 0.001))
      || LOCATION_PRESETS[0];
    setWaypoints(prev => [...prev, { name: unused.name, lat: unused.lat, lng: unused.lng }]);
  };

  const removeWaypoint = (idx: number) => {
    if (waypoints.length <= 2) { alert('Minimal 2 titik (keberangkatan & tujuan akhir).'); return; }
    setWaypoints(prev => prev.filter((_, i) => i !== idx));
    if (mapPickIndex === idx) setMapPickIndex(null);
  };

  const changeWaypointPreset = (idx: number, presetId: string) => {
    const preset = LOCATION_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setWaypoints(prev => prev.map((w, i) => i === idx ? { name: preset.name, lat: preset.lat, lng: preset.lng } : w));
  };

  const handleMapPickSelect = (coord: Coordinate, address: string, _type: 'pickup'|'dropoff') => {
    if (mapPickIndex === null) return;
    const shortName = address.split(',').slice(0, 2).join(',');
    setWaypoints(prev => prev.map((w, i) => i === mapPickIndex ? { name: shortName, lat: coord.lat, lng: coord.lng } : w));
    setMapPickIndex(null);
  };

  const handleSaveRoute = (e: React.MouseEvent) => {
    e.preventDefault();
    if (waypoints.length < 2) {
      alert('Tentukan rute dengan minimal 2 titik.');
      return;
    }
    if (!saveRouteName.trim()) {
      alert('Masukkan nama rute.');
      return;
    }
    const newRoute = {
      id: 'dr_' + Date.now(),
      name: saveRouteName.trim(),
      waypoints,
      departureTime,
    };
    const updated = [newRoute, ...savedDriverRoutes];
    setSavedDriverRoutes(updated);
    localStorage.setItem('kirimin_saved_driver_routes', JSON.stringify(updated));
    setSaveRouteName('');
    alert('Rute harian berhasil disimpan!');
  };

  const handleLoadRoute = (r: any) => {
    setWaypoints(r.waypoints);
    setDepartureTime(r.departureTime);
  };

  const handleDeleteRoute = (id: string) => {
    const updated = savedDriverRoutes.filter(r => r.id !== id);
    setSavedDriverRoutes(updated);
    localStorage.setItem('kirimin_saved_driver_routes', JSON.stringify(updated));
  };

  const toggleCategory  = (cat: string)  => setAcceptedCategories(p  => p.includes(cat)  ? p.filter(x => x !== cat)  : [...p, cat]);
  const toggleHandling  = (key: string)  => setAcceptedHandling(p    => p.includes(key)  ? p.filter(x => x !== key)  : [...p, key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (waypoints.length < 2) { alert('Minimal 2 titik.'); return; }
    if (acceptedCategories.length === 0) { alert('Pilih minimal satu kategori.'); return; }

    const routeData: DriverRoute = {
      departureTime,
      waypoints,
      maxPackets,
      maxPackageSize,
      acceptedCategories,
      active: true,
    };
    try {
      await api.upsertDriverRoute(userProfile.id, routeData);
      navigate('AngkutDash');
    } catch (err: any) {
      alert('Gagal mengaktifkan rute: ' + err.message);
    }
  };

  return (
    <div className="screen-content">
      {/* Header */}
      <div className="screen-header" style={{ margin: '-20px -20px 0 -20px' }}>
        <button onClick={() => navigate('Homepage')} className="back-pill">
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="header-title" style={{ fontWeight: 700, fontSize: '17px' }}>Mau ke mana hari ini?</h1>
      </div>

      {/* Map preview */}
      <MapPlaceholder
        points={waypoints}
        labels={waypoints.map((w, i) => `${i + 1}. ${w.name}`)}
        height="200px"
        interactive={true}
        pickMode={mapPickIndex !== null ? 'pickup' : null}
        onLocationSelect={handleMapPickSelect}
      />

      {/* ── Saved Route List ── */}
      {savedDriverRoutes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>📂 Kelola Preset Rute Harian</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {savedDriverRoutes.map(r => (
              <div
                key={r.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                  padding: '8px 12px',
                }}
              >
                <div onClick={() => handleLoadRoute(r)} style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons" style={{ fontSize: '16px', color: '#10b981' }}>map</span>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>{r.name}</span>
                    <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>
                      {r.waypoints.length} titik | Jam {r.departureTime}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteRoute(r.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '6px' }}
                >
                  <span className="material-icons" style={{ fontSize: '16px', color: '#ef4444' }}>delete_outline</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Jam Keberangkatan ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-icons" style={{ fontSize: '16px', color: '#2091e7' }}>schedule</span>
            Jam Keberangkatan <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} className="form-input" required />

          {/* Quick time presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[['07:00', '07.00'], ['08:00', '08.00'], ['12:00', '12.00'], ['17:00', '17.00']].map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setDepartureTime(val)}
                style={{
                  padding: '5px 12px', borderRadius: '10px',
                  border: `1.5px solid ${departureTime === val ? '#2091e7' : '#e2e8f0'}`,
                  background: departureTime === val ? '#e8f4ff' : '#fff',
                  color: departureTime === val ? '#2091e7' : '#64748b',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* ── Waypoints ── */}
        <div className="form-group" style={{ gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
              Alur Rute Perjalanan
            </label>
            <button
              type="button"
              onClick={addWaypoint}
              style={{ background: 'none', border: 'none', color: '#2091e7', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span className="material-icons" style={{ fontSize: '16px' }}>add_circle</span>
              Tambah tujuan
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {waypoints.map((wp, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Number badge */}
                <div className="waypoint-badge">{idx + 1}</div>

                {/* Preset select */}
                <select
                  value={LOCATION_PRESETS.find(p => Math.abs(p.lat - wp.lat) < 0.001 && Math.abs(p.lng - wp.lng) < 0.001)?.id || ''}
                  onChange={e => changeWaypointPreset(idx, e.target.value)}
                  className="form-select"
                  style={{ flex: 1 }}
                >
                  <option value="" disabled>{wp.name || 'Pilih lokasi...'}</option>
                  {LOCATION_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Map pick button */}
                <button
                  type="button"
                  onClick={() => setMapPickIndex(mapPickIndex === idx ? null : idx)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: `1.5px solid ${mapPickIndex === idx ? '#2091e7' : '#e2e8f0'}`,
                    background: mapPickIndex === idx ? '#e8f4ff' : '#fff',
                    color: mapPickIndex === idx ? '#2091e7' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '16px' }}>map</span>
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeWaypoint(idx)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: '1.5px solid #fca5a5', background: '#fef2f2',
                    color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '16px' }}>remove</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Jumlah Paket Maks ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Jumlah Paket Maksimum
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setMaxPackets(p => Math.max(1, p - 1))}
              style={{
                width: '40px', height: '40px', borderRadius: '12px',
                border: '2px solid #e2e8f0', background: '#f8fafc',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '20px', fontWeight: 700, color: '#2091e7',
              }}
            >
              −
            </button>
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b' }}>{maxPackets}</span>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                {maxPackets === 1 ? 'Paket' : 'Paket'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaxPackets(p => Math.min(10, p + 1))}
              style={{
                width: '40px', height: '40px', borderRadius: '12px',
                border: '2px solid #2091e7', background: '#e8f4ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '20px', fontWeight: 700, color: '#2091e7',
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* ── Ukuran Maks ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Ukuran Paket Maksimal
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {PACKAGE_SIZES.map(sz => {
              const active = maxPackageSize === sz.value;
              return (
                <div
                  key={sz.value}
                  onClick={() => setMaxPackageSize(sz.value as 'XS'|'S'|'M'|'L'|'XL')}
                  style={{
                    flex: 1, textAlign: 'center', padding: '10px 4px',
                    borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${active ? '#2091e7' : '#e2e8f0'}`,
                    background: active ? '#2091e7' : '#ffffff',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 800, color: active ? '#fff' : '#334155' }}>
                    {sz.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Kategori ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Kategori Barang Diterima
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {CATEGORIES.map(cat => {
              const active = acceptedCategories.includes(cat);
              return (
                <div
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '10px 4px', borderRadius: '14px', cursor: 'pointer',
                    border: `2px solid ${active ? '#2091e7' : '#e2e8f0'}`,
                    background: active ? '#e8f4ff' : '#ffffff',
                    transition: 'all 0.2s',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '22px', color: active ? '#2091e7' : '#94a3b8' }}>
                    {CATEGORY_ICONS[cat] ?? 'category'}
                  </span>
                  <span style={{ fontSize: '8px', fontWeight: 600, color: active ? '#2091e7' : '#64748b', textAlign: 'center', lineHeight: 1.2 }}>
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Handling yg Diterima ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Penanganan Khusus Diterima
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {HANDLING_OPTIONS.map(opt => {
              const active = acceptedHandling.includes(opt.key);
              return (
                <div
                  key={opt.key}
                  onClick={() => toggleHandling(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 12px', borderRadius: '20px', cursor: 'pointer',
                    border: `1.5px solid ${active ? '#2091e7' : '#e2e8f0'}`,
                    background: active ? '#e8f4ff' : '#ffffff',
                    color: active ? '#2091e7' : '#64748b',
                    fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '15px' }}>{opt.icon}</span>
                  {opt.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Save driver route preset card ── */}
        {waypoints.length >= 2 && (
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Simpan Preset Rute Driver</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Nama Preset Rute (e.g. Pulang Kerja)"
                value={saveRouteName}
                onChange={e => setSaveRouteName(e.target.value)}
                className="form-input"
                style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
              />
              <button
                type="button"
                onClick={handleSaveRoute}
                className="btn-primary"
                style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', background: 'linear-gradient(135deg, #34d399, #059669)' }}
              >
                Simpan
              </button>
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
          Lanjut ke Dashboard
          <span className="material-icons">arrow_forward</span>
        </button>
      </form>
    </div>
  );
};
export default Angkut;
