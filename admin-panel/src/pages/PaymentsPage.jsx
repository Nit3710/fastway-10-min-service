import { useEffect, useState } from 'react';
import api from '../api';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/admin/payments?page=${page}&size=15`)
      .then(r => {
        const data = r.data.data;
        setPayments(data.content || data);
        setTotalPages(data.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const statusColor = { CREATED: '#334155', PAID: '#065f46', FAILED: '#7f1d1d' };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Payments</h1>
      {loading ? <div style={styles.info}>Loading...</div> : (
        <div className="table-card">
          <div className="table-scroll"><table style={styles.table}>
            <thead>
              <tr>{['Payment ID','Order','Razorpay Order ID','Razorpay Payment ID','Amount','Status','Date'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}>#{p.id}</td>
                  <td style={styles.td}>#FW-{p.orderId || p.order?.id}</td>
                  <td style={styles.td}><span style={styles.mono}>{p.razorpayOrderId || '-'}</span></td>
                  <td style={styles.td}><span style={styles.mono}>{p.razorpayPaymentId || '-'}</span></td>
                  <td style={styles.td}>₹{p.amount ? Number(p.amount).toLocaleString('en-IN') : '-'}</td>
                  <td style={styles.td}><span className={`admin-badge status-${p.status.toLowerCase()}`}>{p.status}</span></td>
                  <td style={styles.td}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No payments yet.</td></tr>
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
  title: { color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' },
  info: { color: 'var(--text-secondary)', padding: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'transparent' },
  th: { color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem 1rem' },
  badge: { color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
  mono: { fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' },
  pagination: { display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', justifyContent: 'center' },
  pageBtn: { background: 'var(--btn-secondary-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '0.4rem', cursor: 'pointer' },
  pageInfo: { color: 'var(--text-muted)', fontSize: '0.875rem' },
};
