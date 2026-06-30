import React, { useState } from 'react';
import { saveUserProfile, type UserProfile, type Vehicle } from '../../../lib/storage';

interface AuthSignupProps {
  onComplete: (profile: UserProfile) => void;
  onLogin: () => void;
}

const VEHICLE_TYPES = [
  { key: 'Motor',  icon: 'two_wheeler',     label: 'Sepeda Motor',  maxDefault: 'M' as const },
  { key: 'Mobil',  icon: 'directions_car',  label: 'Mobil',          maxDefault: 'L' as const },
  { key: 'Pickup', icon: 'local_shipping',  label: 'Pickup / Truk',  maxDefault: 'XL' as const },
];

const PACKAGE_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;

export const AuthSignup: React.FC<AuthSignupProps> = ({ onComplete, onLogin }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basic info
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Role
  const [role, setRole] = useState<'pengirim' | 'driver'>('pengirim');

  // Step 3: Vehicle (driver only)
  const [vehicleType, setVehicleType]   = useState<Vehicle['type']>('Motor');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleMaxSize, setVehicleMaxSize] = useState<Vehicle['maxPackageSize']>('M');

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    setStep(2);
  };

  const handleStep2 = () => {
    if (role === 'pengirim') {
      finalize();
    } else {
      setStep(3);
    }
  };

  const finalize = () => {
    const vehicle: Vehicle | undefined = role === 'driver' ? {
      type: vehicleType,
      plate: vehiclePlate || 'B 0000 AA',
      color: vehicleColor || 'Hitam',
      maxPackageSize: vehicleMaxSize,
    } : undefined;

    const profile: UserProfile = {
      id: 'user_' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      vehicle,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=2091e7&color=fff&size=128`,
      createdAt: new Date().toISOString(),
    };

    saveUserProfile(profile);
    onComplete(profile);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
            margin: '0 auto 12px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(32,145,231,0.3)',
          }}>
            <span className="material-icons" style={{ fontSize: '32px', color: '#fff' }}>local_shipping</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Buat Akun Kirimin</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Crowdsourced Hitchhiking Logistics
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {[1,2,3].map(s => {
            if (role === 'pengirim' && s === 3) return null;
            return (
              <div key={s} style={{
                width: s === step ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: s <= step ? '#2091e7' : '#e2e8f0',
                transition: 'all 0.3s',
              }} />
            );
          })}
        </div>

        {/* Step 1: Personal info */}
        {step === 1 && (
          <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Informasi Diri
            </h2>
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input className="form-input" placeholder="e.g. Budi Santoso" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="budi@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor HP (WhatsApp)</label>
              <input className="form-input" type="tel" placeholder="08xx-xxxx-xxxx" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">
              Lanjut <span className="material-icons">arrow_forward</span>
            </button>
          </form>
        )}

        {/* Step 2: Role selection */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                Peran Utama Anda
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Bisa diganti kapan saja di dalam aplikasi.
              </p>
            </div>

            {/* Pengirim */}
            <div
              onClick={() => setRole('pengirim')}
              style={{
                padding: '18px', borderRadius: '18px', cursor: 'pointer',
                border: `2px solid ${role === 'pengirim' ? '#2091e7' : '#e2e8f0'}`,
                background: role === 'pengirim' ? '#e8f4ff' : '#ffffff',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-icons" style={{ color: '#fff', fontSize: '24px' }}>person</span>
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#1e293b' }}>Pengirim</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Titipkan paket ke komuter searah</p>
                </div>
                {role === 'pengirim' && (
                  <span className="material-icons" style={{ marginLeft: 'auto', color: '#2091e7' }}>check_circle</span>
                )}
              </div>
            </div>

            {/* Driver */}
            <div
              onClick={() => setRole('driver')}
              style={{
                padding: '18px', borderRadius: '18px', cursor: 'pointer',
                border: `2px solid ${role === 'driver' ? '#10b981' : '#e2e8f0'}`,
                background: role === 'driver' ? '#f0fdf4' : '#ffffff',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #34d399, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-icons" style={{ color: '#fff', fontSize: '24px' }}>sports_motorsports</span>
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#1e293b' }}>Driver / Komuter</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Antar paket searah, dapat uang bensin</p>
                </div>
                {role === 'driver' && (
                  <span className="material-icons" style={{ marginLeft: 'auto', color: '#10b981' }}>check_circle</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex: '0 0 auto', width: 'auto', padding: '14px 18px' }}>
                <span className="material-icons">arrow_back</span>
              </button>
              <button onClick={handleStep2} className="btn-primary" style={{ flex: 1 }}>
                {role === 'driver' ? 'Lanjut →' : 'Selesai & Masuk'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Vehicle info (driver only) */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                Data Kendaraan
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Digunakan untuk mencocokkan paket yang bisa Anda angkut.</p>
            </div>

            {/* Vehicle type */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Jenis Kendaraan</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {VEHICLE_TYPES.map(v => {
                  const active = vehicleType === v.key;
                  return (
                    <div
                      key={v.key}
                      onClick={() => { setVehicleType(v.key as Vehicle['type']); setVehicleMaxSize(v.maxDefault); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                        padding: '14px 6px', borderRadius: '14px', cursor: 'pointer',
                        border: `2px solid ${active ? '#2091e7' : '#e2e8f0'}`,
                        background: active ? '#e8f4ff' : '#fff', transition: 'all 0.2s',
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: '24px', color: active ? '#2091e7' : '#94a3b8' }}>{v.icon}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: active ? '#2091e7' : '#64748b', textAlign: 'center' }}>{v.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plate + color */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Nomor Plat</label>
                <input className="form-input" placeholder="B 1234 ZZ" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())} />
              </div>
              <div className="form-group">
                <label className="form-label">Warna Kendaraan</label>
                <input className="form-input" placeholder="Hitam" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} />
              </div>
            </div>

            {/* Max package size */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Ukuran Paket Maksimal</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {PACKAGE_SIZES.map(sz => {
                  const active = vehicleMaxSize === sz;
                  return (
                    <div
                      key={sz}
                      onClick={() => setVehicleMaxSize(sz)}
                      style={{
                        flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: '12px', cursor: 'pointer',
                        border: `2px solid ${active ? '#2091e7' : '#e2e8f0'}`,
                        background: active ? '#2091e7' : '#fff', transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: '15px', fontWeight: 800, color: active ? '#fff' : '#334155' }}>{sz}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(2)} className="btn-secondary" style={{ flex: '0 0 auto', width: 'auto', padding: '14px 18px' }}>
                <span className="material-icons">arrow_back</span>
              </button>
              <button onClick={finalize} className="btn-primary" style={{ flex: 1 }}>
                <span className="material-icons">check</span>
                Selesai & Masuk
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          Sudah punya akun?{' '}
          <button onClick={onLogin} style={{ background: 'none', border: 'none', color: '#2091e7', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
            Masuk
          </button>
        </div>
      </div>
    </div>
  );
};
export default AuthSignup;
