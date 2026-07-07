import React, { useState } from 'react';
import * as api from '../../../lib/api';
import type { UserProfile } from '../../../lib/storage';

interface AuthSignupProps {
  onComplete: (profile: UserProfile) => void;
  onLogin: () => void;
}

export const AuthSignup: React.FC<AuthSignupProps> = ({ onComplete, onLogin }) => {
  // Personal info
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) return;

    setLoading(true);
    setError('');
    try {
      const profile = await api.signup(name.trim(), email.trim(), phone.trim(), password);
      onComplete(profile);
    } catch (err: any) {
      const msg = err.message || 'Pendaftaran gagal.';
      if (msg.startsWith('CONFIRM_EMAIL:')) {
        setSuccess(msg.replace('CONFIRM_EMAIL:', ''));
        setError('');
      } else {
        setError(msg);
        setSuccess('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #8eadf0, #2091e7)',
            margin: '0 auto 12px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(32,145,231,0.3)',
          }}>
            <span className="material-icons" style={{ fontSize: '32px', color: '#fff' }}>local_shipping</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Buat Akun Kirimin</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Crowdsourced Hitchhiking Logistics
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Informasi Pendaftaran
          </h2>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input className="form-input" placeholder="e.g. Budi Santoso" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="budi@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Nomor HP (WhatsApp)</label>
            <input className="form-input" type="tel" placeholder="08xx-xxxx-xxxx" value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min. 6 karakter" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
          </div>

          {success && (
            <div style={{
              padding: '12px 14px', borderRadius: '12px',
              background: '#f0fdf4', border: '1px solid #86efac',
              color: '#15803d', fontSize: '13px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span className="material-icons" style={{ fontSize: '18px' }}>check_circle</span>
              {success}
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '12px',
              background: '#fef2f2', border: '1px solid #fca5a5',
              color: '#dc2626', fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {success ? (
            <button type="button" onClick={onLogin} className="btn-primary" style={{ padding: '14px', fontSize: '14px', fontWeight: 700 }}>
              Ke Halaman Login <span className="material-icons">login</span>
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '14px', fontSize: '14px', fontWeight: 700 }}>
              {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'} <span className="material-icons">arrow_forward</span>
            </button>
          )}
        </form>

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          Sudah punya akun?{' '}
          <button onClick={onLogin} style={{ background: 'none', border: 'none', color: '#2091e7', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
            Masuk
          </button>
        </div>
      </div>
    </div>
  );
};
export default AuthSignup;
