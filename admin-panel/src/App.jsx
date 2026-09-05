import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import UsersPage from './pages/UsersPage';
import DeliveryPartnersPage from './pages/DeliveryPartnersPage';
import PaymentsPage from './pages/PaymentsPage';
import ToastViewport from './components/ToastViewport';
import NotificationBell from './components/NotificationBell';
import NotificationsPage from './pages/NotificationsPage';
import Icon from './components/Icon';
import DeliveryZonesPage from './pages/DeliveryZonesPage';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('admin_theme') || 'dark');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return null; }
  });

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
    setSidebarOpen(false);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    document.body.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <ToastViewport />
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route
            path="/*"
            element={
              <div className="admin-shell" style={styles.app}>
                <button className="mobile-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">☰</button>
                <div className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
                <Sidebar user={user} onLogout={handleLogout} isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
                <main className="admin-main" style={styles.main}>
                  <div className="admin-topbar">
                    <div className="topbar-actions">
                      <button className="theme-toggle" onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
                        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18}/>
                      </button>
                      <NotificationBell />
                    </div>
                  </div>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/delivery-partners" element={<DeliveryPartnersPage />} />
                    <Route path="/payments" element={<PaymentsPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/delivery-zones" element={<DeliveryZonesPage />} />
                    <Route path="/login" element={<Navigate to="/" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  );
}

const styles = {
  app: { display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' },
  main: { flex: 1, overflowY: 'auto', minHeight: '100vh' },
};
