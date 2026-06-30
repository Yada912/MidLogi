import React from 'react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadChatCount?: number;
  role?: 'pengirim' | 'driver';
}

const SENDER_TABS = [
  { id: 'beranda',   label: 'Beranda',   icon: 'home'        },
  { id: 'aktivitas', label: 'Aktif',     icon: 'assignment'  },
  { id: 'riwayat',   label: 'Riwayat',  icon: 'history'     },
  { id: 'chat',      label: 'Chat',      icon: 'chat_bubble' },
  { id: 'setelan',   label: 'Profil',    icon: 'person'      },
];

const DRIVER_TABS = [
  { id: 'beranda',   label: 'Beranda',   icon: 'home'        },
  { id: 'aktivitas', label: 'Rute',      icon: 'alt_route'   },
  { id: 'riwayat',   label: 'Riwayat',  icon: 'history'     },
  { id: 'chat',      label: 'Chat',      icon: 'chat_bubble' },
  { id: 'setelan',   label: 'Profil',    icon: 'person'      },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadChatCount = 0,
  role = 'pengirim',
}) => {
  const tabs = role === 'driver' ? DRIVER_TABS : SENDER_TABS;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 68,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(14px)',
      borderTop: '1px solid #e8edf2',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: '4px',
      zIndex: 200,
    }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const hasBadge = tab.id === 'chat' && unreadChatCount > 0;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: isActive ? 'rgba(32,145,231,0.1)' : 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              cursor: 'pointer',
              position: 'relative',
              padding: '6px 12px',
              borderRadius: '14px',
              transition: 'background 0.2s',
              minWidth: '52px',
            } as React.CSSProperties}
          >
            <span
              className={isActive ? 'material-icons' : 'material-icons-outlined'}
              style={{
                fontSize: '22px',
                color: isActive ? '#2091e7' : '#94a3b8',
                transition: 'color 0.2s, transform 0.2s',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {tab.icon}
            </span>
            <span style={{
              fontSize: '9px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#2091e7' : '#94a3b8',
              letterSpacing: '0.1px',
            }}>
              {tab.label}
            </span>

            {hasBadge && (
              <span style={{
                position: 'absolute', top: '4px', right: '6px',
                background: '#ef4444', color: '#fff',
                fontSize: '10px', fontWeight: 700,
                borderRadius: '50%', minWidth: '16px', height: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', boxShadow: '0 2px 4px rgba(239,68,68,0.4)',
              }}>
                {unreadChatCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
export default BottomNav;
