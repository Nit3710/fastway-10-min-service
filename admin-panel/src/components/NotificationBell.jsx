import { useEffect, useState } from 'react';
import api from '../api';
import { apiErrorMessage, showToast } from '../toast';
import Icon from './Icon';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

  const loadCount = () => api.get('/api/notifications/unread-count').then(r => setCount(Number(r.data.data || 0))).catch(() => {});
  const normalize = item => ({ ...item, isRead: Boolean(item.isRead ?? item.read) });
  const loadItems = () => api.get('/api/notifications?page=0&size=8').then(r => setItems((r.data.data?.content || []).map(normalize))).catch(error => showToast(apiErrorMessage(error)));

  useEffect(() => {
    loadCount();
    const timer = window.setInterval(loadCount, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const toggle = () => { const next = !open; setOpen(next); if (next) loadItems(); };
  const markRead = async (item) => {
    if (item.isRead) return;
    try { await api.put(`/api/notifications/${item.id}/read`); setItems(current => current.map(n => n.id === item.id ? { ...n, isRead: true } : n)); setCount(current => Math.max(0, current - 1)); }
    catch (error) { showToast(apiErrorMessage(error)); }
  };

  const markAllRead = async () => {
    const unread = items.filter(n => !n.isRead);
    try {
      await Promise.all(unread.map(n => api.put(`/api/notifications/${n.id}/read`)));
      setItems(current => current.map(n => ({ ...n, isRead: true })));
      setCount(0);
    } catch (error) {
      showToast(apiErrorMessage(error));
      await loadItems();
      loadCount();
    }
  };

  return <div className="notification-anchor">
    <button className="notification-button" onClick={toggle} aria-label="Notifications" aria-expanded={open}><Icon name="bell" size={18}/>{count > 0 && <span className="notification-count">{count > 99 ? '99+' : count}</span>}</button>
    {open && <div className="notification-popover">
      <div className="notification-header"><strong>Notifications</strong><button onClick={markAllRead}>Mark all read</button></div>
      {items.length === 0 ? <p className="notification-empty">No notifications yet.</p> : items.map(item => <button key={item.id} className={`notification-item ${item.isRead ? '' : 'unread'}`} onClick={() => markRead(item)}><span className="notification-dot">{item.isRead ? '○' : '●'}</span><span><strong>{item.title}</strong><small>{item.body}</small><time>{item.sentAt ? new Date(item.sentAt).toLocaleString('en-IN') : ''}</time></span></button>)}
    </div>}
  </div>;
}
