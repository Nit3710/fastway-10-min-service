import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' }, { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/products', label: 'Products', icon: 'products' }, { to: '/categories', label: 'Categories', icon: 'categories' },
  { to: '/users', label: 'Users', icon: 'users' }, { to: '/delivery-partners', label: 'Delivery Partners', icon: 'delivery' },
  { to: '/payments', label: 'Payments', icon: 'payments' }, { to: '/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/delivery-zones', label: 'Delivery Zones', icon: 'delivery' },
];

export default function Sidebar({ user, onLogout, isOpen, onNavigate }) {
  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`} style={styles.sidebar}>
      <div style={styles.brand}>
        <span style={{ ...styles.brandIcon, display: 'flex', alignItems: 'center', color: 'var(--accent-color)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 48 46" fill="currentColor"><path d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"></path></svg>
        </span>
        <div><div style={styles.brandText}>Fastway</div><div style={styles.brandSubtext}>Admin console</div></div>
      </div>
      <div style={styles.userInfo}>
        <div style={styles.avatar}>{user?.name?.[0] || 'A'}</div>
        <div>
          <div style={styles.userName}>{user?.name || 'Admin'}</div>
          <div style={styles.userRole}>Administrator</div>
        </div>
      </div>
      <nav style={styles.nav}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={onNavigate}
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navActive : {}) })}>
            <Icon name={item.icon} size={17} /><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <button onClick={onLogout} style={styles.logoutBtn}>
        <Icon name="logout" size={17} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

const styles = {
  sidebar: { width: '240px', minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', padding: '1.5rem 0', flexShrink: 0, borderRight: '1px solid var(--border-color)' },
  brand: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' },
  brandIcon: { fontSize: '1.5rem' },
  brandText: { color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' },
  brandSubtext: { color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
  userName: { color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' },
  userRole: { color: 'var(--text-muted)', fontSize: '0.75rem' },
  nav: { flex: 1, padding: '1rem 0' },
  navLink: { display: 'flex', padding: '0.65rem 1.25rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, borderLeft: '3px solid transparent', alignItems: 'center', gap: '11px' },
  navActive: { color: '#60a5fa', background: 'rgba(59,130,246,0.1)', borderLeftColor: '#3b82f6' },
  logoutBtn: { margin: '0 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.6rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
};
