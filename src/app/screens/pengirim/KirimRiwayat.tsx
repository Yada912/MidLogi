import React, { useState } from 'react';
import type { Package } from '../../../lib/storage';

interface KirimRiwayatProps {
  navigate: (screen: string) => void;
  packages: Package[];
  setDraftPackage: (pkg: any) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Telah Tiba':  { bg: '#d1fae5', text: '#065f46' },
  'Dibatalkan':  { bg: '#fee2e2', text: '#991b1b' },
};

export const KirimRiwayat: React.FC<KirimRiwayatProps> = ({
  navigate,
  packages,
  setDraftPackage,
}) => {
  const [filter, setFilter] = useState<'semua' | 'Telah Tiba' | 'Dibatalkan'>('semua');
  const [selectedBuktiUrl, setSelectedBuktiUrl] = useState<string | null>(null);

  const archived = packages.filter(p => p.status === 'Telah Tiba' || p.status === 'Dibatalkan');
  const filtered = filter === 'semua' ? archived : archived.filter(p => p.status === filter);

  const handleKirimLagi = (pkg: Package) => {
    setDraftPackage({
      category: pkg.category,
      weightSize: pkg.weightSize,
      photoName: pkg.photoName,
      handling: pkg.handling,
      description: pkg.description,
      pickupAddress: pkg.pickupAddress,
      pickupCoords: pkg.pickupCoords,
      dropoffAddress: pkg.dropoffAddress,
      dropoffCoords: pkg.dropoffCoords,
      deliveryMethod: pkg.deliveryMethod,
      instruction: pkg.instruction,
      price: pkg.price,
    });
    navigate('KirimDetail');
  };

  return (
    <div className="screen-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>Riwayat Pengiriman</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            {archived.length} total transaksi
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['semua', 'Telah Tiba', 'Dibatalkan'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 16px', borderRadius: '20px', border: '1.5px solid',
              borderColor: filter === f ? '#2091e7' : '#e2e8f0',
              background: filter === f ? '#e8f4ff' : '#fff',
              color: filter === f ? '#2091e7' : '#64748b',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {f === 'Telah Tiba' && <span className="material-icons" style={{ fontSize: '14px' }}>check_circle</span>}
            {f === 'Dibatalkan' && <span className="material-icons" style={{ fontSize: '14px' }}>cancel</span>}
            {f === 'semua' ? `Semua (${archived.length})` : f}
          </button>
        ))}
      </div>

      {/* Package list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="material-icons" style={{ fontSize: '48px', color: '#cbd5e1', display: 'block', marginBottom: '12px' }}>
              archive
            </span>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Belum ada riwayat</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Paket yang sudah terkirim atau dibatalkan akan muncul di sini.
            </p>
          </div>
        ) : (
          filtered.map(pkg => {
            const cfg = STATUS_COLORS[pkg.status] ?? { bg: '#f1f5f9', text: '#475569' };
            return (
              <div
                key={pkg.id}
                style={{
                  background: '#fff', borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}
              >
                {/* Status strip */}
                <div style={{
                  background: cfg.bg, padding: '8px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.text }}>
                    {pkg.status === 'Telah Tiba' ? '✅ Terkirim' : '❌ Dibatalkan'}
                  </span>
                  <span style={{ fontSize: '11px', color: cfg.text, opacity: 0.7 }}>
                    {new Date(pkg.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* Package info */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Category + size */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>{pkg.category}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 9px', borderRadius: '6px',
                        background: '#e2e8f0', color: '#475569',
                        fontSize: '11px', fontWeight: 700,
                      }}>{pkg.weightSize}</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#2091e7' }}>
                        Rp {(pkg.price + (pkg.detourFee || 0)).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Route summary */}
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="material-icons" style={{ fontSize: '14px', color: '#10b981' }}>location_on</span>
                    {pkg.pickupAddress.split(',')[0]}
                    <span className="material-icons" style={{ fontSize: '14px' }}>arrow_right_alt</span>
                    <span className="material-icons" style={{ fontSize: '14px', color: '#ef4444' }}>flag</span>
                    {pkg.dropoffAddress.split(',')[0]}
                  </div>

                  {/* Driver */}
                  {pkg.driverName && (
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-icons" style={{ fontSize: '14px' }}>person</span>
                      {pkg.driverName}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {pkg.status === 'Telah Tiba' && pkg.buktiFoto && (
                      <button
                        onClick={() => setSelectedBuktiUrl(pkg.buktiFoto)}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '10px',
                          border: '1.5px solid #bbf7d0', background: '#f0fdf4',
                          color: '#065f46', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: '14px' }}>photo_library</span>
                        Bukti Foto
                      </button>
                    )}
                    <button
                      onClick={() => handleKirimLagi(pkg)}
                      className="btn-primary"
                      style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '10px' }}
                    >
                      <span className="material-icons" style={{ fontSize: '14px' }}>replay</span>
                      Kirim Lagi
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Proof modal */}
      {selectedBuktiUrl && (
        <div
          onClick={() => setSelectedBuktiUrl(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.85)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '380px',
              padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Foto Bukti Penyerahan</span>
              <button onClick={() => setSelectedBuktiUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-icons" style={{ color: '#64748b' }}>close</span>
              </button>
            </div>
            <img src={selectedBuktiUrl} alt="Bukti Foto" style={{ width: '100%', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
            <button onClick={() => setSelectedBuktiUrl(null)} className="btn-primary" style={{ padding: '10px', fontSize: '13px' }}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default KirimRiwayat;
