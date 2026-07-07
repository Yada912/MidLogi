import React, { useState, useEffect } from 'react';
import * as api from '../../../lib/api';

interface KirimMencariDriverProps {
  navigate: (screen: string) => void;
  draftPackage: any;
}

export const KirimMencariDriver: React.FC<KirimMencariDriverProps> = ({
  navigate,
  draftPackage,
}) => {
  const [assignmentMode, setAssignmentMode] = useState<'otomatis' | 'manual'>('otomatis');
  const [countdown, setCountdown] = useState(7);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);

  // Query matching drivers for manual selection list
  useEffect(() => {
    let active = true;
    api.fetchAllProfiles().then(users => {
      if (!active) return;
      const matches: any[] = [];
      const sizeHierarchy = ['XS', 'S', 'M', 'L', 'XL'];
      const pkgIdx = sizeHierarchy.indexOf(draftPackage.weightSize);

      const systemDrivers = users.filter(u => u.role === 'driver');
      systemDrivers.forEach(d => {
        if (d.vehicle) {
          const dMaxIdx = sizeHierarchy.indexOf(d.vehicle.maxPackageSize);
          if (pkgIdx <= dMaxIdx) {
            matches.push({
              id: d.id,
              name: d.name,
              phone: d.phone,
              avatar: d.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=10b981&color=fff`,
              rating: d.rating || 4.8,
              vehicle: d.vehicle ? `${d.vehicle.type} (${d.vehicle.color})` : 'Motor',
              vehiclePlate: d.vehicle?.plate || 'B 0000 XYZ',
            });
          }
        }
      });
      setAvailableDrivers(matches);
    });
    return () => { active = false; };
  }, [draftPackage]);

  // Automatic match timer countdown (7 seconds)
  useEffect(() => {
    if (assignmentMode !== 'otomatis') return;
    if (countdown <= 0) {
      // Auto-assign first matching driver if available
      const selected = availableDrivers[0];
      if (selected) {
        assignDriver(selected);
      } else {
        alert('Tidak ada driver tersedia saat ini.');
        navigate('Homepage');
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(c => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, assignmentMode, availableDrivers]);

  const assignDriver = async (driver: any) => {
    try {
      await api.updatePackage(draftPackage.id, {
        status: 'Menunggu Pick-up',
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        driverAvatar: driver.avatar,
        driverVehicle: driver.vehicle,
        driverPlate: driver.vehiclePlate,
      });
      alert(`Driver ${driver.name} berhasil ditugaskan!`);
      navigate('KirimDash');
    } catch (err: any) {
      alert('Gagal menugaskan driver: ' + err.message);
    }
  };

  const handleCancelOrder = async () => {
    if (confirm('Batalkan pemesanan pengiriman barang ini?')) {
      try {
        await api.deletePackage(draftPackage.id);
        alert('Pemesanan dibatalkan.');
        navigate('Homepage');
      } catch (err: any) {
        alert('Gagal membatalkan pemesanan: ' + err.message);
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: '#0f172a', color: '#ffffff',
        padding: '24px 20px 40px', fontFamily: 'Inter, sans-serif',
        justifyContent: 'space-between', boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Mencari Driver Searah</h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
          Jemput: {draftPackage.pickupAddress.split(',')[0]}
        </p>
      </div>

      {/* Pulsing radar animation view */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, margin: '20px 0' }}>
        {assignmentMode === 'otomatis' ? (
          <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Sonar waves */}
            <div className="sonar-wave" style={{
              position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
              background: 'rgba(32,145,231,0.15)', border: '1.5px solid #2091e7',
              animation: 'sonarPulse 2.5s infinite ease-out',
            }} />
            <div className="sonar-wave" style={{
              position: 'absolute', width: '75%', height: '75%', borderRadius: '50%',
              background: 'rgba(32,145,231,0.1)', border: '1.5px solid #2091e7',
              animation: 'sonarPulse 2.5s infinite ease-out', animationDelay: '0.8s',
            }} />
            <div className="sonar-wave" style={{
              position: 'absolute', width: '50%', height: '50%', borderRadius: '50%',
              background: 'rgba(32,145,231,0.05)', border: '1.5px solid #2091e7',
              animation: 'sonarPulse 2.5s infinite ease-out', animationDelay: '1.6s',
            }} />
            {/* Center icon */}
            <div style={{
              position: 'relative', width: '70px', height: '70px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(32,145,231,0.4)',
            }}>
              <span className="material-icons" style={{ fontSize: '32px', color: '#fff' }}>local_shipping</span>
            </div>
          </div>
        ) : (
          /* Manual selector list */
          <div style={{
            width: '100%', maxHeight: '280px', overflowY: 'auto',
            background: 'rgba(255,255,255,0.05)', borderRadius: '20px',
            padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 700 }}>
              Daftar Driver yang Melintas Searah ({availableDrivers.length})
            </p>
            {availableDrivers.map(d => (
              <div
                key={d.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: 'rgba(255,255,255,0.06)', padding: '10px 14px',
                  borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <img
                  src={d.avatar}
                  alt={d.name}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </p>
                  <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0' }}>
                    {d.vehicle} • {d.vehiclePlate}
                  </p>
                </div>
                <button
                  onClick={() => assignDriver(d)}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', border: 'none',
                    background: '#2091e7', color: '#fff', fontSize: '10px', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tugaskan
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          {assignmentMode === 'otomatis' ? (
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Mencocokkan otomatis dalam <strong style={{ color: '#2091e7' }}>{countdown} detik</strong>...
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              Pilih driver secara manual di atas untuk menyelesaikan pesanan.
            </p>
          )}
        </div>
      </div>

      {/* Control panel & mode selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Toggle options */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '14px', padding: '4px' }}>
          <button
            onClick={() => setAssignmentMode('otomatis')}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
              background: assignmentMode === 'otomatis' ? '#2091e7' : 'transparent',
              color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>autorenew</span>
            Otomatis
          </button>
          <button
            onClick={() => setAssignmentMode('manual')}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
              background: assignmentMode === 'manual' ? '#2091e7' : 'transparent',
              color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>person</span>
            Pilih Manual
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={handleCancelOrder}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px',
            border: '1.5px solid #f87171', background: 'transparent',
            color: '#f87171', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <span className="material-icons" style={{ fontSize: '16px' }}>cancel</span>
          Batalkan Pemesanan
        </button>
      </div>

      {/* CSS animation definitions injected inline */}
      <style>{`
        @keyframes sonarPulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
export default KirimMencariDriver;
