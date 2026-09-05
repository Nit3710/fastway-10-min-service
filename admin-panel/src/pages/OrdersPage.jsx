import { useEffect, useState } from 'react';
import api from '../api';
import { showToast, apiErrorMessage } from '../toast';

const STATUSES = ['PLACED','CONFIRMED','PACKED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'];
const STATUS_COLORS = { PLACED:'#1d4ed8',CONFIRMED:'#065f46',PACKED:'#78350f',OUT_FOR_DELIVERY:'#7c3aed',DELIVERED:'#166534',CANCELLED:'#7f1d1d' };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState('');

  const fetchOrders = () => {
    setLoading(true);
    const q = statusFilter ? `&status=${statusFilter}` : '';
    api.get(`/api/admin/orders?page=${page}&size=10${q}`)
      .then(r => { setOrders(r.data.data.content); setTotalPages(r.data.data.totalPages); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);
  useEffect(() => { api.get('/api/admin/delivery-partners').then(r => setPartners(r.data.data)); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/admin/orders/${id}/status`, { status });
      showToast(`Order #FW-${id} status updated to ${status}.`, 'success');
      fetchOrders();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to update order status.'));
    }
  };

  const assignPartner = async () => {
    if (!selectedPartner) {
      showToast('Please select a delivery partner first.');
      return;
    }
    try {
      await api.post(`/api/admin/orders/${assignModal}/assign-delivery`, { deliveryPartnerId: Number(selectedPartner) });
      showToast('Delivery partner assigned successfully.', 'success');
      setAssignModal(null);
      fetchOrders();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Failed to assign delivery partner.'));
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Orders Management</h1>
      <div style={styles.toolbar}>
        <select style={styles.select} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div style={styles.info}>Loading orders...</div> : (
        <div className="table-card">
          <div className="table-scroll"><table style={styles.table}>
            <thead><tr>{['Order ID','Customer','Amount','Mode','Status','Date','Actions'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={styles.tr}>
                  <td style={styles.td}>#FW-{o.id}</td>
                  <td style={styles.td}>{o.user?.name || '-'}<br /><span style={styles.sub}>{o.user?.phone}</span></td>
                  <td style={styles.td}>₹{Number(o.totalAmount).toLocaleString('en-IN')}</td>
                  <td style={styles.td}><span style={styles.badge}>{o.paymentMode}</span></td>
                  <td style={styles.td}>
                    <select className={`status-select status-${o.status.toLowerCase().replace(/_/g, '-')}`}
                      value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={styles.td}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                  <td style={styles.td}>
                    {o.status === 'CONFIRMED' && (
                      <button style={styles.actionBtn} onClick={() => setAssignModal(o.id)}>Assign Partner</button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No orders found.</td></tr>
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

      {assignModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Assign Delivery Partner</h3>
            <p style={styles.sub}>Order #FW-{assignModal}</p>
            <select style={styles.select} value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)}>
              <option value="">Select Partner</option>
              {partners.filter(p => p.isAvailable).map(p => (
                <option key={p.id} value={p.id}>{p.user?.name} — {p.vehicleType}</option>
              ))}
            </select>
            <div style={styles.modalBtns}>
              <button style={styles.cancelBtn} onClick={() => setAssignModal(null)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={assignPartner}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '2rem' },
  title: { color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' },
  toolbar: { marginBottom: '1rem', display: 'flex', gap: '1rem' },
  info: { color: 'var(--text-secondary)', padding: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'transparent' },
  th: { color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem 1rem', verticalAlign: 'middle' },
  sub: { color: 'var(--text-muted)', fontSize: '0.75rem' },
  badge: { background: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' },
  select: { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.45rem 0.75rem', borderRadius: '0.4rem', cursor: 'pointer' },
  actionBtn: { background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' },
  pagination: { display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', justifyContent: 'center' },
  pageBtn: { background: 'var(--btn-secondary-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '0.4rem', cursor: 'pointer' },
  pageInfo: { color: 'var(--text-muted)', fontSize: '0.875rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--bg-secondary)', borderRadius: '1rem', padding: '2rem', width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' },
  modalTitle: { color: 'var(--text-primary)', fontWeight: 700, margin: 0 },
  modalBtns: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' },
  confirmBtn: { background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 },
};
