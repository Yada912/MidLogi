import React, { useState } from 'react';
import type { Package, UserProfile } from '../../../lib/storage';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { BuktiKameraMock } from '../../components/BuktiKameraMock';
import * as api from '../../../lib/api';

interface AngkutProsesProps {
  navigate: (screen: string) => void;
  packages: Package[];
  userProfile: UserProfile;
}

export const AngkutProses: React.FC<AngkutProsesProps> = ({ navigate, packages, userProfile }) => {
  const [activeCameraPkgId, setActiveCameraPkgId] = useState<string | null>(null);

  // Filter packages carried by this driver that are not finished
  const activeJobs = packages.filter(
    (p) => p.driverId === userProfile.id && p.status !== 'Telah Tiba' && p.status !== 'Dibatalkan'
  );

  const handlePickup = async (pkgId: string) => {
    try {
      await api.updatePackage(pkgId, { status: 'Dalam Perjalanan' });
    } catch (err: any) {
      alert('Gagal konfirmasi pick-up: ' + err.message);
    }
  };

  const handleDropoffClick = (pkgId: string) => {
    setActiveCameraPkgId(pkgId);
  };

  const handleCaptureSuccess = async (imageUri: string) => {
    if (!activeCameraPkgId) return;

    const completedPkg = packages.find(p => p.id === activeCameraPkgId);
    if (!completedPkg) return;

    try {
      // Update package status and proof photo in Supabase
      await api.updatePackage(activeCameraPkgId, { 
        status: 'Telah Tiba',
        buktiFoto: imageUri
      });

      // Add to driver earnings in Supabase profiles table
      const earning = completedPkg.price + (completedPkg.detourFee ?? 0);
      await api.addEarnings(userProfile.id, earning);
    } catch (err: any) {
      alert('Gagal konfirmasi drop-off: ' + err.message);
    } finally {
      setActiveCameraPkgId(null);
    }
  };

  if (activeJobs.length === 0) {
    return (
      <div className="screen-content" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div 
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d1fae5 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            marginBottom: '16px',
          }}
        >
          <span className="material-icons" style={{ fontSize: '40px' }}>task_alt</span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Semua Tugas Selesai!</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', maxWidth: '280px', lineHeight: 1.5 }}>
          Kerja bagus! Seluruh barang titipan telah sukses diantarkan ke lokasi tujuan masing-masing.
        </p>
        <button 
          onClick={() => navigate('Homepage')} 
          className="btn-primary" 
          style={{ marginTop: '20px', maxWidth: '200px' }}
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="screen-content" style={{ padding: 0, gap: 0 }}>
      {/* Header */}
      <div className="screen-header" style={{ borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => navigate('AngkutDash')} className="back-pill">
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="header-title">Proses Pengantaran</h1>
      </div>

      {/* Map showing current package rute */}
      <div style={{ height: '180px', width: '100%' }}>
        <MapPlaceholder 
          pickupPoint={activeJobs[0]?.pickupCoords}
          dropoffPoint={activeJobs[0]?.dropoffCoords}
          height="100%"
        />
      </div>

      {/* Task List */}
      <div 
        style={{
          flex: 1,
          background: '#f4f7fc',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
          DAFTAR TUGAS AKTIF ({activeJobs.length})
        </span>

        {activeJobs.map((job) => {
          const isWaitingPickup = job.status === 'Menunggu Pick-up';

          return (
            <div 
              key={job.id}
              className="premium-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderLeft: isWaitingPickup ? '5px solid #f59e0b' : '5px solid #2091e7',
              }}
            >
              {/* Top Meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>
                  {job.category} ({job.weightSize})
                </span>
                <span 
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isWaitingPickup ? '#d97706' : '#0369a1',
                    background: isWaitingPickup ? '#fef3c7' : '#e0f2fe',
                    padding: '2px 8px',
                    borderRadius: '8px',
                  }}
                >
                  {job.status}
                </span>
              </div>

              {/* Address details based on current state */}
              {isWaitingPickup ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span className="material-icons" style={{ color: '#f59e0b', fontSize: '18px' }}>location_on</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>TITIK JEMPUT</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{job.pickupAddress}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                      Catatan: {job.description || 'Tidak ada catatan'}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span className="material-icons" style={{ color: '#2091e7', fontSize: '18px' }}>flag</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>TITIK ANTAR (DROP-OFF)</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{job.dropoffAddress}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                      🔑 Metode Handoff: {job.deliveryMethod}
                    </span>
                    {job.instruction && (
                      <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                        Catatan: "{job.instruction}"
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                {isWaitingPickup ? (
                  <button 
                    onClick={() => handlePickup(job.id)}
                    className="btn-primary"
                    style={{
                      background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                      boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                      padding: '10px',
                      fontSize: '13px',
                      borderRadius: '12px',
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: '16px' }}>check_circle</span>
                    Konfirmasi Pick-up
                  </button>
                ) : (
                  <button 
                    onClick={() => handleDropoffClick(job.id)}
                    className="btn-primary"
                    style={{
                      padding: '10px',
                      fontSize: '13px',
                      borderRadius: '12px',
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: '16px' }}>photo_camera</span>
                    Konfirmasi Drop-off (Ambil Bukti)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Camera Simulator Overlay */}
      {activeCameraPkgId && (
        <BuktiKameraMock 
          onCapture={handleCaptureSuccess}
          onCancel={() => setActiveCameraPkgId(null)}
          title="Ambil Foto Penyerahan Paket"
        />
      )}
    </div>
  );
};
export default AngkutProses;
