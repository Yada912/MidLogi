import React from 'react';
import type { Package, DriverRoute, UserProfile } from '../../lib/storage';

interface HomepageProps {
  navigate: (screen: string) => void;
  role: string;
  packages: Package[];
  driverRoute: DriverRoute;
  userProfile: UserProfile;
}

export const Homepage: React.FC<HomepageProps> = ({
  navigate,
  role,
  packages,
  driverRoute,
  userProfile,
}) => {
  const activePackages = packages.filter(
    p => p.status !== 'Telah Tiba' && p.status !== 'Dibatalkan'
  );
  const driverActiveCount = activePackages.filter(p => p.driverId === 'driver_self').length;
  const greeting = new Date().getHours() < 12 ? 'Selamat pagi' : new Date().getHours() < 17 ? 'Selamat siang' : 'Selamat malam';

  return (
    <div className="screen-content">
      {/* ── Greeting Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{greeting},</p>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '2px 0 0' }}>
            {userProfile.name.split(' ')[0]} 👋
          </h1>
        </div>
        <img
          src={userProfile.avatar}
          alt={userProfile.name}
          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
        />
      </div>

      {/* ── Hero Banner ── */}
      <div style={{
        background: role === 'driver'
          ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)'
          : 'linear-gradient(135deg, #8eadf0 0%, #2091e7 100%)',
        borderRadius: '24px', padding: '24px',
        color: '#fff', boxShadow: '0 8px 24px rgba(32,145,231,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circle */}
        <div style={{
          position: 'absolute', right: '-24px', bottom: '-24px',
          width: '130px', height: '130px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
        }} />
        <div style={{
          position: 'absolute', right: '30px', top: '-30px',
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }} />

        <span style={{ fontSize: '12px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {role === 'pengirim' ? 'Ringkasan Pengiriman' : 'Rute Harian Driver'}
        </span>

        <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '6px 0 8px', lineHeight: 1.1 }}>
          {role === 'pengirim'
            ? `${activePackages.length} Paket Aktif`
            : driverActiveCount > 0
              ? `${driverActiveCount} Paket Diangkut`
              : 'Siap Menerima Paket'}
        </h2>

        <p style={{ fontSize: '13px', opacity: 0.85, margin: 0, lineHeight: 1.5 }}>
          {role === 'pengirim'
            ? activePackages.length > 0
              ? 'Pantau status pengiriman Anda secara real-time.'
              : 'Mulai pengiriman baru dan titipkan ke komuter searah.'
            : driverRoute.active
              ? `Rute aktif: ${driverRoute.waypoints.length} titik | Berangkat ${driverRoute.departureTime}`
              : 'Atur rute harian untuk mulai menerima paket.'}
        </p>

        {driverRoute.active && role === 'driver' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            marginTop: '12px', background: 'rgba(255,255,255,0.2)',
            padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
          }}>
            <span className="material-icons" style={{ fontSize: '14px' }}>radio_button_checked</span>
            Rute Aktif
          </div>
        )}
      </div>

      {/* ── Action Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Send Package */}
        <div
          className="premium-card"
          onClick={() => navigate('KirimDetail')}
          style={{ cursor: 'pointer', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-icons" style={{ fontSize: '24px', color: '#fff' }}>inventory_2</span>
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Kirim Paket</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>Titipkan ke komuter</p>
          </div>
        </div>

        {/* Drive */}
        <div
          className="premium-card"
          onClick={() => navigate('Angkut')}
          style={{ cursor: 'pointer', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #34d399, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-icons" style={{ fontSize: '24px', color: '#fff' }}>
              {userProfile.vehicle ? (userProfile.vehicle.type === 'Motor' ? 'two_wheeler' : 'directions_car') : 'explore'}
            </span>
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Atur Rute</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>Driver mode</p>
          </div>
        </div>

        {/* My Packages */}
        <div
          className="premium-card"
          onClick={() => navigate('KirimDash')}
          style={{ cursor: 'pointer', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: '#fff7ed', border: '1.5px solid #fed7aa',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-icons" style={{ fontSize: '24px', color: '#f97316' }}>local_shipping</span>
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Paket Saya</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
              {activePackages.length} aktif
            </p>
          </div>
        </div>

        {/* Driver Dashboard */}
        <div
          className="premium-card"
          onClick={() => navigate('AngkutDash')}
          style={{ cursor: 'pointer', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: '#eff6ff', border: '1.5px solid #bfdbfe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-icons" style={{ fontSize: '24px', color: '#3b82f6' }}>map</span>
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Dashboard Driver</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
              {driverRoute.active ? `${driverRoute.waypoints.length} titik` : 'Rute belum aktif'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Sandbox Tip ── */}
      <div style={{
        padding: '14px 16px', borderRadius: '16px',
        background: '#f8fafc', border: '1px dashed #cbd5e1',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <span className="material-icons" style={{ fontSize: '18px', color: '#64748b', marginTop: '1px' }}>info</span>
        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
          <strong>Tips Sandbox:</strong> Daftar dengan 2 email berbeda di 2 tab — satu Pengirim, satu Driver — untuk simulasi full end-to-end.
        </div>
      </div>
    </div>
  );
};
export default Homepage;
