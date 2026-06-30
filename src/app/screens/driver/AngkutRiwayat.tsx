import React, { useState, useEffect } from 'react';
import type { Package } from '../../../lib/storage';
import { PackageCard } from '../../components/PackageCard';

interface AngkutRiwayatProps {
  navigate: (screen: string) => void;
  packages: Package[];
}

export const AngkutRiwayat: React.FC<AngkutRiwayatProps> = ({
  navigate,
  packages,
}) => {
  const [earnings, setEarnings] = useState(0);

  // Load accumulated earnings on mount
  useEffect(() => {
    const total = parseFloat(localStorage.getItem('kirimin_driver_earnings') || '0');
    setEarnings(total);
  }, [packages]);

  // Filter packages delivered by this driver
  const myHistory = packages.filter(
    (p) => p.driverId === 'driver_self' && p.status === 'Telah Tiba'
  );

  return (
    <div className="screen-content">
      {/* Header */}
      <div className="screen-header" style={{ margin: '-20px -20px 0 -20px' }}>
        <button onClick={() => navigate('Homepage')} className="back-pill">
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="header-title">Pendapatan & Riwayat</h1>
      </div>

      {/* Financial Summary Card */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '24px',
          padding: '24px 20px',
          color: '#ffffff',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9 }}>
          TOTAL AKUMULASI PENDAPATAN
        </span>
        <h2 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>
          Rp {earnings.toLocaleString('id-ID')}
        </h2>
        <span style={{ fontSize: '11px', opacity: 0.8 }}>
          Dari hasil hitchhiking {myHistory.length} paket
        </span>
      </div>

      {/* History List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: '700' }}>Perjalanan Selesai ({myHistory.length})</span>

        {myHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <span className="material-icons" style={{ fontSize: '56px', color: '#cbd5e1', marginBottom: '12px' }}>
              payments
            </span>
            <p style={{ fontSize: '14px', fontWeight: 500 }}>Belum Ada Pendapatan</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Selesaikan pengantaran paket Anda untuk mendapatkan komisi "Uang Bensin" tambahan.
            </p>
          </div>
        ) : (
          myHistory.map((pkg) => (
            <div 
              key={pkg.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                padding: '4px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <PackageCard pkg={pkg} showDetails={false} />
              
              {/* Income detail and thumbnail */}
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 16px 12px 16px',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {pkg.buktiFoto && (
                    <img 
                      src={pkg.buktiFoto} 
                      alt="Proof"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  )}
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                    ✓ Terkirim
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Pendapatan Anda</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                    + Rp {(pkg.price + pkg.detourFee).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default AngkutRiwayat;
