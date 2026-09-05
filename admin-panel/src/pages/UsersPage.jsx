import { useEffect, useState } from 'react';
import api from '../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    const r = role ? `&role=${role}` : '';
    api.get(`/api/admin/users?page=${page}&size=15${r}`)
      .then(res => { setUsers(res.data.data.content); setTotalPages(res.data.data.totalPages); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [page, role]);

  const roleColor = { CUSTOMER: '#1d4ed8', DELIVERY_PARTNER: '#065f46', ADMIN: '#7c3aed' };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Users</h1>
        <select style={styles.select} value={role} onChange={e => { setRole(e.target.value); setPage(0); }}>
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="DELIVERY_PARTNER">Delivery Partner</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {loading ? <div style={styles.info}>Loading...</div> : (
        <div className="table-card">
          <div className="table-scroll"><table style={styles.table}>
            <thead><tr>{['ID','Name','Phone','Email','Role','Joined'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>#{u.id}</td>
                  <td style={styles.td}>{u.name}</td>
                  <td style={styles.td}>{u.phone || '-'}</td>
                  <td style={styles.td}>{u.email || '-'}</td>
                  <td style={styles.td}><span className={`admin-badge role-${u.role.toLowerCase().replace(/_/g, '-')}`}>{u.role}</span></td>
                  <td style={styles.td}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No users found.</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      )}
      <div style={styles.pagination}>
        <button style={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={styles.pageInfo}>Page {page + 1} of {totalPages}</span>
        <button style={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title: { color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, margin: 0 },
  select: { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', cursor: 'pointer' },
  info: { color: 'var(--text-secondary)', padding: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'transparent' },
  th: { color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem 1rem' },
  badge: { color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
  pagination: { display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', justifyContent: 'center' },
  pageBtn: { background: 'var(--btn-secondary-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '0.4rem', cursor: 'pointer' },
  pageInfo: { color: 'var(--text-muted)', fontSize: '0.875rem' },
};
