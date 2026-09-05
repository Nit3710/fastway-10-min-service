import { useState } from 'react';
import api from '../api';

export default function LoginPage({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const nextErrors = {};
    if (!phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(phone.trim())) {
      nextErrors.phone = 'Phone number must be exactly 10 digits.';
    }
    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { phone: phone.trim(), password });
      const { token, user } = res.data.data;
      if (user.role !== 'ADMIN') { setError('Access denied. Admin only.'); return; }
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Invalid phone or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page" style={styles.page}>
      <form className="login-card" onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.logoWrapper}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 46" fill="currentColor" style={styles.gearIcon}><path d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"></path></svg>
        </div>
        <h2 style={styles.title}>Fastway Admin</h2>
        <p style={styles.subtitle}>Sign in to manage your platform</p>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <div>
          <label style={styles.label}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            style={{ ...styles.input, ...(errors.phone ? styles.inputError : {}) }}
            placeholder="Enter phone number"
            value={phone}
            onChange={e => {
              setPhone(e.target.value);
              if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
            }}
            required
          />
          {errors.phone && <span style={styles.errorText}>{errors.phone}</span>}
        </div>

        <div>
          <label style={styles.label}>Password <span style={{ color: '#ef4444' }}>*</span></label>
          <div style={styles.passwordWrapper}>
            <input
              style={{ ...styles.input, width: '100%', paddingRight: '2.75rem', ...(errors.password ? styles.inputError : {}) }}
              placeholder="Enter password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>
          {errors.password && <span style={styles.errorText}>{errors.password}</span>}
        </div>

        <button style={styles.btn} type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '1rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--border-color)', boxShadow: '0 20px 48px rgba(0,0,0,0.2)' },
  logoWrapper: { display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto', background: 'var(--bg-primary)', width: '64px', height: '64px', borderRadius: '50%', border: '1px solid var(--border-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  gearIcon: { color: 'var(--accent-color)' },
  title: { color: 'var(--text-primary)', textAlign: 'center', margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 700 },
  subtitle: { color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 0.5rem', fontSize: '0.875rem' },
  error: { background: 'var(--btn-danger-bg)', color: 'var(--btn-danger-text)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', border: '1px solid var(--border-color)', textAlign: 'center' },
  label: { color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem', fontWeight: 600 },
  input: { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.925rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' },
  passwordWrapper: { position: 'relative', width: '100%' },
  eyeBtn: { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' },
  btn: { background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '0.85rem', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s', marginTop: '0.5rem' },
  inputError: { borderColor: '#ef4444', boxShadow: '0 0 0 1px #ef4444' },
  errorText: { color: '#ef4444', fontSize: '0.75rem', marginTop: '0.3rem', display: 'block' },
};
