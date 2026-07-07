import { useState, useEffect, useCallback } from 'react';
import {
  type Package, type DriverRoute, type ChatMessage, type UserProfile,
} from './lib/storage';
import * as api from './lib/api';
import { supabase } from './lib/supabase';

// Components
import { BottomNav } from './app/components/BottomNav';

// Auth
import { AuthLogin }  from './app/screens/auth/AuthLogin';
import { AuthSignup } from './app/screens/auth/AuthSignup';

// Shared Screens
import { Homepage }     from './app/screens/Homepage';
import { LiveChat }     from './app/screens/bersama/LiveChat';
import { SetelanAkun }  from './app/screens/bersama/SetelanAkun';

// Sender Flow
import { KirimDetail }        from './app/screens/pengirim/KirimDetail';
import { KirimRute }          from './app/screens/pengirim/KirimRute';
import { KirimPesan }         from './app/screens/pengirim/KirimPesan';
import { KirimMencariDriver } from './app/screens/pengirim/KirimMencariDriver';
import { KirimDash }          from './app/screens/pengirim/KirimDash';
import { KirimRiwayat }       from './app/screens/pengirim/KirimRiwayat';

// Driver Flow
import { Angkut }       from './app/screens/driver/Angkut';
import { AngkutDash }   from './app/screens/driver/AngkutDash';
import { AngkutProses } from './app/screens/driver/AngkutProses';
import { AngkutRiwayat } from './app/screens/driver/AngkutRiwayat';

// Admin Panel
import { AdminPanel } from './app/screens/admin/AdminPanel';

const SIDEBAR_TABS = {
  pengirim: [
    { id: 'beranda',   label: 'Beranda',    icon: 'home'        },
    { id: 'aktivitas', label: 'Paket Aktif', icon: 'assignment'  },
    { id: 'riwayat',   label: 'Riwayat',    icon: 'history'     },
    { id: 'chat',      label: 'Chat',        icon: 'chat_bubble' },
    { id: 'setelan',   label: 'Profil',      icon: 'person'      },
  ],
  driver: [
    { id: 'beranda',   label: 'Beranda',    icon: 'home'         },
    { id: 'aktivitas', label: 'Rute Aktif', icon: 'alt_route'   },
    { id: 'riwayat',   label: 'Riwayat',   icon: 'history'      },
    { id: 'chat',      label: 'Chat',       icon: 'chat_bubble'  },
    { id: 'setelan',   label: 'Profil',     icon: 'person'       },
  ],
  admin: [
    { id: 'beranda',   label: 'Dashboard',   icon: 'admin_panel_settings' },
    { id: 'users',     label: 'Kelola User', icon: 'people' },
    { id: 'orders',    label: 'Kelola Order',icon: 'local_shipping' },
    { id: 'setelan',   label: 'Profil',      icon: 'person' },
  ],
};

export default function App() {
  const [authView,     setAuthView]     = useState<'login' | 'signup'>('login');
  const [userProfile,  setUserProfile]  = useState<UserProfile | null>(null);
  const [authLoading,  setAuthLoading]  = useState(true);
  const [screen,       setScreen]       = useState('Homepage');
  const [selectedTab,  setSelectedTab]  = useState('beranda');

  const [packages,     setPackages]     = useState<Package[]>([]);
  const [driverRoute,  setDriverRoute]  = useState<DriverRoute>({
    departureTime: '08:00', waypoints: [], maxPackets: 3,
    maxPackageSize: 'L', acceptedCategories: [], active: false,
  });
  const [messages, _setMessages] = useState<ChatMessage[]>([]);

  const [draftPackage, setDraftPackage] = useState<any>({
    category: 'Dokumen', weightSize: 'S', photoName: '',
    handling: [], description: '',
    pickupAddress: '', pickupCoords: null,
    dropoffAddress: '', dropoffCoords: null,
    deliveryMethod: 'Bertemu Langsung', instruction: '', price: 0,
  });

  // ── Reload packages from Supabase ────────────────────────────────────────────
  const refreshPackages = useCallback(async () => {
    const pkgs = await api.fetchPackages();
    setPackages(pkgs);
  }, []);

  // ── Resolve session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const resolveSession = async () => {
      const profile = await api.getCurrentProfile();
      setUserProfile(profile);
      setAuthLoading(false);
    };

    resolveSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await api.fetchProfile(session.user.id);
        if (profile) {
          profile.email = session.user.email ?? '';
          setUserProfile(profile);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load and subscribe to packages once logged in ────────────────────────────
  useEffect(() => {
    if (!userProfile) return;

    refreshPackages();

    const unsub = api.subscribeToPackages((updated) => {
      setPackages(updated);
    });

    return unsub;
  }, [userProfile, refreshPackages]);

  // ── Load driver route when logged in as driver ────────────────────────────────
  useEffect(() => {
    if (!userProfile || userProfile.role !== 'driver') return;
    api.fetchDriverRoute(userProfile.id).then(route => {
      if (route) setDriverRoute(route);
    });
  }, [userProfile]);

  const role = userProfile?.role ?? 'pengirim';
  const tabs = SIDEBAR_TABS[role];
  const unreadChatCount = messages.filter(m => m.senderRole !== role && !m.read).length;

  const handleAuthComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setScreen('Homepage');
    setSelectedTab('beranda');
  };

  const handleLogout = async () => {
    await api.logout();
    setUserProfile(null);
    setPackages([]);
    setAuthView('login');
    setScreen('Homepage');
    setSelectedTab('beranda');
  };

  const switchRole = async (newRole: 'pengirim' | 'driver' | 'admin') => {
    if (!userProfile) return;
    // Only admin role check — pengirim↔driver switching is allowed for onboarding purposes
    // Admin can only be promoted directly in the DB; this only switches display mode
    const updated = { ...userProfile, role: newRole };
    setUserProfile(updated);
    setScreen('Homepage');
    setSelectedTab('beranda');
  };

  const navigateTo = (nextScreen: string) => setScreen(nextScreen);

  const handleTabChange = (tabId: string) => {
    setSelectedTab(tabId);
    setScreen('Homepage');
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '16px',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e8effc 100%)',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(32,145,231,0.3)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <span className="material-icons" style={{ fontSize: '28px', color: '#fff' }}>local_shipping</span>
        </div>
        <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Memuat Kirimin…</p>
      </div>
    );
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────────
  if (!userProfile) {
    return authView === 'signup'
      ? <AuthSignup onComplete={handleAuthComplete} onLogin={() => setAuthView('login')} />
      : <AuthLogin  onComplete={handleAuthComplete} onSignup={() => setAuthView('signup')} />;
  }

  // ── Screen renderer ───────────────────────────────────────────────────────────
  const renderScreen = () => {
    if (screen !== 'Homepage') {
      switch (screen) {
        case 'KirimDetail':        return <KirimDetail navigate={navigateTo} draftPackage={draftPackage} setDraftPackage={setDraftPackage} />;
        case 'KirimRute':          return <KirimRute   navigate={navigateTo} draftPackage={draftPackage} setDraftPackage={setDraftPackage} />;
        case 'KirimPesan':         return <KirimPesan  navigate={navigateTo} draftPackage={draftPackage} setDraftPackage={setDraftPackage} driverRoute={driverRoute} />;
        case 'KirimMencariDriver': return <KirimMencariDriver navigate={navigateTo} draftPackage={draftPackage} />;
        case 'KirimDash':          return <KirimDash   navigate={navigateTo} packages={packages} setSelectedTab={setSelectedTab} />;
        case 'KirimRiwayat':       return <KirimRiwayat navigate={navigateTo} packages={packages} setDraftPackage={setDraftPackage} />;
        case 'Angkut':             return <Angkut      navigate={navigateTo} userProfile={userProfile} />;
        case 'AngkutDash':         return <AngkutDash  navigate={navigateTo} packages={packages} userProfile={userProfile} />;
        case 'AngkutProses':       return <AngkutProses navigate={navigateTo} packages={packages} userProfile={userProfile} />;
        case 'AngkutRiwayat':      return <AngkutRiwayat navigate={navigateTo} packages={packages} />;
        default: break;
      }
    }

    switch (selectedTab) {
      case 'beranda':
        if (role === 'admin') return <AdminPanel activeSection="dashboard" packages={packages} />;
        return <Homepage navigate={navigateTo} role={role} packages={packages} driverRoute={driverRoute} userProfile={userProfile} onSwitchRole={switchRole} />;
      case 'users':
        if (role === 'admin') return <AdminPanel activeSection="users" packages={packages} />;
        return <Homepage navigate={navigateTo} role={role} packages={packages} driverRoute={driverRoute} userProfile={userProfile} onSwitchRole={switchRole} />;
      case 'orders':
        if (role === 'admin') return <AdminPanel activeSection="orders" packages={packages} />;
        return <Homepage navigate={navigateTo} role={role} packages={packages} driverRoute={driverRoute} userProfile={userProfile} onSwitchRole={switchRole} />;
      case 'aktivitas':
        return role === 'pengirim'
          ? <KirimDash   navigate={navigateTo} packages={packages} setSelectedTab={setSelectedTab} />
          : <AngkutDash  navigate={navigateTo} packages={packages} userProfile={userProfile} />;
      case 'riwayat':
        return role === 'pengirim'
          ? <KirimRiwayat  navigate={navigateTo} packages={packages} setDraftPackage={setDraftPackage} />
          : <AngkutRiwayat navigate={navigateTo} packages={packages} />;
      case 'chat':
        return <LiveChat role={role as any} packages={packages} messages={messages} />;
      case 'setelan':
        return <SetelanAkun role={role} userProfile={userProfile} onLogout={handleLogout} onSwitchRole={switchRole} />;
      default:
        return <Homepage navigate={navigateTo} role={role} packages={packages} driverRoute={driverRoute} userProfile={userProfile} onSwitchRole={switchRole} />;
    }
  };

  const showBottomNav = !['KirimDetail','KirimRute','KirimPesan','KirimMencariDriver','Angkut','AngkutProses'].includes(screen);
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  return (
    <div className="app-viewport-wrapper">
      {/* ── Desktop Sidebar ── */}
      <nav className="app-sidebar">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '8px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-icons" style={{ fontSize: '20px', color: '#fff' }}>local_shipping</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9' }}>Kirimin</span>
        </div>

        {/* Role badge */}
        <div style={{
          padding: '8px 12px', borderRadius: '10px',
          background: role === 'pengirim' ? 'rgba(32,145,231,0.15)' : role === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
          color: role === 'pengirim' ? '#60a5fa' : role === 'admin' ? '#fbbf24' : '#34d399',
          fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
          marginBottom: '8px',
        }}>
          {role === 'pengirim' ? '📦 Mode Pengirim' : role === 'admin' ? '⚡ Mode Admin' : '🏍️ Mode Driver'}
        </div>

        {/* Nav items */}
        {tabs.map(tab => {
          const isActive = selectedTab === tab.id && screen === 'Homepage';
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className={isActive ? 'material-icons' : 'material-icons-outlined'} style={{ fontSize: '20px' }}>
                {tab.icon}
              </span>
              {tab.label}
              {tab.id === 'chat' && unreadChatCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#ef4444', color: '#fff',
                  fontSize: '10px', fontWeight: 700, borderRadius: '50%',
                  minWidth: '18px', height: '18px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>{unreadChatCount}</span>
              )}
            </button>
          );
        })}

        {/* Switch role — only available if user is not admin */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {role !== 'admin' && (
            <button
              onClick={() => switchRole(role === 'pengirim' ? 'driver' : 'pengirim')}
              className="sidebar-nav-item"
              style={{ marginBottom: '4px' }}
            >
              <span className="material-icons" style={{ fontSize: '18px' }}>swap_horiz</span>
              Ganti Mode Peran
            </button>
          )}
          <button onClick={handleLogout} className="sidebar-nav-item" style={{ color: '#f87171' }}>
            <span className="material-icons" style={{ fontSize: '18px' }}>logout</span>
            Keluar
          </button>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', padding: '0 4px' }}>
            <img
              src={userProfile.avatar}
              alt={userProfile.name}
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{userProfile.name}</p>
              <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{userProfile.email}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="app-phone-container">
        {renderScreen()}

        {/* Mobile bottom nav (hidden on desktop via CSS) */}
        {showBottomNav && !isDesktop && (
          <BottomNav
            activeTab={selectedTab}
            onTabChange={handleTabChange}
            unreadChatCount={unreadChatCount}
            role={role}
          />
        )}
      </div>
    </div>
  );
}
