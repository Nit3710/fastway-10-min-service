import { useEffect, useState } from 'react';

export default function ToastViewport() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (event) => {
      const id = `${Date.now()}-${Math.random()}`;
      const toast = { id, ...(event.detail || {}) };
      setToasts(current => [...current, toast]);
      window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 4500);
    };
    window.addEventListener('admin-toast', onToast);
    return () => window.removeEventListener('admin-toast', onToast);
  }, []);

  return <div className="toast-viewport" aria-live="polite">
    {toasts.map(toast => <div key={toast.id} className={`admin-toast ${toast.type || 'error'}`}>
      <span>{toast.type === 'success' ? '✓' : '!'}</span><span>{toast.message}</span>
      <button aria-label="Dismiss" onClick={() => setToasts(current => current.filter(item => item.id !== toast.id))}>×</button>
    </div>)}
  </div>;
}
