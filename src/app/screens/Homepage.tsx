import React, { useState } from 'react';
import {
  saveUserProfile, getUsers, saveUsers,
  type Package, type DriverRoute, type UserProfile
} from '../../lib/storage';
import { PACKAGE_SIZES } from '../../lib/mockData';

interface HomepageProps {
  navigate: (screen: string) => void;
  role: 'pengirim' | 'driver' | 'admin';
  packages: Package[];
  driverRoute: DriverRoute;
  userProfile: UserProfile;
  onSwitchRole: (newRole: 'pengirim' | 'driver' | 'admin') => void;
}

const VEHICLE_TYPES = [
  { key: 'Motor' as const,  icon: 'two_wheeler',     label: 'Sepeda Motor' },
  { key: 'Mobil' as const,  icon: 'directions_car',  label: 'Mobil' },
  { key: 'Pickup' as const, icon: 'local_shipping',  label: 'Pickup / Truk' },
];

export const Homepage: React.FC<HomepageProps> = ({
  navigate,
  role,
  packages,
  driverRoute,
  userProfile,
  onSwitchRole,
}) => {
  // Local state to toggle between main role menu selection and active dashboard
  // By default, if the user role is admin, show the admin panel (handled in App.tsx)
  // For standard users, show the role selection screen if they haven't explicitly entered a mode in this session
  const [showRoleSelection, setShowRoleSelection] = useState(() => {
    // If user vehicle details exist, we can default to selector, or let session decide
    const sessionChosen = sessionStorage.getItem('kirimin_session_mode');
    return !sessionChosen;
  });

  // Onboarding registration form states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [vehicleType, setVehicleType] = useState<'Motor' | 'Mobil' | 'Pickup'>('Motor');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleMaxSize, setVehicleMaxSize] = useState<'XS' | 'S' | 'M' | 'L' | 'XL'>('M');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const activePackages = packages.filter(
    p => p.status !== 'Telah Tiba' && p.status !== 'Dibatalkan'
  );
  const driverActiveCount = activePackages.filter(p => p.driverId === userProfile.id).length;
  const greeting = new Date().getHours() < 12 ? 'Selamat pagi' : new Date().getHours() < 17 ? 'Selamat siang' : 'Selamat malam';

  const enterSenderMode = () => {
    sessionStorage.setItem('kirimin_session_mode', 'pengirim');
    onSwitchRole('pengirim');
    setShowRoleSelection(false);
  };

  const enterDriverMode = () => {
    if (userProfile.vehicle) {
      sessionStorage.setItem('kirimin_session_mode', 'driver');
      onSwitchRole('driver');
      setShowRoleSelection(false);
    } else {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiclePlate.trim() || !vehicleColor.trim()) {
      alert('Silakan isi nomor plat dan warna kendaraan Anda.');
      return;
    }
    if (!agreeTerms) {
      alert('Anda harus menyetujui syarat & ketentuan untuk menjadi driver.');
      return;
    }

    const updatedProfile: UserProfile = {
      ...userProfile,
      role: 'driver',
      vehicle: {
        type: vehicleType,
        plate: vehiclePlate.trim().toUpperCase(),
        color: vehicleColor.trim(),
        maxPackageSize: vehicleMaxSize,
      }
    };

    // Update localStorage user registry
    const allUsers = getUsers();
    const updatedUsers = allUsers.map(u => u.id === userProfile.id ? updatedProfile : u);
    saveUsers(updatedUsers);

    // Save active profile & apply switch
    saveUserProfile(updatedProfile);
    sessionStorage.setItem('kirimin_session_mode', 'driver');
    onSwitchRole('driver');
    setShowOnboarding(false);
    setShowRoleSelection(false);
    alert('Selamat! Akun Driver Anda telah aktif.');
  };

  const handleBackToMenu = () => {
    sessionStorage.removeItem('kirimin_session_mode');
    setShowRoleSelection(true);
    setShowOnboarding(false);
  };

  // Rendering Driver Onboarding View
  if (showOnboarding) {
    return (
      <div className="screen-content" style={{ padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <button onClick={() => setShowOnboarding(false)} className="back-pill" style={{ border: 'none', background: '#f1f5f9', padding: '8px' }}>
            <span className="material-icons" style={{ fontSize: '18px' }}>arrow_back</span>
          </button>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Daftar Mitra Driver</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Lengkapi info kendaraan Anda</p>
          </div>
        </div>

        <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Jenis Kendaraan</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {VEHICLE_TYPES.map(v => {
                const active = vehicleType === v.key;
                return (
                  <div
                    key={v.key}
                    onClick={() => setVehicleType(v.key)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      padding: '12px 6px', borderRadius: '14px', cursor: 'pointer',
                      border: `2px solid ${active ? '#10b981' : '#e2e8f0'}`,
                      background: active ? '#f0fdf4' : '#fff', transition: 'all 0.2s',
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: '24px', color: active ? '#10b981' : '#94a3b8' }}>{v.icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: active ? '#047857' : '#64748b', textAlign: 'center' }}>{v.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Nomor Plat Kendaraan</label>
              <input className="form-input" placeholder="e.g., DK 1234 AB" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())} required />
            </div>
            <div className="form-group">
              <label className="form-label">Warna Kendaraan</label>
              <input className="form-input" placeholder="e.g., Hitam" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Kapasitas Ukuran Paket Maksimal</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {PACKAGE_SIZES.map(sz => {
                const active = vehicleMaxSize === sz.value;
                return (
                  <div
                    key={sz.value}
                    onClick={() => setVehicleMaxSize(sz.value as any)}
                    style={{
                      flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: '12px', cursor: 'pointer',
                      border: `2px solid ${active ? '#10b981' : '#e2e8f0'}`,
                      background: active ? '#10b981' : '#fff',
                      color: active ? '#fff' : '#334155',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 800 }}>{sz.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terms & Conditions scrollbox */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Syarat & Ketentuan Driver</label>
            <div style={{
              height: '90px', overflowY: 'auto', background: '#f8fafc',
              border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px',
              fontSize: '11px', color: '#64748b', lineHeight: 1.6,
            }}>
              1. Mitra Driver wajib memiliki Surat Izin Mengemudi (SIM) yang sah dan berlaku.<br />
              2. Mitra Driver bersedia untuk berbagi rute perjalanan harian rutin dan mengangkut paket searah tanpa paksaan.<br />
              3. Aplikasi Kirimin mengambil biaya jasa layanan sebesar 15% dari total ongkos pengiriman.<br />
              4. Driver wajib mengunggah bukti foto penyerahan barang (Drop-off proof) pada saat paket diserahkan ke penerima.
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px', color: '#475569' }}>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={e => setAgreeTerms(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
            />
            Saya menyetujui syarat & ketentuan driver.
          </label>

          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #34d399, #059669)', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 700 }}>
            Aktifkan Akun Driver
          </button>
        </form>
      </div>
    );
  }

  // Rendering landing page Role Selector (Menu Utama)
  if (showRoleSelection) {
    return (
      <div className="screen-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{greeting},</p>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0 0' }}>
            {userProfile.name} 👋
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>Mau kirim paket atau cari uang bensin hari ini?</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card 1: Kirim Paket */}
          <div
            onClick={enterSenderMode}
            className="premium-card"
            style={{
              cursor: 'pointer', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center',
              border: '2px solid #e2e8f0', background: '#ffffff', transition: 'all 0.25s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#2091e7'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(32,145,231,0.2)',
            }}>
              <span className="material-icons" style={{ fontSize: '30px', color: '#fff' }}>inventory_2</span>
            </div>
            <div>
              <p style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#1e293b' }}>Kirim Paket (Sender)</p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                Kirim barang Anda dengan menitipkannya ke pengemudi komuter searah.
              </p>
            </div>
          </div>

          {/* Card 2: Angkut Paket */}
          <div
            onClick={enterDriverMode}
            className="premium-card"
            style={{
              cursor: 'pointer', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center',
              border: '2px solid #e2e8f0', background: '#ffffff', transition: 'all 0.25s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #34d399, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(16,185,129,0.2)',
            }}>
              <span className="material-icons" style={{ fontSize: '30px', color: '#fff' }}>sports_motorsports</span>
            </div>
            <div>
              <p style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#1e293b' }}>Angkut Paket (Driver)</p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                Cari uang tambahan bensin dengan mengangkut barang yang searah jalan Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Sandbox Admin Entry link */}
        {role === 'admin' && (
          <button
            onClick={() => {
              sessionStorage.setItem('kirimin_session_mode', 'admin');
              onSwitchRole('admin');
              setShowRoleSelection(false);
            }}
            className="btn-secondary"
            style={{ padding: '10px', fontSize: '12px', borderColor: '#fde68a', color: '#b45309', background: '#fffbeb' }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>admin_panel_settings</span>
            Masuk sebagai Admin
          </button>
        )}
      </div>
    );
  }

  // Rendering dashboard based on active role
  return (
    <div className="screen-content">
      {/* ── Greeting Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{greeting},</p>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: '2px 0 0' }}>
            {userProfile.name.split(' ')[0]} 👋
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleBackToMenu}
            style={{
              padding: '6px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1',
              background: '#ffffff', color: '#475569', fontSize: '11px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <span className="material-icons" style={{ fontSize: '14px' }}>swap_horiz</span>
            Ganti Peran
          </button>
          <img
            src={userProfile.avatar}
            alt={userProfile.name}
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
          />
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <div style={{
        background: role === 'driver'
          ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)'
          : 'linear-gradient(135deg, #8eadf0 0%, #2091e7 100%)',
        borderRadius: '24px', padding: '24px',
        color: '#fff', boxShadow: role === 'driver' ? '0 8px 24px rgba(16,185,129,0.2)' : '0 8px 24px rgba(32,145,231,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
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
          {role === 'driver' ? 'Rute Harian Driver' : 'Ringkasan Pengiriman'}
        </span>

        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '6px 0 8px', lineHeight: 1.1 }}>
          {role === 'driver'
            ? driverActiveCount > 0
              ? `${driverActiveCount} Paket Diangkut`
              : 'Siap Menerima Paket'
            : `${activePackages.length} Paket Aktif`}
        </h2>

        <p style={{ fontSize: '13px', opacity: 0.85, margin: 0, lineHeight: 1.5 }}>
          {role === 'driver'
            ? driverRoute.active
              ? `Rute aktif: ${driverRoute.waypoints.length} titik | Berangkat ${driverRoute.departureTime}`
              : 'Atur rute harian untuk mulai menerima paket.'
            : activePackages.length > 0
              ? 'Pantau status pengiriman Anda secara real-time.'
              : 'Mulai pengiriman baru dan titipkan ke komuter searah.'}
        </p>
      </div>

      {/* ── Action Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {role === 'driver' ? (
          <>
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
                <span className="material-icons" style={{ fontSize: '24px', color: '#fff' }}>explore</span>
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Atur Rute</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>Ubah tujuan driver</p>
              </div>
            </div>

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
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>Mulai mencocokkan</p>
              </div>
            </div>
          </>
        ) : (
          <>
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
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>Lacak paket aktif</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Sandbox Tip ── */}
      <div style={{
        padding: '14px 16px', borderRadius: '16px',
        background: '#f8fafc', border: '1px dashed #cbd5e1',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <span className="material-icons" style={{ fontSize: '18px', color: '#64748b', marginTop: '1px' }}>info</span>
        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
          <strong>Tips Sandbox:</strong> Anda saat ini menjalankan mode <strong>{role === 'driver' ? 'Driver' : 'Pengirim'}</strong>. Anda dapat berganti ke mode lain dengan menekan tombol "Ganti Peran" di kanan atas.
        </div>
      </div>
    </div>
  );
};
export default Homepage;
