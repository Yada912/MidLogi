import React, { useEffect } from 'react';
import { type Package, getPackages, savePackages } from '../../../lib/storage';

interface KirimMencariDriverProps {
  navigate: (screen: string) => void;
  draftPackage: any;
}

export const KirimMencariDriver: React.FC<KirimMencariDriverProps> = ({
  navigate,
  draftPackage,
}) => {
  useEffect(() => {
    // 2-second simulation of backend network latency
    const timer = setTimeout(() => {
      const allPackages = getPackages();
      
      // Update package status to "Menunggu Pick-up" (assigned)
      const finalizedPackage: Package = {
        ...draftPackage,
        status: 'Menunggu Pick-up'
      };

      // Add to localStorage
      savePackages([finalizedPackage, ...allPackages]);
      
      // Navigate to Sender Dashboard
      navigate('KirimDash');
    }, 2000);

    return () => clearTimeout(timer);
  }, [draftPackage, navigate]);

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'linear-gradient(180deg, #8eadf0 0%, #2091e7 100%)',
        color: '#ffffff',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Centered Circular Spinner */}
      <div 
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: '6px solid rgba(255, 255, 255, 0.2)',
          borderTopColor: '#ffffff',
          marginBottom: '24px',
        }}
        className="animate-spin"
      />

      <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' }}>
        Memproses Pemesanan
      </h2>
      
      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', margin: 0, maxWidth: '260px', lineHeight: 1.5 }}>
        Menghubungkan dengan pengemudi komuter terdekat di sepanjang rute Anda...
      </p>

      {/* Footer Branding */}
      <span 
        style={{ 
          position: 'absolute', 
          bottom: '40px', 
          fontSize: '11px', 
          fontWeight: 700, 
          letterSpacing: '1px', 
          opacity: 0.5 
        }}
      >
        KIRIMIN CO-RIDE
      </span>
    </div>
  );
};
export default KirimMencariDriver;
