import { useEffect, useState } from 'react';
import api from '../api';
import { apiErrorMessage, showToast } from '../toast';
import Icon from '../components/Icon';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const normalize = item => ({ ...item, isRead: Boolean(item.isRead ?? item.read) });
  const load = () => { setLoading(true); api.get('/api/notifications?page=0&size=50').then(r => setItems((r.data.data?.content || []).map(normalize))).catch(e => showToast(apiErrorMessage(e, 'Could not load notifications.'))).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const markRead = async item => { if (item.isRead) return; try { await api.put(`/api/notifications/${item.id}/read`); setItems(current => current.map(n => n.id === item.id ? { ...n, isRead: true } : n)); } catch (e) { showToast(apiErrorMessage(e)); } };
  return <div className="notifications-page"><div className="notifications-page-header"><div><h1>Notifications</h1><p>Order and payment alerts for your admin account.</p></div><button onClick={load}><Icon name="refresh" size={15}/> Refresh</button></div>{loading ? <div className="notification-page-empty">Loading notifications...</div> : items.length === 0 ? <div className="notification-page-empty"><div className="empty-bell"><Icon name="inbox" size={36}/></div><h2>No notifications yet</h2><p>New order and payment alerts will appear here.</p></div> : <div className="notification-list">{items.map(item => <button key={item.id} className={`notification-page-item ${item.isRead ? '' : 'unread'}`} onClick={() => markRead(item)}><span className="notification-page-icon"><Icon name={item.relatedType === 'PAYMENT' ? 'payments' : 'orders'} size={19}/></span><span><strong>{item.title}</strong><span>{item.body}</span><time>{item.sentAt ? new Date(item.sentAt).toLocaleString('en-IN') : ''}</time></span><em>{item.isRead ? 'Read' : 'New'}</em></button>)}</div>}</div>;
}
