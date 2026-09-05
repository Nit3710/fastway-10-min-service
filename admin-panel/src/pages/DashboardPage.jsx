import { useEffect, useState } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Icon from '../components/Icon';

const StatCard = ({ label, value, icon, color }) => (
  <div style={{ ...styles.statCard, borderLeft: `4px solid ${color}` }}>
    <div className="stat-icon" style={{ color }}>{icon}</div>
    <div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = () => {
    setLoading(true);
    setError('');
    api.get('/api/admin/dashboard')
      .then(r => setStats(r.data.data))
      .catch(err => setError(err.response?.data?.message || 'Dashboard data could not be loaded.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;
  if (error) return <div style={styles.errorState}><h1 style={styles.title}>Dashboard</h1><p>{error}</p><button style={styles.retryBtn} onClick={loadDashboard}>Retry</button></div>;

  const statusData = ['PLACED','CONFIRMED','PACKED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].map(s => ({
    name: s.replace('_', ' '), orders: stats?.recentOrders?.filter(o => o.status === s).length || 0
  }));

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Dashboard</h1>
      <div style={styles.statGrid}>
        <StatCard label="Total Users" value={stats?.totalUsers ?? '-'} icon={<Icon name="users" size={22} />} color="#3b82f6" />
        <StatCard label="Total Orders" value={stats?.totalOrders ?? '-'} icon={<Icon name="orders" size={22} />} color="#10b981" />
        <StatCard label="Delivery Partners" value={stats?.totalDeliveryPartners ?? '-'} icon={<Icon name="delivery" size={22} />} color="#f59e0b" />
        <StatCard label="Total Revenue" value={`₹${Number(stats?.totalRevenue || 0).toLocaleString('en-IN')}`} icon={<Icon name="payments" size={22} />} color="#8b5cf6" />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Orders</h2>
        <div className="table-scroll"><table style={styles.table}>
          <thead><tr>{['Order ID','Customer','Amount','Payment','Status','Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
          <tbody>
            {stats?.recentOrders?.map(o => (
              <tr key={o.id} style={styles.tr}>
                <td style={styles.td}>#FW-{o.id}</td>
                <td style={styles.td}>{o.user?.name || '-'}</td>
                <td style={styles.td}>₹{Number(o.totalAmount).toLocaleString('en-IN')}</td>
                <td style={styles.td}><span style={styles.badge}>{o.paymentMode}</span></td>
                <td style={styles.td}><span className={`admin-badge status-${o.status.toLowerCase().replace(/_/g, '-')}`}>{o.status}</span></td>
                <td style={styles.td}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
            {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No recent orders.</td></tr>
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

function statusColor(s) {
  const map = { PLACED:'#1d4ed8',CONFIRMED:'#065f46',PACKED:'#78350f',OUT_FOR_DELIVERY:'#7c3aed',DELIVERED:'#166534',CANCELLED:'#7f1d1d' };
  return map[s] || '#334155';
}

const styles = {
  page: { padding: '2rem' },
  loading: { color: 'var(--text-secondary)', padding: '2rem' },
  errorState: { padding: '2rem', color: 'var(--text-secondary)' },
  retryBtn: { marginTop: '1rem', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 0, borderRadius: '0.5rem', padding: '0.7rem 1rem', cursor: 'pointer' },
  title: { color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: 'var(--bg-secondary)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  statValue: { color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700 },
  statLabel: { color: 'var(--text-muted)', fontSize: '0.8rem' },
  section: { background: 'var(--bg-secondary)', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  sectionTitle: { color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.65rem 0.75rem' },
  badge: { background: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
};
