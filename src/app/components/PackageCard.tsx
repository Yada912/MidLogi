import React from 'react';
import type { Package } from '../../lib/storage';

interface PackageCardProps {
  pkg: Package;
  onActionClick?: () => void;
  actionText?: string;
  secondaryActionClick?: () => void;
  secondaryActionText?: string;
  showDetails?: boolean;
}

export const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  onActionClick,
  actionText,
  secondaryActionClick,
  secondaryActionText,
  showDetails = true,
}) => {
  const sizeColors: Record<string, string> = {
    XS: '#10b981', // Emerald
    S: '#3b82f6', // Blue
    M: '#f59e0b', // Amber
    L: '#d97706', // Dark Amber
    XL: '#ef4444', // Red
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    'Draft': { bg: '#f1f5f9', text: '#64748b' },
    'Mencari Driver': { bg: '#dbeafe', text: '#2563eb' },
    'Menunggu Pick-up': { bg: '#fef3c7', text: '#d97706' },
    'Dalam Perjalanan': { bg: '#e0f2fe', text: '#0369a1' },
    'Telah Tiba': { bg: '#d1fae5', text: '#065f46' },
    'Dibatalkan': { bg: '#fee2e2', text: '#991b1b' },
  };

  const statusStyle = statusColors[pkg.status] || { bg: '#f1f5f9', text: '#64748b' };

  // Handling emoji mappings
  const handlingEmojis: Record<string, string> = {
    'Mudah Pecah': '🍽️ Mudah Pecah',
    'Jaga dari Air': '💧 Jaga dari Air',
    'Harus Tegak': '⬆️ Harus Tegak',
    'Jaga Suhu': '❄️ Jaga Suhu',
  };

  return (
    <div 
      className="premium-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        borderLeft: `5px solid ${sizeColors[pkg.weightSize] || '#64748b'}`,
      }}
    >
      {/* Top row: Category, Size, Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
            {pkg.category}
          </span>
          <span 
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: sizeColors[pkg.weightSize],
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
            }}
          >
            {pkg.weightSize}
          </span>
        </div>
        <span 
          style={{
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            fontSize: '11px',
            fontWeight: '700',
          }}
        >
          {pkg.status}
        </span>
      </div>

      {/* Handling instruction chips */}
      {pkg.handling && pkg.handling.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {pkg.handling.map((h) => (
            <span 
              key={h}
              style={{
                fontSize: '11px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '2px 6px',
                borderRadius: '6px',
                color: '#475569',
              }}
            >
              {handlingEmojis[h] || h}
            </span>
          ))}
        </div>
      )}

      {/* Route Details */}
      {showDetails && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          {/* Pickup */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span className="material-icons" style={{ fontSize: '18px', color: '#10b981', marginTop: '2px' }}>
              location_on
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Jemput</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155', lineBreak: 'anywhere' }}>{pkg.pickupAddress}</span>
            </div>
          </div>

          {/* Connector dashed line */}
          <div style={{ width: '1px', height: '12px', borderLeft: '2px dashed #94a3b8', marginLeft: '8px' }} />

          {/* Dropoff */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span className="material-icons" style={{ fontSize: '18px', color: '#ef4444', marginTop: '2px' }}>
              flag
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Antar</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155', lineBreak: 'anywhere' }}>{pkg.dropoffAddress}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pricing / Driver summary */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '8px',
          borderTop: '1px solid #f1f5f9',
          marginTop: '4px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Biaya Pengiriman</span>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#2091e7' }}>
            Rp {(pkg.price + (pkg.detourFee || 0)).toLocaleString('id-ID')}
          </span>
        </div>
        
        {pkg.driverName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img 
              src={pkg.driverAvatar || 'https://via.placeholder.com/24'} 
              alt={pkg.driverName}
              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>{pkg.driverName}</span>
              <span style={{ fontSize: '9px', color: '#64748b' }}>{pkg.driverPlate}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(onActionClick || secondaryActionClick) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          {secondaryActionClick && (
            <button 
              onClick={(e) => { e.stopPropagation(); secondaryActionClick(); }}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '12px' }}
            >
              {secondaryActionText}
            </button>
          )}
          {onActionClick && (
            <button 
              onClick={(e) => { e.stopPropagation(); onActionClick(); }}
              className="btn-primary"
              style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '12px' }}
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
export default PackageCard;
