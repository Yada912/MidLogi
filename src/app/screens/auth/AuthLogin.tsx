import React, { useState } from 'react';
import { getUserProfile, type UserProfile } from '../../../lib/storage';

interface AuthLoginProps {
  onComplete: (profile: UserProfile) => void;
  onSignup: () => void;
}

export const AuthLogin: React.FC<AuthLoginProps> = ({ onComplete, onSignup }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = getUserProfile();
    if (saved && saved.email.toLowerCase() === email.trim().toLowerCase()) {
      onComplete(saved);
    } else if (!saved) {
      setError('Belum ada akun tersimpan. Silakan daftar terlebih dahulu.');
    } else {
      setError('Email tidak cocok. Pastikan email yang kamu daftar sama.');
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
            margin: '0 auto 12px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(32,145,231,0.3)',
          }}>
            <span className="material-icons" style={{ fontSize: '32px', color: '#fff' }}>local_shipping</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Masuk ke Kirimin</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Gunakan email yang sudah didaftarkan</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="budi@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '12px',
              background: '#fef2f2', border: '1px solid #fca5a5',
              color: '#dc2626', fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary">
            <span className="material-icons">login</span>
            Masuk
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          Belum punya akun?{' '}
          <button onClick={onSignup} style={{ background: 'none', border: 'none', color: '#2091e7', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
            Daftar Sekarang
          </button>
        </div>

        <div style={{
          padding: '12px 16px', borderRadius: '14px',
          background: '#f8fafc', border: '1px dashed #cbd5e1',
          fontSize: '12px', color: '#64748b', lineHeight: 1.6,
        }}>
          <strong>💡 Mode Sandbox:</strong> Buka 2 tab browser, daftar dengan email berbeda — satu sebagai Pengirim, satu sebagai Driver.
        </div>
      </div>
    </div>
  );
};
export default AuthLogin;
