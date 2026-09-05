import { useEffect, useState } from 'react';
import api from '../api';
import { showToast, apiErrorMessage } from '../toast';

const emptyForm = { name: '', description: '', imageUrl: '', parentId: '', isActive: true };

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const fetch = () => {
    setLoading(true);
    return api.get('/api/categories')
      .then(r => setCategories(flattenTree(r.data.data)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const flattenTree = (nodes, depth = 0) => nodes.flatMap(n => [{ ...n, depth }, ...flattenTree(n.children || [], depth + 1)]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setErrors({}); setModal('add'); };
  const openEdit = (c) => { setForm({ name: c.name, description: c.description || '', imageUrl: c.imageUrl || '', parentId: c.parentId || '', isActive: c.isActive }); setEditId(c.id); setErrors({}); setModal('edit'); };

  const handleSave = async () => {
    const nextErrors = {};
    if (!String(form.name || '').trim()) {
      nextErrors.name = 'Category name is required.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const body = { name: String(form.name).trim(), imageUrl: form.imageUrl || null, parentCategoryId: form.parentId ? Number(form.parentId) : null };
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/api/categories', body);
      else await api.put(`/api/categories/${editId}`, body);
      setModal(null); showToast(modal === 'add' ? 'Category created successfully.' : 'Category updated successfully.', 'success'); fetch();
    } catch (error) { showToast(apiErrorMessage(error, 'Could not save category.')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this category?')) {
      try {
        await api.delete(`/api/categories/${id}`);
        showToast('Category deleted successfully.', 'success');
        fetch();
      } catch (error) {
        showToast(apiErrorMessage(error, 'Failed to delete category.'));
      }
    }
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Categories</h1>
        <button style={styles.addBtn} onClick={openAdd}>+ Add Category</button>
      </div>
      {loading ? <div style={styles.info}>Loading categories...</div> : (
        <div className="table-card">
          <div className="table-scroll"><table style={styles.table}>
            <thead><tr>{['Name','Active','Actions'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td}><span style={{ paddingLeft: `${c.depth * 1.5}rem` }}>{'└─ '.repeat(c.depth)}{c.name}</span></td>
                  <td style={styles.td}><span className={`admin-badge ${c.isActive ? 'badge-active' : 'badge-inactive'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={styles.td}>
                    <div style={styles.actionsCell}>
                      <button style={styles.editBtn} onClick={() => openEdit(c)}>Edit</button>
                      <button style={styles.delBtn} onClick={() => handleDelete(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={3} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No categories found.</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      )}

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{modal === 'add' ? 'Add Category' : 'Edit Category'}</h3>
            {[['name','Name',true],['imageUrl','Image URL',false]].map(([k,label,req]) => (
              <div key={k}>
                <label style={styles.label}>
                  {label} {req && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input
                  style={{ ...styles.input, ...(errors[k] ? styles.inputError : {}) }}
                  value={form[k]}
                  onChange={e => {
                    f(k)(e);
                    if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' }));
                  }}
                  required={req}
                />
                {errors[k] && <span style={styles.errorText}>{errors[k]}</span>}
              </div>
            ))}
            <div>
              <label style={styles.label}>Parent Category</label>
              <select style={styles.select} value={form.parentId} onChange={f('parentId')}>
                <option value="">None (Root)</option>
                {categories.filter(c => c.id !== editId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Active</label>
              <select style={styles.select} value={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
                <option value="true">Yes</option><option value="false">No</option>
              </select>
            </div>
            <div style={styles.modalBtns}>
              <button style={styles.cancelBtn} onClick={() => setModal(null)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title: { color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, margin: 0 },
  addBtn: { background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'transparent' },
  th: { color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem 1rem' },
  badge: { color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
  editBtn: { background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', cursor: 'pointer', marginRight: '0.4rem', fontSize: '0.8rem' },
  delBtn: { background: 'var(--btn-danger-bg)', color: 'var(--btn-danger-text)', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' },
  input: { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.875rem', boxSizing: 'border-box' },
  select: { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.875rem' },
  label: { color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--bg-secondary)', borderRadius: '1rem', padding: '2rem', width: '480px', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border-color)' },
  modalTitle: { color: 'var(--text-primary)', fontWeight: 700, margin: 0 },
  modalBtns: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' },
  confirmBtn: { background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 },
  inputError: { borderColor: '#ef4444', boxShadow: '0 0 0 1px #ef4444' },
  errorText: { color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' },
};
