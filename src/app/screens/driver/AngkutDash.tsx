import React, { useState, useEffect } from 'react';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import type { Package, UserProfile, DriverRoute } from '../../../lib/storage';
import { findBestDetour } from '../../../lib/matching';
import * as api from '../../../lib/api';

interface AngkutDashProps {
  navigate: (screen: string) => void;
  packages: Package[];
  userProfile: UserProfile;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Makanan': 'restaurant',
  'Elektronik': 'devices',
  'Dokumen': 'description',
  'Pakaian': 'checkroom',
  'Lainnya': 'category',
};

const HANDLING_ICONS: Record<string, string> = {
  'Jaga dari Air': 'water_drop',
  'Mudah Pecah': 'crisis_alert',
  'Harus Tegak': 'vertical_align_top',
  'Jaga Suhu': 'ac_unit',
};

const SIZE_COLORS: Record<string, string> = {
  XS: '#10b981', S: '#3b82f6', M: '#f59e0b', L: '#d97706', XL: '#ef4444',
};

// All saved driver routes from localStorage (per-browser preset system)
function getSavedDriverRoutes(): any[] {
  try {
    const local = localStorage.getItem('kirimin_saved_driver_routes');
    return local ? JSON.parse(local) : [];
  } catch { return []; }
}

export const AngkutDash: React.FC<AngkutDashProps> = ({ navigate, packages, userProfile }) => {
  const [route, setRoute] = useState<DriverRoute>({
    departureTime: '08:00', waypoints: [], maxPackets: 3,
    maxPackageSize: 'L', acceptedCategories: [], active: false,
  });
  const [matchingPackages, setMatchingPackages] = useState<any[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'rute' | 'paket'>('rute');

  // UI States
  const [mapExpanded, setMapExpanded] = useState(true);
  const [hoveredMatch, setHoveredMatch] = useState<any | null>(null);

  // Load driver route from DB
  useEffect(() => {
    api.fetchDriverRoute(userProfile.id).then(r => {
      if (r) setRoute(r);
    });
  }, [userProfile.id]);

  // Load saved route presets from localStorage
  useEffect(() => {
    setSavedRoutes(getSavedDriverRoutes());
  }, []);

  useEffect(() => {
    if (!route.active || route.waypoints.length < 2) return;

    const matches: any[] = [];

    packages.forEach(pkg => {
      const sizeHierarchy = ['XS', 'S', 'M', 'L', 'XL'];
      const driverMaxIdx = sizeHierarchy.indexOf(route.maxPackageSize);
      const pkgIdx = sizeHierarchy.indexOf(pkg.weightSize);
      if (pkgIdx > driverMaxIdx) return;

      if (pkg.driverId === userProfile.id) {
        const m = findBestDetour(route.waypoints, pkg.pickupCoords, pkg.dropoffCoords);
        matches.push({ package: pkg, match: m, accepted: true });
        return;
      }
      if (pkg.status === 'Mencari Driver') {
        const m = findBestDetour(route.waypoints, pkg.pickupCoords, pkg.dropoffCoords);
        if (m.isMatch) matches.push({ package: pkg, match: m, accepted: false });
      }
    });

    setMatchingPackages(matches);
  }, [packages, userProfile.id, route]);

  const handleAcceptPackage = async (pkgId: string) => {
    const acceptedCount = packages.filter(p => p.driverId === userProfile.id && p.status !== 'Telah Tiba' && p.status !== 'Dibatalkan').length;
    if (acceptedCount >= route.maxPackets) {
      alert(`Bagasi penuh! Maks ${route.maxPackets} paket.`);
      return;
    }
    try {
      await api.updatePackage(pkgId, {
        status: 'Menunggu Pick-up',
        driverId: userProfile.id,
        driverName: userProfile.name,
        driverPhone: userProfile.phone,
        driverAvatar: userProfile.avatar ?? null,
        driverVehicle: userProfile.vehicle ? `${userProfile.vehicle.type} (${userProfile.vehicle.color})` : 'Motor',
        driverPlate: userProfile.vehicle?.plate ?? 'B 0000 XYZ',
      });
    } catch (err: any) {
      alert('Gagal menerima paket: ' + err.message);
    }
  };

  const handleAutoReroute = async (pkg: Package, insertPickupIdx: number, insertDropoffIdx: number) => {
    const newWaypoints = [...route.waypoints];
    newWaypoints.splice(insertPickupIdx, 0, {
      name: `Jemput: ${pkg.category} (${pkg.pickupAddress.split(',')[0]})`,
      lat: pkg.pickupCoords.lat, lng: pkg.pickupCoords.lng,
    });
    newWaypoints.splice(insertDropoffIdx, 0, {
      name: `Antar: ${pkg.category} (${pkg.dropoffAddress.split(',')[0]})`,
      lat: pkg.dropoffCoords.lat, lng: pkg.dropoffCoords.lng,
    });
    const updatedRoute = { ...route, waypoints: newWaypoints };
    try {
      await api.upsertDriverRoute(userProfile.id, updatedRoute);
      setRoute(updatedRoute);
    } catch (err: any) {
      alert('Gagal menyisipkan rute: ' + err.message);
    }
  };

  // Load a saved preset route as the active route
  const handleActivatePreset = async (preset: any) => {
    if (route.active) {
      if (!confirm(`Anda sedang dalam rute aktif! Mengaktifkan rute baru akan menggantikan rute "${route.waypoints[0]?.name?.split(' ')[0] || ''} → ${route.waypoints[route.waypoints.length - 1]?.name?.split(' ')[0] || ''}". Lanjutkan?`)) return;
    }
    const newRoute: DriverRoute = {
      departureTime: preset.departureTime || '08:00',
      waypoints: preset.waypoints,
      maxPackets: route.maxPackets,
      maxPackageSize: route.maxPackageSize,
      acceptedCategories: route.acceptedCategories.length > 0 ? route.acceptedCategories : ['Dokumen', 'Pakaian', 'Makanan'],
      active: false, // Don't auto-start; let user press "Mulai Rute"
    };
    try {
      await api.upsertDriverRoute(userProfile.id, newRoute);
      setRoute(newRoute);
      setActiveView('paket');
      alert(`Rute "${preset.name}" dipilih! Tekan "Mulai Rute" untuk mulai menerima paket.`);
    } catch (err: any) {
      alert('Gagal memilih rute: ' + err.message);
    }
  };

  const handleStartRoute = async () => {
    if (route.waypoints.length < 2) {
      alert('Rute harus memiliki minimal 2 titik.');
      return;
    }
    const updatedRoute = { ...route, active: true };
    try {
      await api.upsertDriverRoute(userProfile.id, updatedRoute);
      setRoute(updatedRoute);
    } catch (err: any) {
      alert('Gagal memulai rute: ' + err.message);
    }
  };

  const handleStopAccepting = async () => {
    if (!confirm('Berhenti menerima paket? Rute akan dianggap selesai dan dihapus.')) return;
    const updatedRoute = { ...route, active: false };
    try {
      await api.upsertDriverRoute(userProfile.id, updatedRoute);
      setRoute(updatedRoute);
      navigate('Angkut');
    } catch (err: any) {
      alert('Gagal menghentikan rute: ' + err.message);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 15 && mapExpanded) {
      setMapExpanded(false);
    } else if (target.scrollTop <= 0 && !mapExpanded) {
      setMapExpanded(true);
    }
  };

  const myAcceptedPackages = matchingPackages.filter(m => m.accepted);
  const availableMatches = matchingPackages.filter(m => !m.accepted);
  const directMatches = availableMatches.filter(m => m.match.detourDistance <= 0.8);
  const detourMatches = availableMatches.filter(m => m.match.detourDistance > 0.8);

  const hasActiveRoute = route.waypoints.length >= 2;

  const PackageChip = ({ item, showAccept }: { item: any; showAccept?: boolean }) => {
    const pkg: Package = item.package;
    const score = item.match.score;
    const detourKm = item.match.detourDistance;
    const isDirect = detourKm <= 0.8;

    return (
      <div
        onMouseEnter={() => setHoveredMatch(item)}
        onMouseLeave={() => setHoveredMatch(null)}
        onClick={() => setHoveredMatch(hoveredMatch?.package?.id === pkg.id ? null : item)}
        style={{
          padding: '12px', borderRadius: '16px',
          border: `1.5px solid ${hoveredMatch?.package?.id === pkg.id ? '#3b82f6' : (showAccept && !isDirect ? '#fde68a' : '#e2e8f0')}`,
          background: item.accepted ? '#f0fdf4' : (hoveredMatch?.package?.id === pkg.id ? '#f0f9ff' : '#ffffff'),
          display: 'flex', flexDirection: 'column', gap: '8px',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: hoveredMatch?.package?.id === pkg.id ? '0 4px 15px rgba(59,130,246,0.15)' : 'none',
        }}
      >
        {/* Score badge */}
        <div style={{
          position: 'absolute', top: '8px', right: '8px',
          background: isDirect ? '#d1fae5' : '#fef3c7',
          color: isDirect ? '#065f46' : '#92400e',
          fontSize: '9px', fontWeight: 800,
          padding: '2px 6px', borderRadius: '6px',
        }}>
          {isDirect ? 'Langsung' : `${score}%`}
        </div>

        {/* Category icon + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: `${SIZE_COLORS[pkg.weightSize] || '#64748b'}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-icons" style={{ fontSize: '18px', color: SIZE_COLORS[pkg.weightSize] || '#64748b' }}>
              {CATEGORY_ICONS[pkg.category] ?? 'category'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pkg.category}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '9px', background: SIZE_COLORS[pkg.weightSize], color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                {pkg.weightSize}
              </span>
              {pkg.handling?.slice(0, 2).map(h => (
                <span key={h} className="material-icons" style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {HANDLING_ICONS[h] ?? 'warning'}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Address route */}
        <div style={{ fontSize: '10px', color: '#64748b' }}>
          <span>📍 {pkg.pickupAddress.split(',')[0]}</span><br />
          <span>🏁 {pkg.dropoffAddress.split(',')[0]}</span>
        </div>

        {/* Price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#2091e7' }}>
            Rp {(pkg.price + (pkg.detourFee || 0)).toLocaleString('id-ID')}
          </span>
          {!isDirect && (
            <span style={{ fontSize: '10px', color: '#92400e', fontWeight: 600 }}>+{detourKm}km</span>
          )}
        </div>

        {/* Accept button */}
        {showAccept && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAcceptPackage(pkg.id);
            }}
            style={{
              width: '100%', padding: '7px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
              color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Ambil Paket
          </button>
        )}

        {/* Auto-reroute button */}
        {item.accepted && !route.waypoints.some(w => Math.abs(w.lat - pkg.pickupCoords.lat) < 0.001) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAutoReroute(pkg, item.match.insertIndexPickup, item.match.insertIndexDropoff);
            }}
            style={{
              width: '100%', padding: '6px', borderRadius: '10px',
              border: '1.5px solid #bfdbfe', background: '#eff6ff',
              color: '#2563eb', fontSize: '10px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            }}
          >
            <span className="material-icons" style={{ fontSize: '13px' }}>alt_route</span>
            Sisipkan ke Rute
          </button>
        )}
      </div>
    );
  };

  // ── RUTE CARDS VIEW ──────────────────────────────────────────────────────
  const RouteCard = ({ preset, isCurrent }: { preset: any; isCurrent: boolean }) => (
    <div
      style={{
        borderRadius: '20px',
        border: `2px solid ${isCurrent ? '#10b981' : '#e2e8f0'}`,
        background: isCurrent ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : '#ffffff',
        overflow: 'hidden',
        transition: 'all 0.2s',
        boxShadow: isCurrent ? '0 4px 16px rgba(16,185,129,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Card header */}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${isCurrent ? '#86efac' : '#f1f5f9'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px',
            background: isCurrent ? 'linear-gradient(135deg, #34d399, #059669)' : 'linear-gradient(135deg, #8eadf0, #2091e7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span className="material-icons" style={{ fontSize: '20px', color: '#fff' }}>
              {isCurrent ? 'navigation' : 'route'}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preset.name}
            </p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
              {preset.waypoints?.length || 0} titik · Jam {preset.departureTime || '08:00'}
            </p>
          </div>
        </div>
        {isCurrent && route.active && (
          <span style={{
            fontSize: '10px', fontWeight: 700,
            color: '#065f46', background: '#d1fae5',
            padding: '3px 10px', borderRadius: '20px',
            border: '1px solid #86efac', flexShrink: 0,
          }}>
            ● Aktif
          </span>
        )}
        {isCurrent && !route.active && (
          <span style={{
            fontSize: '10px', fontWeight: 700,
            color: '#92400e', background: '#fef3c7',
            padding: '3px 10px', borderRadius: '20px',
            border: '1px solid #fde68a', flexShrink: 0,
          }}>
            Terpilih
          </span>
        )}
      </div>

      {/* Waypoint list */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {preset.waypoints?.slice(0, 3).map((wp: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: i === 0 ? '#10b981' : i === preset.waypoints.length - 1 ? '#ef4444' : '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <span style={{ fontSize: '12px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {wp.name}
            </span>
          </div>
        ))}
        {(preset.waypoints?.length || 0) > 3 && (
          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '28px' }}>
            +{preset.waypoints.length - 3} titik lainnya
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px' }}>
        {!isCurrent ? (
          <button
            onClick={() => handleActivatePreset(preset)}
            style={{
              flex: 1, padding: '9px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
              color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>play_circle</span>
            Pilih Rute Ini
          </button>
        ) : (
          <>
            {/* Start route (if not yet started) */}
            {!route.active && (
              <button
                onClick={handleStartRoute}
                style={{
                  flex: 1, padding: '9px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #34d399, #059669)',
                  color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                }}
              >
                <span className="material-icons" style={{ fontSize: '16px' }}>play_arrow</span>
                Mulai Rute
              </button>
            )}

            {/* Go to active route / pick up packages */}
            {route.active && (
              <button
                onClick={() => setActiveView('paket')}
                style={{
                  flex: 1, padding: '9px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
                  color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <span className="material-icons" style={{ fontSize: '16px' }}>inventory_2</span>
                Ambil Paket
              </button>
            )}

            {/* Stop accepting (finishes the route) */}
            <button
              onClick={handleStopAccepting}
              style={{
                flex: route.active ? 0 : 1,
                padding: '9px 12px', borderRadius: '12px',
                border: '1.5px solid #fca5a5', background: '#fef2f2',
                color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}
            >
              <span className="material-icons" style={{ fontSize: '16px' }}>stop_circle</span>
              {route.active ? '' : 'Batal'}
            </button>

            {/* Edit route */}
            <button
              onClick={() => navigate('Angkut')}
              style={{
                padding: '9px 12px', borderRadius: '12px',
                border: '1.5px solid #e2e8f0', background: '#f8fafc',
                color: '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span className="material-icons" style={{ fontSize: '16px' }}>edit</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="screen-content" style={{ padding: 0, gap: 0, overflow: 'hidden', height: '100dvh' }}>
      {/* ── Collapsible Map Container ── */}
      <div style={{
        position: 'relative',
        height: mapExpanded ? 'calc(40dvh - 68px)' : '120px',
        width: '100%',
        transition: 'height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
      }}>
        <MapPlaceholder
          points={route.waypoints}
          labels={route.waypoints.map((w, i) => `${i + 1}. ${w.name}`)}
          pickupPoint={hoveredMatch?.package?.pickupCoords}
          dropoffPoint={hoveredMatch?.package?.dropoffCoords}
          height="100%"
          interactive={true}
        />

        {/* Floating route summary */}
        <div style={{
          position: 'absolute', top: '12px', left: '12px', right: '60px',
          background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)',
          borderRadius: '14px', padding: '10px 14px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)', zIndex: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          opacity: mapExpanded ? 1 : 0,
          pointerEvents: mapExpanded ? 'auto' : 'none',
          transition: 'opacity 0.2s',
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>
              {route.active ? 'Rute Aktif' : hasActiveRoute ? 'Rute Terpilih' : 'Belum Ada Rute'}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {hasActiveRoute
                ? `${route.waypoints[0]?.name.split(' ')[0]} → ${route.waypoints[route.waypoints.length - 1]?.name.split(' ')[0]}`
                : 'Pilih rute di bawah untuk memulai'}
            </p>
          </div>
          {route.active && (
            <span style={{
              fontSize: '10px', fontWeight: 700,
              color: '#065f46', background: '#d1fae5',
              padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
            }}>● Aktif</span>
          )}
        </div>

        {/* Capacity badge */}
        {route.active && (
          <div style={{
            position: 'absolute', bottom: '12px', left: '12px',
            background: 'rgba(15,23,42,0.82)', borderRadius: '10px',
            padding: '6px 12px', color: '#fff',
            fontSize: '11px', fontWeight: 700, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span className="material-icons" style={{ fontSize: '14px', color: '#6a9cf4' }}>work</span>
            {myAcceptedPackages.length}/{route.maxPackets} Paket
          </div>
        )}
      </div>

      {/* ── Content Slide-up ── */}
      <div
        onScroll={handleScroll}
        style={{
          flex: 1,
          background: '#f4f7fc',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          marginTop: '-20px',
          zIndex: 20,
          padding: '20px 20px 90px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          overflowY: 'auto',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.08)',
        }}
      >
        {/* Drag handle */}
        <div
          onClick={() => setMapExpanded(!mapExpanded)}
          style={{ width: '40px', height: '5px', borderRadius: '3px', background: '#cbd5e1', margin: '-4px auto 0', cursor: 'pointer' }}
        />

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.8)', borderRadius: '14px', padding: '4px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveView('rute')}
            style={{
              flex: 1, padding: '9px', border: 'none', borderRadius: '10px',
              background: activeView === 'rute' ? '#2091e7' : 'transparent',
              color: activeView === 'rute' ? '#fff' : '#64748b',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>map</span>
            Semua Rute
          </button>
          <button
            onClick={() => setActiveView('paket')}
            style={{
              flex: 1, padding: '9px', border: 'none', borderRadius: '10px',
              background: activeView === 'paket' ? '#2091e7' : 'transparent',
              color: activeView === 'paket' ? '#fff' : '#64748b',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>inventory_2</span>
            Paket
            {availableMatches.length > 0 && (
              <span style={{
                background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 700,
                borderRadius: '50%', width: '16px', height: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {availableMatches.length}
              </span>
            )}
          </button>
        </div>

        {/* ── RUTE VIEW ── */}
        {activeView === 'rute' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                🗺️ Rute Tersimpan ({savedRoutes.length})
              </span>
              <button
                onClick={() => navigate('Angkut')}
                style={{
                  padding: '6px 12px', borderRadius: '10px',
                  border: '1.5px solid #e2e8f0', background: '#fff',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: '#475569',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <span className="material-icons" style={{ fontSize: '14px' }}>add</span>
                Buat Rute
              </button>
            </div>

            {/* Current DB route (if waypoints set but not in saved list) */}
            {hasActiveRoute && (() => {
              // Check if current route matches any saved preset
              const currentMatchesSaved = savedRoutes.some(sr =>
                sr.waypoints?.length === route.waypoints.length &&
                sr.waypoints[0]?.name === route.waypoints[0]?.name
              );
              if (!currentMatchesSaved) {
                // Show it as the active route card
                const currentPreset = {
                  name: `${route.waypoints[0]?.name?.split(' ')[0] || 'Titik 1'} → ${route.waypoints[route.waypoints.length - 1]?.name?.split(' ')[0] || 'Titik Akhir'}`,
                  waypoints: route.waypoints,
                  departureTime: route.departureTime,
                  id: '__current__',
                };
                return <RouteCard key="current" preset={currentPreset} isCurrent={true} />;
              }
              return null;
            })()}

            {savedRoutes.length === 0 && !hasActiveRoute && (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                background: '#ffffff', borderRadius: '20px', border: '1px dashed #cbd5e1',
              }}>
                <span className="material-icons" style={{ fontSize: '48px', color: '#cbd5e1', display: 'block', marginBottom: '12px' }}>map</span>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', margin: 0 }}>Belum Ada Rute Tersimpan</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                  Buat rute perjalanan harian Anda terlebih dahulu.
                </p>
                <button
                  onClick={() => navigate('Angkut')}
                  style={{
                    marginTop: '16px', padding: '10px 20px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
                    color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Buat Rute Pertama
                </button>
              </div>
            )}

            {savedRoutes.map(preset => {
              const isCurrent = hasActiveRoute && (
                preset.waypoints?.length === route.waypoints.length &&
                preset.waypoints[0]?.name === route.waypoints[0]?.name
              );
              return <RouteCard key={preset.id} preset={preset} isCurrent={isCurrent} />;
            })}
          </div>
        )}

        {/* ── PAKET VIEW ── */}
        {activeView === 'paket' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {!route.active && (
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: '1.5px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span className="material-icons" style={{ fontSize: '24px', color: '#d97706' }}>info</span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', margin: 0 }}>Rute Belum Aktif</p>
                  <p style={{ fontSize: '11px', color: '#b45309', margin: '2px 0 0' }}>
                    Pilih rute dan tekan "Mulai Rute" di tab Semua Rute untuk mulai menerima paket.
                  </p>
                </div>
              </div>
            )}

            {/* Highlight details when match is selected/hovered */}
            {hoveredMatch && (
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #bfdbfe', borderRadius: '16px', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e40af' }}>🔎 Detail Simpangan Detour</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', background: '#fff', padding: '2px 8px', borderRadius: '8px' }}>
                    Detour: {hoveredMatch.match.detourDistance} km
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#3b82f6', margin: 0, lineHeight: 1.4 }}>
                  <strong>Jemput:</strong> {hoveredMatch.package.pickupAddress} <br />
                  <strong>Antar:</strong> {hoveredMatch.package.dropoffAddress}
                </p>
              </div>
            )}

            {/* Accepted packages */}
            {myAcceptedPackages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📦 Paket Diangkut ({myAcceptedPackages.length})
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {myAcceptedPackages.map(item => (
                    <PackageChip key={item.package.id} item={item} showAccept={false} />
                  ))}
                </div>

                <button
                  onClick={() => navigate('AngkutProses')}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #34d399, #059669)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)', padding: '12px', fontSize: '13px' }}
                >
                  <span className="material-icons" style={{ fontSize: '16px' }}>navigation</span>
                  Mulai Navigasi ({myAcceptedPackages.length} Paket)
                </button>
              </div>
            )}

            {/* Direct matches */}
            {directMatches.length > 0 && route.active && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.5px' }}>
                    ✅ Rute Langsung ({directMatches.length})
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Tanpa simpangan</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {directMatches.map(item => (
                    <PackageChip key={item.package.id} item={item} showAccept={true} />
                  ))}
                </div>
              </div>
            )}

            {/* Detour matches */}
            {detourMatches.length > 0 && route.active && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.5px' }}>
                    🔀 Rute dengan Simpangan ({detourMatches.length})
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Ada biaya extra</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {detourMatches.map(item => (
                    <PackageChip key={item.package.id} item={item} showAccept={true} />
                  ))}
                </div>
              </div>
            )}

            {availableMatches.length === 0 && route.active && (
              <div style={{
                textAlign: 'center', padding: '28px 16px',
                background: '#ffffff', borderRadius: '20px', border: '1px dashed #cbd5e1',
              }}>
                <span className="material-icons" style={{ fontSize: '38px', color: '#cbd5e1' }}>explore_off</span>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginTop: '8px', margin: 0 }}>
                  Belum Ada Paket Searah
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
                  Buka tab Pengirim untuk memesan paket yang melintas rute Anda.
                </p>
              </div>
            )}

            {/* Stop accepting button */}
            {route.active && (
              <button
                onClick={handleStopAccepting}
                className="btn-secondary"
                style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', padding: '10px', fontSize: '13px' }}
              >
                <span className="material-icons" style={{ fontSize: '16px' }}>stop_circle</span>
                Berhenti Menerima Paket
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default AngkutDash;
