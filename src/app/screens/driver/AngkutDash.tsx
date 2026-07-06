import React, { useState, useEffect } from 'react';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import {
  getDriverRoute, saveDriverRoute, getPackages, savePackages,
  type Package, type UserProfile
} from '../../../lib/storage';
import { findBestDetour } from '../../../lib/matching';

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

export const AngkutDash: React.FC<AngkutDashProps> = ({ navigate, packages, userProfile }) => {
  const [route, setRoute] = useState(getDriverRoute());
  const [matchingPackages, setMatchingPackages] = useState<any[]>([]);

  // UI States
  const [mapExpanded, setMapExpanded] = useState(true);
  const [hoveredMatch, setHoveredMatch] = useState<any | null>(null);

  useEffect(() => {
    const currentRoute = getDriverRoute();
    setRoute(currentRoute);
    if (!currentRoute.active || currentRoute.waypoints.length < 2) return;

    const pool = getPackages();
    const matches: any[] = [];

    pool.forEach(pkg => {
      const sizeHierarchy = ['XS', 'S', 'M', 'L', 'XL'];
      const driverMaxIdx = sizeHierarchy.indexOf(currentRoute.maxPackageSize);
      const pkgIdx = sizeHierarchy.indexOf(pkg.weightSize);
      if (pkgIdx > driverMaxIdx) return;

      // Filter matched items
      if (pkg.driverId === userProfile.id) {
        const m = findBestDetour(currentRoute.waypoints, pkg.pickupCoords, pkg.dropoffCoords);
        matches.push({ package: pkg, match: m, accepted: true });
        return;
      }
      if (pkg.status === 'Mencari Driver') {
        const m = findBestDetour(currentRoute.waypoints, pkg.pickupCoords, pkg.dropoffCoords);
        if (m.isMatch) matches.push({ package: pkg, match: m, accepted: false });
      }
    });

    setMatchingPackages(matches);
  }, [packages, userProfile.id]);

  const handleAcceptPackage = (pkgId: string) => {
    const all = getPackages();
    const currentRoute = getDriverRoute();
    const acceptedCount = all.filter(p => p.driverId === userProfile.id && p.status !== 'Telah Tiba' && p.status !== 'Dibatalkan').length;
    if (acceptedCount >= currentRoute.maxPackets) {
      alert(`Bagasi penuh! Maks ${currentRoute.maxPackets} paket.`);
      return;
    }
    const updated = all.map(p => p.id === pkgId ? {
      ...p,
      status: 'Menunggu Pick-up' as const,
      driverId: userProfile.id,
      driverName: userProfile.name,
      driverPhone: userProfile.phone,
      driverAvatar: userProfile.avatar ?? null,
      driverVehicle: userProfile.vehicle ? `${userProfile.vehicle.type} (${userProfile.vehicle.color})` : 'Motor',
      driverPlate: userProfile.vehicle?.plate ?? 'B 0000 XYZ',
    } : p);
    savePackages(updated);
  };

  const handleAutoReroute = (pkg: Package, insertPickupIdx: number, insertDropoffIdx: number) => {
    const currentRoute = getDriverRoute();
    const newWaypoints = [...currentRoute.waypoints];
    newWaypoints.splice(insertPickupIdx, 0, {
      name: `Jemput: ${pkg.category} (${pkg.pickupAddress.split(',')[0]})`,
      lat: pkg.pickupCoords.lat, lng: pkg.pickupCoords.lng,
    });
    newWaypoints.splice(insertDropoffIdx, 0, {
      name: `Antar: ${pkg.category} (${pkg.dropoffAddress.split(',')[0]})`,
      lat: pkg.dropoffCoords.lat, lng: pkg.dropoffCoords.lng,
    });
    const updatedRoute = { ...currentRoute, waypoints: newWaypoints };
    saveDriverRoute(updatedRoute);
    setRoute(updatedRoute);
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

  return (
    <div className="screen-content" style={{ padding: 0, gap: 0, overflow: 'hidden', height: '100dvh' }}>
      {/* ── Collapsible Map Container ── */}
      <div style={{
        position: 'relative',
        height: mapExpanded ? 'calc(55dvh - 68px)' : '140px',
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
            <p style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Rute Aktif</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {route.waypoints[0]?.name.split(' ')[0]} → {route.waypoints[route.waypoints.length - 1]?.name.split(' ')[0]}
            </p>
          </div>
          <button
            onClick={() => navigate('Angkut')}
            style={{
              padding: '6px 12px', borderRadius: '10px',
              border: '1.5px solid #e2e8f0', background: '#f1f5f9',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: '#475569',
              flexShrink: 0,
            }}
          >
            Ubah
          </button>
        </div>

        {/* Capacity badge */}
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
        {/* Drag handle (Click to toggle expansion manually) */}
        <div
          onClick={() => setMapExpanded(!mapExpanded)}
          style={{ width: '40px', height: '5px', borderRadius: '3px', background: '#cbd5e1', margin: '-4px auto 0', cursor: 'pointer' }}
        />

        {/* Route list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🗺️ Rute Perjalanan ({route.waypoints.length} titik)
          </span>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {route.waypoints.map((wp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                <div className="waypoint-badge" style={{ flexShrink: 0, width: '18px', height: '18px', fontSize: '10px' }}>{i + 1}</div>
                <span style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>{wp.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Highlight details when match is selected/hovered */}
        {hoveredMatch && (
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe', borderRadius: '16px', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: '6px',
            animation: 'fadeIn 0.2s ease-out',
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
        {directMatches.length > 0 && (
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
        {detourMatches.length > 0 && (
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

        {availableMatches.length === 0 && (
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

        {/* Action buttons */}
        <button
          onClick={() => navigate('Angkut')}
          className="btn-secondary"
          style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', padding: '10px', fontSize: '13px' }}
        >
          <span className="material-icons" style={{ fontSize: '16px' }}>stop_circle</span>
          Berhenti Menerima Paket
        </button>
      </div>
    </div>
  );
};
export default AngkutDash;
