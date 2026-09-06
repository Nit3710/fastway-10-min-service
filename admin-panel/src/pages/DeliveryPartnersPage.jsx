import { useEffect, useState } from 'react';
import api from '../api';

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', vehicleType: 'Motorbike' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPartners = () => {
    setLoading(true);
    api.get('/api/admin/delivery-partners')
      .then(r => setPartners(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.phone.trim()) {
      setError('Phone number is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/api/admin/delivery-partners', form);
      setShowModal(false);
      setForm({ name: '', phone: '', password: '', vehicleType: 'Motorbike' });
      fetchPartners();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create delivery partner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Delivery Partners</h1>
        <button style={styles.addBtn} onClick={() => { setError(''); setShowModal(true); }}>
          + Add Delivery Partner
        </button>
      </div>

      {loading ? <div style={styles.info}>Loading...</div> : (
        <div className="table-card">
          <div className="table-scroll"><table style={styles.table}>
            <thead>
              <tr>{['ID','Name','Phone','Vehicle','Active','Available','Location'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {partners.map(p => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}>#{p.id}</td>
                  <td style={styles.td}>{p.user?.name || p.name || '-'}</td>
                  <td style={styles.td}>{p.user?.phone || p.phone || '-'}</td>
                  <td style={styles.td}><span style={styles.badge}>{p.vehicleType || '-'}</span></td>
                  <td style={styles.td}><span style={{ ...styles.dot, background: p.isActive ? '#22c55e' : '#ef4444' }} /></td>
                  <td style={styles.td}><span style={{ ...styles.dot, background: p.isAvailable ? '#22c55e' : '#ef4444' }} /></td>
                  <td style={styles.td}>
                    {p.currentLat && p.currentLng
                      ? <a href={`https://maps.google.com/?q=${p.currentLat},${p.currentLng}`} target="_blank" rel="noreferrer" style={styles.mapLink}>📍 View</a>
                      : <span style={styles.sub}>No location data</span>}
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No delivery partners registered yet.</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      )}

      {/* Add Delivery Partner Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={styles.modalTitle}>Add Delivery Partner</h2>
            {error && <div style={styles.errorBox}>{error}</div>}
            <form onSubmit={handleCreate} style={styles.form}>
              <div>
                <label style={styles.label}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rider Rahul"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Phone Number (Required for Login)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9999999998"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Password (Default: 123456)</label>
                <input
                  type="text"
                  placeholder="123456"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Vehicle Type</label>
                <select
                  value={form.vehicleType}
                  onChange={e => setForm({ ...form, vehicleType: e.target.value })}
                  style={styles.input}
                >
                  <option value="Motorbike">Motorbike / Scooter</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Auto">Auto / EV</option>
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={styles.submitBtn} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title: { color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, margin: 0 },
  addBtn: { background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' },
  info: { color: 'var(--text-secondary)', padding: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'transparent' },
  th: { color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem 1rem', verticalAlign: 'middle' },
  sub: { color: 'var(--text-muted)', fontSize: '0.75rem' },
  badge: { background: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' },
  dot: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%' },
  mapLink: { color: 'var(--accent-color)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalCard: { background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', width: '420px', maxWidth: '90%', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  modalTitle: { margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' },
  errorBox: { background: '#fee2e2', color: '#dc2626', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.85rem', marginBottom: '0.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' },
  input: { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)', fontSize: '0.875rem', boxSizing: 'border-box' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 },
  submitBtn: { background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 },
};
