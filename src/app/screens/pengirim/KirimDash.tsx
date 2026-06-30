import React from 'react';
import { type Package, savePackages, getPackages } from '../../../lib/storage';
import { MapPlaceholder } from '../../components/MapPlaceholder';

interface KirimDashProps {
  navigate: (screen: string) => void;
  packages: Package[];
  setSelectedTab: (tab: string) => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: string; step: number }> = {
  'Mencari Driver':    { bg: '#dbeafe', text: '#2563eb', icon: 'search',          step: 0 },
  'Menunggu Pick-up':  { bg: '#fef3c7', text: '#d97706', icon: 'schedule',         step: 1 },
  'Dalam Perjalanan':  { bg: '#e0f2fe', text: '#0369a1', icon: 'local_shipping',   step: 2 },
  'Telah Tiba':        { bg: '#d1fae5', text: '#065f46', icon: 'check_circle',     step: 3 },
  'Dibatalkan':        { bg: '#fee2e2', text: '#991b1b', icon: 'cancel',           step: -1 },
};

const STEPS = ['Penjemputan', 'Perjalanan', 'Tiba'];

export const KirimDash: React.FC<KirimDashProps> = ({
  navigate,
  packages,
  setSelectedTab,
}) => {
  const activePackages = packages.filter(
    p => p.status !== 'Telah Tiba' && p.status !== 'Dibatalkan'
  );

  const handleCancel = (pkgId: string) => {
    if (confirm('Batalkan pengiriman ini?')) {
      const all = getPackages();
      savePackages(all.map(p => p.id === pkgId ? { ...p, status: 'Dibatalkan' as const } : p));
    }
  };

  return (
    <div className="screen-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>Dashboard Pengiriman</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Pantau paket aktif Anda</p>
        </div>
        <button
          onClick={() => navigate('KirimDetail')}
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
            color: '#fff', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(32,145,231,0.35)',
          }}
        >
          <span className="material-icons">add</span>
        </button>
      </div>

      {activePackages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <span className="material-icons" style={{ fontSize: '56px', color: '#cbd5e1', marginBottom: '12px', display: 'block' }}>
            local_post_office
          </span>
          <p style={{ fontSize: '14px', fontWeight: 600 }}>Tidak Ada Paket Aktif</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            Ketuk tombol "+" di sudut kanan atas.
          </p>
        </div>
      ) : (
        <>
          {/* Map showing first active package route */}
          <MapPlaceholder
            pickupPoint={activePackages[0]?.pickupCoords}
            dropoffPoint={activePackages[0]?.dropoffCoords}
            height="200px"
            interactive={false}
          />

          {/* Package cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activePackages.map(pkg => {
              const cfg = STATUS_CONFIG[pkg.status] ?? STATUS_CONFIG['Mencari Driver'];
              const isWaiting   = pkg.status === 'Menunggu Pick-up';
              const isTransit   = pkg.status === 'Dalam Perjalanan';

              return (
                <div
                  key={pkg.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Status header */}
                  <div style={{
                    padding: '12px 16px',
                    background: cfg.bg,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  }}>
                    <span className="material-icons" style={{ fontSize: '16px', color: cfg.text }}>{cfg.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.text }}>{pkg.status}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: cfg.text, opacity: 0.7 }}>
                      {new Date(pkg.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* Package info */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Category + size */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                        {pkg.category}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: '6px',
                          background: '#e2e8f0', color: '#475569',
                          fontSize: '11px', fontWeight: 700,
                        }}>
                          {pkg.weightSize}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#2091e7' }}>
                          Rp {(pkg.price + (pkg.detourFee || 0)).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Route */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#10b981', marginTop: '1px' }}>location_on</span>
                        <span style={{ color: '#475569', lineHeight: 1.4 }}>{pkg.pickupAddress}</span>
                      </div>
                      <div style={{ width: '1px', height: '10px', borderLeft: '2px dashed #94a3b8', marginLeft: '7px' }} />
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#ef4444', marginTop: '1px' }}>flag</span>
                        <span style={{ color: '#475569', lineHeight: 1.4 }}>{pkg.dropoffAddress}</span>
                      </div>
                    </div>

                    {/* Driver info */}
                    {pkg.driverName && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', borderRadius: '12px', background: '#f8fafc',
                      }}>
                        <img
                          src={pkg.driverAvatar || 'https://ui-avatars.com/api/?name=Driver'}
                          alt={pkg.driverName}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: 700, margin: 0 }}>{pkg.driverName}</p>
                          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>
                            {pkg.driverVehicle} · {pkg.driverPlate}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        {STEPS.map((step, i) => {
                          const stepIdx = cfg.step - 1;
                          const isStepActive = i === stepIdx;
                          const isStepDone   = i < stepIdx;
                          return (
                            <span key={step} style={{
                              fontSize: '9px', fontWeight: isStepActive || isStepDone ? 700 : 500,
                              color: isStepActive ? '#2091e7' : isStepDone ? '#10b981' : '#94a3b8',
                            }}>
                              {isStepDone ? '✓ ' : ''}{step}
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: isWaiting ? '33%' : isTransit ? '66%' : '10%',
                          background: 'linear-gradient(90deg, #8eadf0, #2091e7)',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedTab('chat')}
                        className="btn-secondary"
                        style={{ flex: 1, padding: '9px', fontSize: '12px', borderRadius: '12px' }}
                      >
                        <span className="material-icons" style={{ fontSize: '15px' }}>chat</span>
                        Hubungi Driver
                      </button>
                      {isWaiting && (
                        <button
                          onClick={() => handleCancel(pkg.id)}
                          style={{
                            flex: 1, padding: '9px', fontSize: '12px', borderRadius: '12px',
                            border: '1.5px solid #fca5a5', background: '#fef2f2',
                            color: '#dc2626', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: '15px' }}>cancel</span>
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button
        onClick={() => navigate('KirimRiwayat')}
        className="btn-secondary"
        style={{ marginTop: '4px' }}
      >
        <span className="material-icons">history</span>
        Lihat Riwayat Pengiriman
      </button>
    </div>
  );
};
export default KirimDash;
