import React, { useState } from 'react';
import { clearSandboxData, saveUserProfile, type UserProfile, type Vehicle } from '../../../lib/storage';
import { LOCATION_PRESETS, type LocationPreset } from '../../../lib/mockData';

interface SetelanAkunProps {
  role: string;
  userProfile: UserProfile;
  onLogout: () => void;
  onSwitchRole: (role: 'pengirim' | 'driver' | 'admin') => void;
}

const VEHICLE_ICONS: Record<string, string> = {
  Motor: 'two_wheeler', Mobil: 'directions_car', Pickup: 'local_shipping', Bus: 'directions_bus',
};

export const SetelanAkun: React.FC<SetelanAkunProps> = ({
  role, userProfile, onLogout, onSwitchRole,
}) => {
  const [presets, setPresets] = useState<LocationPreset[]>(() => {
    const local = localStorage.getItem('kirimin_custom_presets');
    return local ? JSON.parse(local) : LOCATION_PRESETS;
  });

  const [editName, setEditName]     = useState(userProfile.name);
  const [editPhone, setEditPhone]   = useState(userProfile.phone);
  const [editingProfile, setEditingProfile] = useState(false);

  const [newLabel,   setNewLabel]   = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [showAddPreset, setShowAddPreset] = useState(false);

  // Vehicle edit
  const [editVehicle, setEditVehicle] = useState(false);
  const [vPlate, setVPlate] = useState(userProfile.vehicle?.plate ?? '');
  const [vColor, setVColor] = useState(userProfile.vehicle?.color ?? '');
  const [vType,  setVType]  = useState<Vehicle['type']>(userProfile.vehicle?.type ?? 'Motor');
  const [vMax,   setVMax]   = useState<Vehicle['maxPackageSize']>(userProfile.vehicle?.maxPackageSize ?? 'M');

  const saveProfile = () => {
    const updated: UserProfile = {
      ...userProfile,
      name: editName,
      phone: editPhone,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(editName)}&background=2091e7&color=fff&size=128`,
    };
    saveUserProfile(updated);
    setEditingProfile(false);
  };

  const saveVehicle = () => {
    const vehicle: Vehicle = { type: vType, plate: vPlate, color: vColor, maxPackageSize: vMax };
    saveUserProfile({ ...userProfile, vehicle, role: 'driver' });
    setEditVehicle(false);
    if (role !== 'driver') onSwitchRole('driver');
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newAddress.trim()) return;
    const lat = -6.2 + (Math.random() - 0.5) * 0.15;
    const lng = 106.8 + (Math.random() - 0.5) * 0.15;
    const p: LocationPreset = { id: 'pr_' + Date.now(), name: newLabel.trim(), address: newAddress.trim(), lat, lng };
    const updated = [...presets, p];
    setPresets(updated);
    localStorage.setItem('kirimin_custom_presets', JSON.stringify(updated));
    setNewLabel(''); setNewAddress(''); setShowAddPreset(false);
  };

  const handleReset = () => {
    if (confirm('Reset seluruh data sandbox? Paket, pesan, dan rute akan dihapus.')) {
      clearSandboxData();
      localStorage.removeItem('kirimin_custom_presets');
      setPresets(LOCATION_PRESETS);
      alert('Data sandbox direset.');
    }
  };

  const SIZES = ['XS','S','M','L','XL'] as const;

  return (
    <div className="screen-content">
      <div style={{ marginTop: '8px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Profil & Setelan</h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Kelola akun, kendaraan, dan alamat favorit</p>
      </div>

      {/* ── Profile Card ── */}
      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={userProfile.avatar}
            alt={userProfile.name}
            style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #6a9cf4' }}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>{userProfile.name}</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>{userProfile.email}</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{userProfile.phone}</p>
          </div>
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            style={{ background: '#f0f4f9', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}
          >
            <span className="material-icons" style={{ fontSize: '18px', color: '#64748b' }}>edit</span>
          </button>
        </div>

        {editingProfile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: '#f8fafc', borderRadius: '14px' }}>
            <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nama Lengkap" />
            <input className="form-input" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Nomor HP" />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEditingProfile(false)} className="btn-secondary" style={{ flex: 1 }}>Batal</button>
              <button onClick={saveProfile} className="btn-primary" style={{ flex: 1 }}>Simpan</button>
            </div>
          </div>
        )}

        {/* Role switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['pengirim', 'driver', 'admin'] as const).map(r => (
            <button
              key={r}
              onClick={() => onSwitchRole(r)}
              style={{
                flex: 1, padding: '9px', borderRadius: '12px', border: '1.5px solid',
                borderColor: role === r ? (r === 'driver' ? '#10b981' : r === 'admin' ? '#f59e0b' : '#2091e7') : '#e2e8f0',
                background: role === r ? (r === 'driver' ? '#f0fdf4' : r === 'admin' ? '#fef3c7' : '#e8f4ff') : '#fff',
                color: role === r ? (r === 'driver' ? '#065f46' : r === 'admin' ? '#b45309' : '#1e40af') : '#64748b',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}
            >
              <span className="material-icons" style={{ fontSize: '16px' }}>
                {r === 'driver' ? 'sports_motorsports' : r === 'admin' ? 'admin_panel_settings' : 'person'}
              </span>
              {r === 'driver' ? 'Driver' : r === 'admin' ? 'Admin' : 'Pengirim'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Vehicle Card (Driver) ── */}
      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>🚗 Data Kendaraan</span>
          <button
            onClick={() => setEditVehicle(!editVehicle)}
            style={{ background: 'none', border: 'none', color: '#2091e7', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>{editVehicle ? 'close' : 'edit'}</span>
            {editVehicle ? 'Batal' : 'Edit'}
          </button>
        </div>

        {!editVehicle && userProfile.vehicle ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: '#e8f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-icons" style={{ color: '#2091e7', fontSize: '24px' }}>
                {VEHICLE_ICONS[userProfile.vehicle.type] ?? 'directions_car'}
              </span>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{userProfile.vehicle.type}</p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                {userProfile.vehicle.plate} · {userProfile.vehicle.color} · Maks {userProfile.vehicle.maxPackageSize}
              </p>
            </div>
          </div>
        ) : !editVehicle ? (
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Belum ada kendaraan. Tambahkan untuk mode driver.</p>
        ) : null}

        {editVehicle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {(['Motor', 'Mobil', 'Pickup'] as Vehicle['type'][]).map(t => (
                <div
                  key={t}
                  onClick={() => setVType(t)}
                  style={{
                    padding: '12px 4px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
                    border: `2px solid ${vType === t ? '#2091e7' : '#e2e8f0'}`,
                    background: vType === t ? '#e8f4ff' : '#fff',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '20px', color: vType === t ? '#2091e7' : '#94a3b8' }}>
                    {VEHICLE_ICONS[t]}
                  </span>
                  <p style={{ fontSize: '10px', fontWeight: 700, margin: '4px 0 0', color: vType === t ? '#2091e7' : '#64748b' }}>{t}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input className="form-input" placeholder="Plat (B 1234 ZZ)" value={vPlate} onChange={e => setVPlate(e.target.value.toUpperCase())} />
              <input className="form-input" placeholder="Warna" value={vColor} onChange={e => setVColor(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {SIZES.map(s => (
                <div
                  key={s}
                  onClick={() => setVMax(s)}
                  style={{
                    flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: '10px', cursor: 'pointer',
                    border: `2px solid ${vMax === s ? '#2091e7' : '#e2e8f0'}`,
                    background: vMax === s ? '#2091e7' : '#fff',
                    fontSize: '13px', fontWeight: 800,
                    color: vMax === s ? '#fff' : '#334155',
                  }}
                >{s}</div>
              ))}
            </div>
            <button onClick={saveVehicle} className="btn-primary" style={{ padding: '12px' }}>
              <span className="material-icons">check</span>
              Simpan Kendaraan
            </button>
          </div>
        )}
      </div>

      {/* ── Preset Addresses ── */}
      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>📍 Alamat Favorit</span>
          <button
            onClick={() => setShowAddPreset(!showAddPreset)}
            style={{ background: 'none', border: 'none', color: '#2091e7', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>{showAddPreset ? 'close' : 'add'}</span>
            {showAddPreset ? 'Batal' : 'Tambah'}
          </button>
        </div>

        {showAddPreset && (
          <form onSubmit={handleAddPreset} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '12px' }}>
            <input className="form-input" placeholder="Label (Rumah, Kantor, ...)" value={newLabel} onChange={e => setNewLabel(e.target.value)} required />
            <textarea className="form-textarea" placeholder="Alamat lengkap..." rows={2} value={newAddress} onChange={e => setNewAddress(e.target.value)} required />
            <button type="submit" className="btn-primary" style={{ padding: '8px', fontSize: '13px', borderRadius: '10px' }}>Simpan</button>
          </form>
        )}

        {presets.map(p => (
          <div key={p.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            <span className="material-icons" style={{ color: '#2091e7', fontSize: '18px', marginTop: '2px' }}>place</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{p.name}</p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', wordBreak: 'break-all' }}>{p.address}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Danger Zone ── */}
      <div className="premium-card" style={{ border: '1px solid rgba(239,68,68,0.2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>⚠️ Zona Bahaya</span>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
          Reset akan menghapus semua paket, rute, dan pesan sandbox.
        </p>
        <button onClick={handleReset} className="btn-primary" style={{ background: 'linear-gradient(135deg,#f87171,#ef4444)', boxShadow: '0 4px 10px rgba(239,68,68,0.3)', padding: '12px', fontSize: '14px' }}>
          <span className="material-icons" style={{ fontSize: '18px' }}>delete_forever</span>
          Reset Sandbox
        </button>
      </div>

      {/* ── Logout ── */}
      <button onClick={onLogout} className="btn-secondary" style={{ borderColor: '#fca5a5', color: '#dc2626', background: '#fef2f2' }}>
        <span className="material-icons">logout</span>
        Keluar dari Akun
      </button>
    </div>
  );
};
export default SetelanAkun;
