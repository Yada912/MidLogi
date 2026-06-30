import React, { useState, useEffect } from 'react';
import { StepHeader } from '../../components/StepHeader';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { VIRTUAL_DRIVERS } from '../../../lib/mockData';
import { findBestDetour } from '../../../lib/matching';
import { getDriverRoute, type Package } from '../../../lib/storage';

interface KirimPesanProps {
  navigate: (screen: string) => void;
  draftPackage: any;
  setDraftPackage: (pkg: any) => void;
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

// Compute simple estimated times from driver departure
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
}) => {
  const [deliveryTimeOption, setDeliveryTimeOption] = useState<'Kirim Sekarang'|'Waktu Tertentu'|'Dalam Sehari Ini'>('Kirim Sekarang');
  const [specificTime, setSpecificTime]  = useState('14:00');
  const [selectedDriverId, setSelectedDriverId] = useState<string|null>(null);
  const [matchedDrivers, setMatchedDrivers]     = useState<any[]>([]);

  useEffect(() => {
    if (!draftPackage.pickupCoords || !draftPackage.dropoffCoords) return;

    const list: any[] = [];

    // Custom driver route (sandbox tab 2)
    const customRoute = getDriverRoute();
    if (customRoute.active && customRoute.waypoints.length >= 2) {
      const match = findBestDetour(customRoute.waypoints, draftPackage.pickupCoords, draftPackage.dropoffCoords);
      if (match.isMatch) {
        list.push({
          id: 'driver_self',
          name: 'Anda (Tab Driver)',
          phone: '0857-9988-7766',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop&q=80',
          rating: 5.0,
          vehicle: 'Motor Anda',
          vehiclePlate: 'B 9876 XYZ',
          baseFee: 12000,
          detourFeeRate: 2000,
          departureTime: customRoute.departureTime,
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
  const totalCost = (draftPackage.price || 0) + detourFee;

  const directDrivers = matchedDrivers.filter(d => d.match.detourDistance <= 0.8);
  const detourDrivers = matchedDrivers.filter(d => d.match.detourDistance > 0.8);

  const handleOrder = () => {
    if (!selectedDriverId || !selectedDriver) {
      alert('Silakan pilih pengemudi terlebih dahulu.');
      return;
    }
    const newPkg: Package = {
      id: 'pkg_' + Date.now(),
      category:        draftPackage.category,
      weightSize:      draftPackage.weightSize,
      photoName:       draftPackage.photoName,
      handling:        draftPackage.handling,
      description:     draftPackage.description,
      pickupAddress:   draftPackage.pickupAddress,
      pickupCoords:    draftPackage.pickupCoords,
      dropoffAddress:  draftPackage.dropoffAddress,
      dropoffCoords:   draftPackage.dropoffCoords,
      deliveryMethod:  draftPackage.deliveryMethod,
      instruction:     draftPackage.instruction,
      deliveryTime:    deliveryTimeOption === 'Waktu Tertentu' ? `Jam ${specificTime}` : deliveryTimeOption,
      status:          'Mencari Driver',
      price:           draftPackage.price,
      detourFee,
      driverId:        selectedDriver.id,
      driverName:      selectedDriver.name,
      driverPhone:     selectedDriver.phone,
      driverAvatar:    selectedDriver.avatar,
      driverVehicle:   selectedDriver.vehicle,
      driverPlate:     selectedDriver.vehiclePlate,
      buktiFoto:       null,
      createdAt:       new Date().toISOString(),
    };
    setDraftPackage(newPkg);
    navigate('KirimMencariDriver');
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

      {/* ── Order Summary ── */}
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
              <span>Total</span>
              <span style={{ color: '#2091e7' }}>Rp {totalCost.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button onClick={handleOrder} className="btn-primary">
            <span className="material-icons">payment</span>
            Bayar & Pesan Sekarang
          </button>
        </div>
      )}
    </div>
  );
};
export default KirimPesan;
