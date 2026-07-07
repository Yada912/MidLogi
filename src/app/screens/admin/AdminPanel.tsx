import React, { useState, useEffect } from 'react';
import {
  type UserProfile, type Package, type Vehicle
} from '../../../lib/storage';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import type { Coordinate } from '../../../lib/mockData';
import * as api from '../../../lib/api';

interface AdminPanelProps {
  activeSection: 'dashboard' | 'users' | 'orders';
  packages: Package[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  activeSection,
  packages,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]);

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Editing state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  // Map Pick state for User Location adjustment
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickMode, setPickMode] = useState<'pickup' | null>(null);

  useEffect(() => {
    api.fetchAllProfiles().then(setUsers);
    api.fetchPackages().then(setAllPackages);
  }, [packages]);

  // Calculations for Stats
  const activeOrdersCount = allPackages.filter(p => p.status !== 'Telah Tiba' && p.status !== 'Dibatalkan').length;
  const completedOrders = allPackages.filter(p => p.status === 'Telah Tiba');
  const totalRevenue = completedOrders.reduce((sum, p) => sum + p.price + (p.detourFee || 0), 0);
  const totalDriverEarnings = completedOrders.reduce((sum, p) => sum + (p.price + (p.detourFee || 0)) * 0.85, 0); // Mock 85% payout

  // Filter lists
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredPackages = allPackages.filter(p =>
    p.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(orderSearch.toLowerCase()) ||
    p.status.toLowerCase().includes(orderSearch.toLowerCase()) ||
    (p.driverName || 'tidak ada').toLowerCase().includes(orderSearch.toLowerCase())
  );

  // Actions for Users
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.updateProfile(editingUser.id, editingUser);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
      alert('User berhasil diperbarui!');
    } catch (err: any) {
      alert('Gagal memperbarui user: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Hapus user ini secara permanen?')) {
      try {
        const { error } = await (await import('../../../lib/supabase')).supabase
          .from('profiles').delete().eq('id', userId);
        if (error) throw new Error(error.message);
        setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (err: any) {
        alert('Gagal menghapus user: ' + err.message);
      }
    }
  };

  // Actions for Packages/Orders
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;

    let finalPkg = { ...editingPackage };
    if (editingPackage.driverId && editingPackage.driverId !== 'none') {
      const selectedDriver = users.find(u => u.id === editingPackage.driverId);
      if (selectedDriver) {
        finalPkg.driverName = selectedDriver.name;
        finalPkg.driverPhone = selectedDriver.phone;
        finalPkg.driverAvatar = selectedDriver.avatar ?? null;
        finalPkg.driverVehicle = selectedDriver.vehicle ? `${selectedDriver.vehicle.type} (${selectedDriver.vehicle.color})` : 'Motor';
        finalPkg.driverPlate = selectedDriver.vehicle?.plate ?? 'B 1234 XYZ';
      }
    } else if (editingPackage.driverId === 'none') {
      finalPkg.driverId = null;
      finalPkg.driverName = null;
      finalPkg.driverPhone = null;
      finalPkg.driverAvatar = null;
      finalPkg.driverVehicle = null;
      finalPkg.driverPlate = null;
    }

    try {
      await api.updatePackage(finalPkg.id, finalPkg);
      setAllPackages(prev => prev.map(p => p.id === finalPkg.id ? finalPkg : p));
      setEditingPackage(null);
      alert('Order berhasil diperbarui!');
    } catch (err: any) {
      alert('Gagal memperbarui order: ' + err.message);
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    if (confirm('Hapus order ini secara permanen?')) {
      try {
        await api.deletePackage(pkgId);
        setAllPackages(prev => prev.filter(p => p.id !== pkgId));
      } catch (err: any) {
        alert('Gagal menghapus order: ' + err.message);
      }
    }
  };

  // Map coordinate picker logic
  const handleLocationSelect = (coord: Coordinate, address: string) => {
    if (editingUser) {
      setEditingUser({
        ...editingUser,
        location: coord,
        locationName: address.split(',')[0], // Use short name
      });
    }
    setPickMode(null);
    setShowLocationPicker(false);
  };

  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* ── Header ── */}
      <div style={{ marginTop: '8px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Panel Admin</h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
          Kelola user, order, logistik, dan koordinat fisik sandbox.
        </p>
      </div>

      {/* ── Stats Section ── */}
      {activeSection === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="premium-card" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', border: 'none' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>Total User</span>
              <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 0', color: '#0369a1' }}>{users.length}</h3>
            </div>
            <div className="premium-card" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: 'none' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>Paket Aktif</span>
              <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 0', color: '#b45309' }}>{activeOrdersCount}</h3>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="premium-card" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', border: 'none' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Total Omset</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0', color: '#047857' }}>
                Rp {totalRevenue.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="premium-card" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', border: 'none' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>Earning Driver</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0', color: '#4338ca' }}>
                Rp {totalDriverEarnings.toLocaleString('id-ID')}
              </h3>
            </div>
          </div>

          {/* Quick Info & Guidelines */}
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>💡 Tips Sandbox Admin</h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Ubah lokasi pengirim atau driver di tab <strong>Kelola User</strong>. Perubahan koordinat akan langsung memengaruhi perhitungan jarak dan detour matching logistik pada saat rute dicocokkan!
            </p>
          </div>
        </div>
      )}

      {/* ── Users Section ── */}
      {activeSection === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Cari user (nama, email, role)..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
            <span className="material-icons" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px' }}>
              search
            </span>
          </div>

          {/* Users List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredUsers.map(user => (
              <div key={user.id} className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{user.name}</p>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {user.email} · {user.phone}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '8px',
                    background: user.role === 'admin' ? '#fef3c7' : user.role === 'driver' ? '#d1fae5' : '#e0f2fe',
                    color: user.role === 'admin' ? '#b45309' : user.role === 'driver' ? '#047857' : '#0369a1',
                  }}>
                    {user.role}
                  </span>
                </div>

                {/* Location info */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px' }}>
                  <span className="material-icons" style={{ fontSize: '14px', color: '#64748b' }}>place</span>
                  <span style={{ fontWeight: 600 }}>{user.locationName || 'Lokasi belum diatur'}</span>
                  {user.location && (
                    <span style={{ color: '#94a3b8', fontSize: '9px' }}>
                      ({user.location.lat.toFixed(4)}, {user.location.lng.toFixed(4)})
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <button
                    onClick={() => setEditingUser(user)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '6px', fontSize: '11.5px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <span className="material-icons" style={{ fontSize: '14px' }}>edit</span>
                    Edit User
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="btn-secondary"
                    style={{ flex: '0 0 auto', padding: '6px 10px', borderRadius: '8px', borderColor: '#fca5a5', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="material-icons" style={{ fontSize: '14px' }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Orders Section ── */}
      {activeSection === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Cari order (id, status, driver)..."
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
            <span className="material-icons" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px' }}>
              search
            </span>
          </div>

          {/* Orders List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredPackages.map(pkg => (
              <div key={pkg.id} className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>#{pkg.id.slice(-6)}</span>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '8px',
                    background: pkg.status === 'Telah Tiba' ? '#d1fae5' : pkg.status === 'Dibatalkan' ? '#fee2e2' : '#fef3c7',
                    color: pkg.status === 'Telah Tiba' ? '#047857' : pkg.status === 'Dibatalkan' ? '#ef4444' : '#b45309',
                  }}>
                    {pkg.status}
                  </span>
                </div>

                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{pkg.category} ({pkg.weightSize})</p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{pkg.description}</p>
                </div>

                <div style={{ fontSize: '11px', color: '#475569' }}>
                  <p style={{ margin: 0 }}>📍 Jemput: {pkg.pickupAddress.split(',')[0]}</p>
                  <p style={{ margin: '2px 0 0 0' }}>🏁 Antar: {pkg.dropoffAddress.split(',')[0]}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>Tarif: <strong>Rp {pkg.price.toLocaleString('id-ID')}</strong></span>
                  <span style={{ color: '#2091e7' }}>Driver: <strong>{pkg.driverName || 'Belum ada'}</strong></span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <button
                    onClick={() => setEditingPackage(pkg)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '6px', fontSize: '11.5px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <span className="material-icons" style={{ fontSize: '14px' }}>edit</span>
                    Kelola Status & Driver
                  </button>
                  <button
                    onClick={() => handleDeletePackage(pkg.id)}
                    className="btn-secondary"
                    style={{ flex: '0 0 auto', padding: '6px 10px', borderRadius: '8px', borderColor: '#fca5a5', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="material-icons" style={{ fontSize: '14px' }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit User Modal overlay ── */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '24px',
            width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: '16px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Edit Detail User</h3>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nama</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nomor HP</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingUser.phone}
                  onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                >
                  <option value="pengirim">Pengirim</option>
                  <option value="driver">Driver</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Vehicle parameters for driver */}
              {editingUser.role === 'driver' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', border: '1.5px dashed #e2e8f0', padding: '12px', borderRadius: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>🚗 DETAIL KENDARAAN DRIVER</span>
                  <div className="form-group">
                    <label className="form-label">Jenis Kendaraan</label>
                    <select
                      className="form-select"
                      value={editingUser.vehicle?.type ?? 'Motor'}
                      onChange={e => setEditingUser({
                        ...editingUser,
                        vehicle: {
                          plate: editingUser.vehicle?.plate ?? 'B 0000 XYZ',
                          maxPackageSize: editingUser.vehicle?.maxPackageSize ?? 'M',
                          color: editingUser.vehicle?.color ?? 'Hitam',
                          type: e.target.value as any,
                        }
                      })}
                    >
                      <option value="Motor">Sepeda Motor</option>
                      <option value="Mobil">Mobil</option>
                      <option value="Pickup">Pickup</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Nomor Plat</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editingUser.vehicle?.plate ?? ''}
                        onChange={e => setEditingUser({
                          ...editingUser,
                          vehicle: {
                            ...(editingUser.vehicle as Vehicle),
                            plate: e.target.value.toUpperCase(),
                          }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Warna</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editingUser.vehicle?.color ?? ''}
                        onChange={e => setEditingUser({
                          ...editingUser,
                          vehicle: {
                            ...(editingUser.vehicle as Vehicle),
                            color: e.target.value,
                          }
                        })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Ukuran Maks</label>
                      <select
                        className="form-select"
                        value={editingUser.vehicle?.maxPackageSize ?? 'M'}
                        onChange={e => setEditingUser({
                          ...editingUser,
                          vehicle: {
                            ...(editingUser.vehicle as Vehicle),
                            maxPackageSize: e.target.value as any,
                          }
                        })}
                      >
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rating Driver</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        className="form-input"
                        value={editingUser.rating ?? 4.8}
                        onChange={e => setEditingUser({
                          ...editingUser,
                          rating: parseFloat(e.target.value) || 4.8,
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Adjust Location map button */}
              <div className="form-group">
                <label className="form-label">Lokasi Koordinat Sandbox</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={editingUser.locationName || ''}
                    disabled
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPickMode('pickup');
                      setShowLocationPicker(true);
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: '12px', border: '1.5px solid #2091e7',
                      background: '#e8f4ff', color: '#2091e7', fontWeight: 700, fontSize: '11.5px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: '15px' }}>place</span>
                    Pilih di Peta
                  </button>
                </div>
                {editingUser.location && (
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                    Lat: {editingUser.location.lat.toFixed(5)}, Lng: {editingUser.location.lng.toFixed(5)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Location Picker Map Modal ── */}
      {showLocationPicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: '16px',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '16px',
            width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>Geser / Ketuk Peta untuk set Lokasi</h3>
              <button
                onClick={() => {
                  setShowLocationPicker(false);
                  setPickMode(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div style={{ height: '340px' }}>
              <MapPlaceholder
                height="100%"
                interactive={true}
                pickMode={pickMode}
                onLocationSelect={handleLocationSelect}
                onExitPickMode={() => {
                  setShowLocationPicker(false);
                  setPickMode(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Package / Status Modal overlay ── */}
      {editingPackage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '24px',
            width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Kelola Order #{editingPackage.id.slice(-6)}</h3>
              <button
                onClick={() => setEditingPackage(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePackage} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Status Paket</label>
                <select
                  className="form-select"
                  value={editingPackage.status}
                  onChange={e => setEditingPackage({ ...editingPackage, status: e.target.value as any })}
                >
                  <option value="Draft">Draft</option>
                  <option value="Mencari Driver">Mencari Driver</option>
                  <option value="Menunggu Pick-up">Menunggu Pick-up</option>
                  <option value="Dalam Perjalanan">Dalam Perjalanan</option>
                  <option value="Telah Tiba">Telah Tiba</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tugaskan Driver</label>
                <select
                  className="form-select"
                  value={editingPackage.driverId || 'none'}
                  onChange={e => setEditingPackage({ ...editingPackage, driverId: e.target.value })}
                >
                  <option value="none">Kosongkan Driver</option>
                  {users.filter(u => u.role === 'driver').map(dr => (
                    <option key={dr.id} value={dr.id}>{dr.name} ({dr.vehicle?.type})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-select"
                    value={editingPackage.category}
                    onChange={e => setEditingPackage({ ...editingPackage, category: e.target.value })}
                  >
                    <option value="Dokumen">Dokumen</option>
                    <option value="Makanan">Makanan</option>
                    <option value="Pakaian">Pakaian</option>
                    <option value="Elektronik">Elektronik</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ukuran Barang</label>
                  <select
                    className="form-select"
                    value={editingPackage.weightSize}
                    onChange={e => setEditingPackage({ ...editingPackage, weightSize: e.target.value as any })}
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi Barang</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingPackage.description || ''}
                  onChange={e => setEditingPackage({ ...editingPackage, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Penjemputan</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingPackage.pickupAddress || ''}
                  onChange={e => setEditingPackage({ ...editingPackage, pickupAddress: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Destinasi</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingPackage.dropoffAddress || ''}
                  onChange={e => setEditingPackage({ ...editingPackage, dropoffAddress: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Tarif (Rp)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editingPackage.price}
                    onChange={e => setEditingPackage({ ...editingPackage, price: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fee Detour (Rp)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editingPackage.detourFee || 0}
                    onChange={e => setEditingPackage({ ...editingPackage, detourFee: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPackage(null)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminPanel;
