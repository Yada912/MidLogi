import React, { useState } from 'react';

interface BuktiKameraMockProps {
  onCapture: (imageUri: string) => void;
  onCancel: () => void;
  title?: string;
}

export const BuktiKameraMock: React.FC<BuktiKameraMockProps> = ({
  onCapture,
  onCancel,
  title = 'Ambil Foto Bukti',
}) => {
  const [capturing, setCapturing] = useState(false);

  const handleCapture = () => {
    setCapturing(true);
    
    // Create a mock photo using Canvas
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw background (delivery scene representation)
        const gradient = ctx.createLinearGradient(0, 0, 0, 480);
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 640, 480);
        
        // Draw a simulated house porch / dropoff area
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.strokeRect(50, 50, 540, 380);
        
        // Draw package box
        ctx.fillStyle = '#d97706'; // Cardboard brown
        ctx.beginPath();
        ctx.moveTo(220, 300);
        ctx.lineTo(320, 240);
        ctx.lineTo(420, 300);
        ctx.lineTo(320, 360);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#b45309'; // Box shadow side
        ctx.beginPath();
        ctx.moveTo(220, 300);
        ctx.lineTo(320, 360);
        ctx.lineTo(320, 410);
        ctx.lineTo(220, 350);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#92400e'; // Box other side
        ctx.beginPath();
        ctx.moveTo(420, 300);
        ctx.lineTo(320, 360);
        ctx.lineTo(320, 410);
        ctx.lineTo(420, 350);
        ctx.closePath();
        ctx.fill();
        
        // Draw ribbon tape
        ctx.fillStyle = '#1e3a8a'; // Blue tape
        ctx.beginPath();
        ctx.moveTo(270, 270);
        ctx.lineTo(370, 330);
        ctx.lineTo(350, 342);
        ctx.lineTo(250, 282);
        ctx.closePath();
        ctx.fill();
        
        // Draw stamp / success checkmark
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(320, 180, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(295, 180);
        ctx.lineTo(315, 200);
        ctx.lineTo(350, 160);
        ctx.stroke();
        
        // Text overlays
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillText('BUKTI PENYERAHAN KIRIMIN', 40, 40);
        
        ctx.fillStyle = '#10b981';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('✓ LOKASI COCOK VIA GEOTAG', 40, 70);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Courier New, monospace';
        ctx.fillText(`TIMESTAMP: ${new Date().toLocaleString('id-ID')}`, 40, 450);
      }
      
      const dataUrl = canvas.toDataURL('image/png');
      onCapture(dataUrl);
      setCapturing(false);
    }, 800);
  };

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#000000',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 20px',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: '700' }}>{title}</span>
        <button 
          onClick={onCancel}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#ffffff',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <span className="material-icons">close</span>
        </button>
      </div>

      {/* Camera Viewport Simulation */}
      <div 
        style={{
          flex: 1,
          margin: '20px 0',
          borderRadius: '20px',
          border: '2px dashed #475569',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#0b0f19',
        }}
      >
        {capturing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <span className="material-icons animate-spin" style={{ fontSize: '48px', color: '#2091e7' }}>
              sync
            </span>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Memproses Gambar...</span>
          </div>
        ) : (
          <>
            {/* Corner brackets */}
            <div style={{ position: 'absolute', top: 20, left: 20, width: 20, height: 20, borderTop: '3px solid #6a9cf4', borderLeft: '3px solid #6a9cf4' }} />
            <div style={{ position: 'absolute', top: 20, right: 20, width: 20, height: 20, borderTop: '3px solid #6a9cf4', borderRight: '3px solid #6a9cf4' }} />
            <div style={{ position: 'absolute', bottom: 20, left: 20, width: 20, height: 20, borderBottom: '3px solid #6a9cf4', borderLeft: '3px solid #6a9cf4' }} />
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 20, height: 20, borderBottom: '3px solid #6a9cf4', borderRight: '3px solid #6a9cf4' }} />
            
            <span className="material-icons" style={{ fontSize: '64px', color: 'rgba(255,255,255,0.1)' }}>
              photo_camera
            </span>
            <span 
              style={{
                fontSize: '12px',
                color: '#64748b',
                textAlign: 'center',
                padding: '0 20px',
                marginTop: '10px',
                lineHeight: 1.6,
              }}
            >
              [ SIMULATOR KAMERA AKTIF ]<br />
              Dekatkan paket pada area sorot untuk mengambil bukti serah-terima.
            </span>
          </>
        )}
      </div>

      {/* Shutter Button Row */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '10px' }}>
        <button 
          onClick={handleCapture}
          disabled={capturing}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: '8px solid rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            outline: 'none',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            transition: 'transform 0.1s',
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.9)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        />
      </div>
    </div>
  );
};
export default BuktiKameraMock;
