import React, { useState, useEffect } from 'react';
import { StepHeader } from '../../components/StepHeader';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { VIRTUAL_DRIVERS } from '../../../lib/mockData';
import { findBestDetour } from '../../../lib/matching';
import type { DriverRoute } from '../../../lib/storage';
import * as api from '../../../lib/api';

interface KirimPesanProps {
  navigate: (screen: string) => void;
  draftPackage: any;
  setDraftPackage: (pkg: any) => void;
  driverRoute?: DriverRoute | null;
}

const VEHICLE_ICONS: Record<string, string> = {
  'Motor':  'two_wheeler',
  'Mobil':  'directions_car',
  'Pickup': 'local_shipping',
  'Bus':    'directions_bus',
};

function getVehicleIcon(vehicle: string): string {
  for (const [k, v] of Object.entries(VEHICLE_ICONS)) {
    if (vehicle.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 'two_wheeler';
}

function estTimes(departure: string, detourKm: number): { pickup: string; dropoff: string } {
  const [h, m] = departure.split(':').map(Number);
  const base = h * 60 + (m || 0);
  const pickupMin = base + Math.round(detourKm * 6);
  const dropoffMin = pickupMin + 20;
  const fmt = (total: number) => `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  return { pickup: fmt(pickupMin), dropoff: fmt(dropoffMin) };
}

export const KirimPesan: React.FC<KirimPesanProps> = ({
  navigate,
  draftPackage,
  setDraftPackage,
  driverRoute,
}) => {
  const [deliveryTimeOption, setDeliveryTimeOption] = useState<'Kirim Sekarang'|'Waktu Tertentu'|'Dalam Sehari Ini'>('Kirim Sekarang');
  const [specificTime, setSpecificTime]  = useState('14:00');
  const [selectedDriverId, setSelectedDriverId] = useState<string|null>(null);
  const [matchedDrivers, setMatchedDrivers]     = useState<any[]>([]);

  // Payment checkout state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'GoPay' | 'OVO' | 'Transfer Bank' | 'COD'>('GoPay');

  useEffect(() => {
    if (!draftPackage.pickupCoords || !draftPackage.dropoffCoords) return;

    const list: any[] = [];

    // Custom driver route (if the logged-in user also has an active driver route)
    if (driverRoute && driverRoute.active && driverRoute.waypoints.length >= 2) {
      const match = findBestDetour(driverRoute.waypoints, draftPackage.pickupCoords, draftPackage.dropoffCoords);
      if (match.isMatch) {
        list.push({
          id: 'driver_self',
          name: 'Anda (Rute Aktif)',
          phone: '-',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop&q=80',
          rating: 5.0,
          vehicle: 'Kendaraan Anda',
          vehiclePlate: '-',
          baseFee: 12000,
          detourFeeRate: 2000,
          departureTime: driverRoute.departureTime,
          match,
        });
      }
    }

    // Virtual drivers
    const sizeHierarchy = ['XS', 'S', 'M', 'L', 'XL'];
    VIRTUAL_DRIVERS.forEach(driver => {
      const driverMaxIdx = sizeHierarchy.indexOf(driver.maxPackageSize);
      const pkgIdx = sizeHierarchy.indexOf(draftPackage.weightSize);
      if (pkgIdx > driverMaxIdx) return;

      const match = findBestDetour(driver.routeWaypoints, draftPackage.pickupCoords, draftPackage.dropoffCoords);
      if (match.isMatch) {
        list.push({ ...driver, match });
      }
    });

    list.sort((a, b) => b.match.score - a.match.score);
    setMatchedDrivers(list);
    if (list.length > 0) setSelectedDriverId(list[0].id);
  }, [draftPackage]);

  const selectedDriver = matchedDrivers.find(d => d.id === selectedDriverId);
  const detourFee = selectedDriver ? Math.round(selectedDriver.match.detourDistance * selectedDriver.detourFeeRate) : 0;
  const applicationFee = 2000;
  const totalCost = (draftPackage.price || 0) + detourFee;
  const totalPayable = totalCost + applicationFee;

  const directDrivers = matchedDrivers.filter(d => d.match.detourDistance <= 0.8);
  const detourDrivers = matchedDrivers.filter(d => d.match.detourDistance > 0.8);

  const handleOrder = async () => {
    if (!selectedDriverId || !selectedDriver) {
      alert('Silakan pilih pengemudi terlebih dahulu.');
      return;
    }
    const pkgData = {
      category:        draftPackage.category,
      weightSize:      draftPackage.weightSize,
      photoName:       draftPackage.photoName || '',
      handling:        draftPackage.handling || [],
      description:     draftPackage.description || '',
      pickupAddress:   draftPackage.pickupAddress,
      pickupCoords:    draftPackage.pickupCoords,
      dropoffAddress:  draftPackage.dropoffAddress,
      dropoffCoords:   draftPackage.dropoffCoords,
      deliveryMethod:  draftPackage.deliveryMethod,
      instruction:     draftPackage.instruction || '',
      deliveryTime:    deliveryTimeOption === 'Waktu Tertentu' ? `Jam ${specificTime}` : deliveryTimeOption,
      status:          'Mencari Driver' as const,
      price:           draftPackage.price,
      detourFee,
      driverId:        selectedDriver.id,
      driverName:      selectedDriver.name,
      driverPhone:     selectedDriver.phone,
      driverAvatar:    selectedDriver.avatar || '',
      driverVehicle:   selectedDriver.vehicle || '',
      driverPlate:     selectedDriver.vehiclePlate || '',
      buktiFoto:       null,
      paymentMethod,
      paymentStatus:   paymentMethod === 'COD' ? 'Pending' : 'Lunas',
    };
    try {
      const created = await api.createPackage(pkgData);
      setDraftPackage(created);
      setShowPaymentModal(false);
      navigate('KirimMencariDriver');
    } catch (err: any) {
      alert('Gagal memesan pengiriman: ' + err.message);
    }
  };

  // Auto-order: place order without selecting a specific driver (system finds one)
  const handleAutoOrder = async () => {
    const pkgData = {
      category:        draftPackage.category,
      weightSize:      draftPackage.weightSize,
      photoName:       draftPackage.photoName || '',
      handling:        draftPackage.handling || [],
      description:     draftPackage.description || '',
      pickupAddress:   draftPackage.pickupAddress,
      pickupCoords:    draftPackage.pickupCoords,
      dropoffAddress:  draftPackage.dropoffAddress,
      dropoffCoords:   draftPackage.dropoffCoords,
      deliveryMethod:  draftPackage.deliveryMethod,
      instruction:     draftPackage.instruction || '',
      deliveryTime:    deliveryTimeOption === 'Waktu Tertentu' ? `Jam ${specificTime}` : deliveryTimeOption,
      status:          'Mencari Driver' as const,
      price:           draftPackage.price,
      detourFee:       0,
      driverId:        null,
      driverName:      null,
      driverPhone:     null,
      driverAvatar:    null,
      driverVehicle:   null,
      driverPlate:     null,
      buktiFoto:       null,
      paymentMethod:   'GoPay' as const,
      paymentStatus:   'Pending' as const,
    };
    try {
      const created = await api.createPackage(pkgData as any);
      setDraftPackage(created);
      navigate('KirimMencariDriver');
    } catch (err: any) {
      alert('Gagal memesan pengiriman: ' + err.message);
    }
  };

  const DriverCard = ({ driver }: { driver: any }) => {
    const isSelected = selectedDriverId === driver.id;
    const times = estTimes(driver.departureTime || '08:00', driver.match.detourDistance);
    const fee = Math.round(driver.match.detourDistance * driver.detourFeeRate);
    const isDirect = driver.match.detourDistance <= 0.8;

    return (
      <div
        onClick={() => setSelectedDriverId(driver.id)}
        style={{
          padding: '12px',
          borderRadius: '16px',
          border: `2px solid ${isSelected ? '#2091e7' : '#e2e8f0'}`,
          background: isSelected ? '#e8f4ff' : '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src={driver.avatar}
            alt={driver.name}
            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {driver.name}
            </p>
            <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>
              ⭐ {driver.rating.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Vehicle icon + times */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-icons" style={{ fontSize: '16px', color: '#64748b' }}>
            {getVehicleIcon(driver.vehicle)}
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>↗{times.pickup}</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>↘{times.dropoff}</span>
        </div>

        {/* Badge */}
        {isDirect ? (
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#065f46', background: '#d1fae5', padding: '2px 7px', borderRadius: '6px', alignSelf: 'flex-start' }}>
            Rute Langsung
          </span>
        ) : (
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 7px', borderRadius: '6px', alignSelf: 'flex-start' }}>
            +Rp {fee.toLocaleString('id-ID')}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="screen-content">
      {/* Header */}
      <div className="screen-header" style={{ margin: '-20px -20px 0 -20px' }}>
        <button onClick={() => navigate('KirimRute')} className="back-pill">
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="header-title" style={{ fontWeight: 700, fontSize: '17px' }}>Pilih Waktu & Driver</h1>
      </div>

      <StepHeader currentStep={3} />

      {/* Map preview */}
      <MapPlaceholder
        pickupPoint={draftPackage.pickupCoords}
        dropoffPoint={draftPackage.dropoffCoords}
        height="160px"
        interactive={false}
      />

      {/* ── Waktu Pengiriman ── */}
      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-icons" style={{ fontSize: '20px', color: '#2091e7' }}>schedule</span>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>Waktu Pengiriman</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {(['Kirim Sekarang', 'Waktu Tertentu', 'Dalam Sehari Ini'] as const).map(opt => (
            <div
              key={opt}
              onClick={() => setDeliveryTimeOption(opt)}
              className={`chip ${deliveryTimeOption === opt ? 'active' : ''}`}
              style={{ fontSize: '12px' }}
            >
              {opt}
            </div>
          ))}
        </div>

        {deliveryTimeOption === 'Waktu Tertentu' && (
          <input
            type="time"
            value={specificTime}
            onChange={e => setSpecificTime(e.target.value)}
            className="form-input"
            style={{ marginTop: '4px' }}
          />
        )}
      </div>

      {/* ── Driver List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>
            Rekomendasi Komuter ({matchedDrivers.length})
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>deviasi maks 3km</span>
        </div>

        {matchedDrivers.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '30px 16px',
            background: '#f8fafc', borderRadius: '20px',
            border: '1px dashed #cbd5e1',
          }}>
            <span className="material-icons" style={{ fontSize: '40px', color: '#94a3b8' }}>search_off</span>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>
              Tidak ada driver searah
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Pastikan rute driver aktif di tab lain atau coba lokasi berbeda.
            </p>
          </div>
        ) : (
          <>
            {/* Direct drivers */}
            {directDrivers.length > 0 && (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#065f46', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-icons" style={{ fontSize: '14px' }}>check_circle</span>
                  Rute Langsung ({directDrivers.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {directDrivers.map(d => <DriverCard key={d.id} driver={d} />)}
                </div>
              </div>
            )}

            {/* Detour drivers */}
            {detourDrivers.length > 0 && (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-icons" style={{ fontSize: '14px' }}>alt_route</span>
                  Rute dengan Simpangan ({detourDrivers.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {detourDrivers.map(d => <DriverCard key={d.id} driver={d} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Auto-Order Button ── */}
      <div style={{
        padding: '16px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: '1.5px solid #86efac',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <button
          onClick={handleAutoOrder}
          style={{
            width: '100%',
            padding: '13px 16px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #34d399, #059669)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
            transition: 'all 0.2s',
          }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>auto_awesome</span>
          Pesan Sekarang (Otomatis)
        </button>
        <p style={{
          fontSize: '11px',
          color: '#166534',
          margin: 0,
          lineHeight: 1.5,
          textAlign: 'center',
        }}>
          🤖 Tombol ini akan mengirim pesanan ke sistem secara otomatis. Sistem akan mencarikan driver yang searah dan tersedia tanpa perlu memilih manual.
        </p>
      </div>


      {selectedDriver && (
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Rincian Biaya</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tarif Dasar</span>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                Rp {(draftPackage.price || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Biaya Simpangan</span>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                Rp {detourFee.toLocaleString('id-ID')}
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '16px', fontWeight: 800, color: '#1e293b',
              paddingTop: '8px', borderTop: '1px solid #f1f5f9',
            }}>
              <span>Subtotal</span>
              <span style={{ color: '#2091e7' }}>Rp {totalCost.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button onClick={() => setShowPaymentModal(true)} className="btn-primary">
            <span className="material-icons">payment</span>
            Bayar & Pesan Sekarang
          </button>
        </div>
      )}

      {/* ── Secure Payment Modal Overlay ── */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div className="premium-card" style={{
            width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '24px',
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease-out',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons" style={{ color: '#2091e7', fontSize: '22px' }}>security</span>
                <span style={{ fontSize: '16px', fontWeight: 800 }}>Pembayaran Aman</span>
              </div>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <span className="material-icons" style={{ color: '#64748b' }}>close</span>
              </button>
            </div>

            {/* Price breakdown */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Jasa Logistik</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>Rp {(draftPackage.price || 0).toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Detour Surcharge ({selectedDriver?.match.detourDistance} km)</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>Rp {detourFee.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Biaya Layanan Aplikasi</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>Rp {applicationFee.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                <span>Total Bayar</span>
                <span style={{ color: '#2091e7' }}>Rp {totalPayable.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Payment options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>Pilih Metode Pembayaran</span>
              
              {/* GoPay */}
              <div
                onClick={() => setPaymentMethod('GoPay')}
                style={{
                  padding: '12px 16px', borderRadius: '14px', border: `2px solid ${paymentMethod === 'GoPay' ? '#00a5cf' : '#e2e8f0'}`,
                  background: paymentMethod === 'GoPay' ? '#eefbfe' : '#fff', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#00a5cf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ color: '#fff', fontSize: '16px' }}>account_balance_wallet</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>GoPay</span>
                </div>
                {paymentMethod === 'GoPay' && <span className="material-icons" style={{ color: '#00a5cf', fontSize: '20px' }}>check_circle</span>}
              </div>

              {/* OVO */}
              <div
                onClick={() => setPaymentMethod('OVO')}
                style={{
                  padding: '12px 16px', borderRadius: '14px', border: `2px solid ${paymentMethod === 'OVO' ? '#4c2a86' : '#e2e8f0'}`,
                  background: paymentMethod === 'OVO' ? '#f5f3ff' : '#fff', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#4c2a86', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ color: '#fff', fontSize: '16px' }}>stars</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>OVO</span>
                </div>
                {paymentMethod === 'OVO' && <span className="material-icons" style={{ color: '#4c2a86', fontSize: '20px' }}>check_circle</span>}
              </div>

              {/* Bank Transfer */}
              <div
                onClick={() => setPaymentMethod('Transfer Bank')}
                style={{
                  padding: '12px 16px', borderRadius: '14px', border: `2px solid ${paymentMethod === 'Transfer Bank' ? '#2091e7' : '#e2e8f0'}`,
                  background: paymentMethod === 'Transfer Bank' ? '#e8f4ff' : '#fff', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#2091e7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ color: '#fff', fontSize: '16px' }}>account_balance</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Transfer Bank (VA BCA/Mandiri)</span>
                </div>
                {paymentMethod === 'Transfer Bank' && <span className="material-icons" style={{ color: '#2091e7', fontSize: '20px' }}>check_circle</span>}
              </div>

              {/* COD */}
              <div
                onClick={() => setPaymentMethod('COD')}
                style={{
                  padding: '12px 16px', borderRadius: '14px', border: `2px solid ${paymentMethod === 'COD' ? '#f59e0b' : '#e2e8f0'}`,
                  background: paymentMethod === 'COD' ? '#fffbeb' : '#fff', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ color: '#fff', fontSize: '16px' }}>payments</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Cash on Delivery (COD)</span>
                </div>
                {paymentMethod === 'COD' && <span className="material-icons" style={{ color: '#f59e0b', fontSize: '20px' }}>check_circle</span>}
              </div>
            </div>

            {/* Confirm Payment button */}
            <button onClick={handleOrder} className="btn-primary" style={{ marginTop: '6px', padding: '14px' }}>
              <span className="material-icons">check_circle</span>
              Konfirmasi Pembayaran
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default KirimPesan;
