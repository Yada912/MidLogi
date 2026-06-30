import React, { useState, useEffect } from 'react';
import { StepHeader } from '../../components/StepHeader';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { LOCATION_PRESETS, type LocationPreset } from '../../../lib/mockData';
import { getDistance } from '../../../lib/matching';
import type { Coordinate } from '../../../lib/mockData';

interface KirimRuteProps {
  navigate: (screen: string) => void;
  draftPackage: any;
  setDraftPackage: (pkg: any) => void;
}

const DELIVERY_METHODS = [
  { key: 'Bertemu Langsung',      icon: 'person',     label: 'Bertemu Driver' },
  { key: 'Tinggalkan di Lokasi',  icon: 'home_work',  label: 'Tinggalkan di Lokasi' },
];

export const KirimRute: React.FC<KirimRuteProps> = ({
  navigate,
  draftPackage,
  setDraftPackage,
}) => {
  const [pickupAddress, setPickupAddress]   = useState(draftPackage.pickupAddress  || '');
  const [pickupCoords,  setPickupCoords]    = useState<Coordinate|null>(draftPackage.pickupCoords  || null);
  const [dropoffAddress, setDropoffAddress] = useState(draftPackage.dropoffAddress || '');
  const [dropoffCoords,  setDropoffCoords]  = useState<Coordinate|null>(draftPackage.dropoffCoords || null);
  const [deliveryMethod, setDeliveryMethod] = useState<'Bertemu Langsung'|'Tinggalkan di Lokasi'>(
    draftPackage.deliveryMethod || 'Bertemu Langsung'
  );
  const [instruction,  setInstruction]  = useState(draftPackage.instruction  || '');
  const [distance,     setDistance]     = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [pickMode, setPickMode] = useState<'pickup'|'dropoff'|null>(null);

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const d = getDistance(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
      setDistance(parseFloat(d.toFixed(2)));
      setEstimatedPrice(Math.round(10000 + d * 3000));
    } else {
      setDistance(0);
      setEstimatedPrice(0);
    }
  }, [pickupCoords, dropoffCoords]);

  const selectPreset = (type: 'pickup'|'dropoff', preset: LocationPreset) => {
    if (type === 'pickup') {
      setPickupAddress(preset.address);
      setPickupCoords({ lat: preset.lat, lng: preset.lng });
    } else {
      setDropoffAddress(preset.address);
      setDropoffCoords({ lat: preset.lat, lng: preset.lng });
    }
    setPickMode(null);
  };

  const handleLocationSelect = (coord: Coordinate, address: string, type: 'pickup'|'dropoff') => {
    if (type === 'pickup') {
      setPickupCoords(coord);
      setPickupAddress(address);
    } else {
      setDropoffCoords(coord);
      setDropoffAddress(address);
    }
    setPickMode(null);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupCoords || !dropoffCoords) {
      alert('Silakan tentukan titik penjemputan dan pengantaran terlebih dahulu.');
      return;
    }
    setDraftPackage({
      ...draftPackage,
      pickupAddress, pickupCoords,
      dropoffAddress, dropoffCoords,
      deliveryMethod, instruction,
      price: estimatedPrice,
    });
    navigate('KirimPesan');
  };

  return (
    <div className="screen-content">
      {/* Header */}
      <div className="screen-header" style={{ margin: '-20px -20px 0 -20px' }}>
        <button onClick={() => navigate('KirimDetail')} className="back-pill">
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="header-title" style={{ fontWeight: 700, fontSize: '17px' }}>Rute Pengiriman</h1>
      </div>

      <StepHeader currentStep={2} />

      {/* ── Map ── */}
      <MapPlaceholder
        pickupPoint={pickupCoords ?? undefined}
        dropoffPoint={dropoffCoords ?? undefined}
        height="220px"
        interactive={true}
        pickMode={pickMode}
        onLocationSelect={handleLocationSelect}
        onExitPickMode={() => setPickMode(null)}
      />

      {/* Pick mode cancel bar - shown above map on mobile */}
      {pickMode && (
        <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '4px 0' }}>
          Ketuk peta → pilih pin temp → tekan <strong>Konfirmasi</strong>
        </div>
      )}

      {/* ── Distance & Price ── */}
      {distance > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', borderRadius: '14px',
          background: 'rgba(32,145,231,0.07)', border: '1px solid rgba(32,145,231,0.15)',
        }}>
          <div>
            <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Estimasi Jarak</p>
            <p style={{ fontSize: '17px', fontWeight: 800, color: '#2091e7', margin: 0 }}>{distance} km</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Estimasi Tarif</p>
            <p style={{ fontSize: '17px', fontWeight: 800, color: '#2091e7', margin: 0 }}>
              Rp {estimatedPrice.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* ── Pickup ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-icons" style={{ fontSize: '16px', color: '#10b981' }}>location_on</span>
            Alamat Penjemputan <span style={{ color: '#ef4444' }}>*</span>
          </label>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Masukkan atau pilih titik jemput..."
              value={pickupAddress}
              onChange={e => { setPickupAddress(e.target.value); if (pickupCoords) setPickupCoords(null); }}
              className="form-input"
              required
              style={{ paddingRight: '44px' }}
            />
            {pickupCoords && (
              <span className="material-icons" style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                color: '#10b981', fontSize: '20px',
              }}>check_circle</span>
            )}
          </div>

          {/* Quick-action chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setPickMode(pickMode === 'pickup' ? null : 'pickup')}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 12px', borderRadius: '12px', border: '1.5px solid',
                borderColor: pickMode === 'pickup' ? '#2091e7' : '#cbd5e1',
                background: pickMode === 'pickup' ? '#e8f4ff' : '#ffffff',
                color: pickMode === 'pickup' ? '#2091e7' : '#475569',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <span className="material-icons" style={{ fontSize: '14px' }}>map</span>
              Pilih lewat peta
            </button>
            {LOCATION_PRESETS.slice(0, 3).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset('pickup', p)}
                style={{
                  padding: '6px 12px', borderRadius: '12px',
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#475569',
                }}
              >
                📍 {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Dropoff ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-icons" style={{ fontSize: '16px', color: '#ef4444' }}>flag</span>
            Alamat Destinasi <span style={{ color: '#ef4444' }}>*</span>
          </label>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Masukkan atau pilih titik antar..."
              value={dropoffAddress}
              onChange={e => { setDropoffAddress(e.target.value); if (dropoffCoords) setDropoffCoords(null); }}
              className="form-input"
              required
              style={{ paddingRight: '44px' }}
            />
            {dropoffCoords && (
              <span className="material-icons" style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                color: '#10b981', fontSize: '20px',
              }}>check_circle</span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setPickMode(pickMode === 'dropoff' ? null : 'dropoff')}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 12px', borderRadius: '12px', border: '1.5px solid',
                borderColor: pickMode === 'dropoff' ? '#ef4444' : '#cbd5e1',
                background: pickMode === 'dropoff' ? '#fef2f2' : '#ffffff',
                color: pickMode === 'dropoff' ? '#ef4444' : '#475569',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <span className="material-icons" style={{ fontSize: '14px' }}>map</span>
              Pilih lewat peta
            </button>
            {LOCATION_PRESETS.slice(0, 3).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset('dropoff', p)}
                style={{
                  padding: '6px 12px', borderRadius: '12px',
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#475569',
                }}
              >
                🏁 {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Metode Serah Terima ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Metode Penyerahan
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {DELIVERY_METHODS.map(m => {
              const active = deliveryMethod === m.key;
              return (
                <div
                  key={m.key}
                  onClick={() => setDeliveryMethod(m.key as typeof deliveryMethod)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '14px 8px', borderRadius: '16px', cursor: 'pointer',
                    border: `2px solid ${active ? '#2091e7' : '#e2e8f0'}`,
                    background: active ? '#e8f4ff' : '#ffffff',
                    transition: 'all 0.2s',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '24px', color: active ? '#2091e7' : '#94a3b8' }}>
                    {m.icon}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: active ? '#2091e7' : '#64748b', textAlign: 'center' }}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Instruksi ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Instruksi Tambahan
          </label>
          <input
            type="text"
            placeholder="e.g., Titip ke satpam, bel kiri, dll."
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            className="form-input"
          />
        </div>

        <button type="submit" className="btn-primary">
          Lanjut
          <span className="material-icons">arrow_forward</span>
        </button>
      </form>
    </div>
  );
};
export default KirimRute;
