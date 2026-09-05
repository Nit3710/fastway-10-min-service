import { useEffect, useState } from 'react';
import api from '../api';

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/delivery-partners')
      .then(r => setPartners(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Delivery Partners</h1>
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
                  <td style={styles.td}>{p.user?.name || '-'}</td>
                  <td style={styles.td}>{p.user?.phone || '-'}</td>
                  <td style={styles.td}><span style={styles.badge}>{p.vehicleType || '-'}</span></td>
                  <td style={styles.td}><span style={{ ...styles.dot, background: p.isActive ? '#22c55e' : '#ef4444' }} /></td>
                  <td style={styles.td}><span style={{ ...styles.dot, background: p.isAvailable ? '#22c55e' : '#ef4444' }} /></td>
                  <td style={styles.td}>
                    {p.currentLat && p.currentLng
                      ? <a href={`https://maps.google.com/?q=${p.currentLat},${p.currentLng}`} target="_blank" rel="noreferrer" style={styles.mapLink}>📍 View</a>
                      : <span style={styles.sub}>No data</span>}
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
    </div>
  );
}

const styles = {
  page: { padding: '2rem' },
  title: { color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' },
  info: { color: 'var(--text-secondary)', padding: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'transparent' },
  th: { color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem 1rem', verticalAlign: 'middle' },
  sub: { color: 'var(--text-muted)', fontSize: '0.75rem' },
  badge: { background: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' },
  dot: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%' },
  mapLink: { color: 'var(--accent-color)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 },
};
