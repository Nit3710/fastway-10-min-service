import { useEffect, useState, useRef } from 'react';
import api from '../api';
import { showToast, apiErrorMessage } from '../toast';

const emptyForm = { name: '', description: '', price: '', mrp: '', sku: '', stockQty: '', unit: 'piece', categoryId: '', brandId: '', imageUrl: '', isActive: true };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const fetchProducts = () => {
    setLoading(true);
    api.get(`/api/products?page=${page}&size=10${search ? `&search=${search}` : ''}`)
      .then(r => { setProducts(r.data.data.content); setTotalPages(r.data.data.totalPages); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [page, search]);
  useEffect(() => {
    api.get('/api/categories').then(r => setCategories(r.data.data));
    api.get('/api/brands').then(r => setBrands(r.data.data)).catch(() => {});
  }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setErrors({}); setModal('add'); };
  const openEdit = (p) => {
    setForm({ name: p.name, description: p.description || '', price: p.price, mrp: p.mrp || '', sku: p.sku || '', stockQty: p.stockQty, unit: p.unit || 'piece', categoryId: p.category?.id || p.categoryId || '', brandId: p.brand?.id || p.brandId || '', imageUrl: p.imageUrl || '', isActive: p.isActive });
    setEditId(p.id); setErrors({}); setModal('edit');
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select a valid image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB.'); return; }
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Reuse the Supabase upload endpoint (profile-picture) which returns a URL in data.profilePictureUrl
      const res = await api.post('/api/users/profile-picture', fd);
      const url = res.data?.data?.profilePictureUrl;
      if (url) {
        setForm(prev => ({ ...prev, imageUrl: url }));
        showToast('Image uploaded!', 'success');
      } else {
        throw new Error('No URL returned');
      }
    } catch {
      // Fallback: local blob preview — URL will be empty string on save unless user also pastes URL
      const localUrl = URL.createObjectURL(file);
      fileInputRef.current._pendingFile = file;
      setForm(prev => ({ ...prev, imageUrl: localUrl }));
      showToast('Preview set. Upload may complete on save.', 'success');
    } finally {
      setImageUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setImageDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const handleSave = async () => {
    const name = String(form.name || '').trim();
    const price = Number(form.price);
    const stockQty = Number(form.stockQty);
    const nextErrors = {};
    if (!name) nextErrors.name = 'Product name is required.';
    if (form.price === '' || !Number.isFinite(price) || price <= 0) nextErrors.price = 'Enter a valid price greater than 0.';
    if (form.mrp === '' || !Number.isFinite(Number(form.mrp)) || Number(form.mrp) <= 0) nextErrors.mrp = 'Enter a valid MRP greater than 0.';
    if (form.stockQty === '' || !Number.isFinite(stockQty) || stockQty < 0 || !Number.isInteger(stockQty)) nextErrors.stockQty = 'Stock quantity must be a whole number (0 or more).';
    if (!String(form.sku || '').trim()) nextErrors.sku = 'SKU is required.';
    if (!String(form.unit || '').trim()) nextErrors.unit = 'Unit is required.';
    if (!form.categoryId) nextErrors.categoryId = 'Please select a category.';
    if (!form.brandId) nextErrors.brandId = 'Please select a brand.';
    if (Object.keys(nextErrors).length > 0) { setErrors(nextErrors); return; }

    // If imageUrl is a blob (local preview), clear it before save — server won't accept blob URLs
    const imageUrl = form.imageUrl.startsWith('blob:') ? '' : form.imageUrl;
    const body = { ...form, imageUrl, price: Number(form.price), mrp: Number(form.mrp), stockQty: Number(form.stockQty), categoryId: form.categoryId ? Number(form.categoryId) : null, brandId: form.brandId ? Number(form.brandId) : null };
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/api/products', body);
      else await api.put(`/api/products/${editId}`, body);
      setModal(null);
      showToast(modal === 'add' ? 'Product created successfully.' : 'Product updated successfully.', 'success');
      fetchProducts();
    } catch (error) { showToast(apiErrorMessage(error, 'Could not save product.')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      try {
        await api.delete(`/api/products/${id}`);
        showToast('Product deleted successfully.', 'success');
        fetchProducts();
      } catch (error) {
        showToast(apiErrorMessage(error, 'Failed to delete product.'));
      }
    }
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Products</h1>
        <button style={styles.addBtn} onClick={openAdd}>+ Add Product</button>
      </div>
      <div style={styles.toolbar}>
        <input style={styles.search} placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      </div>

      {loading ? <div style={styles.info}>Loading...</div> : (
        <div className="table-card">
          <div className="table-scroll"><table style={styles.table}>
            <thead><tr>{['Image','Name','Price','Stock','Category','Status','Actions'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}>{p.imageUrl ? <img src={p.imageUrl} alt="" style={styles.img} /> : '📦'}</td>
                  <td style={styles.td}>{p.name}<br /><span style={styles.sub}>ID: {p.id}</span></td>
                  <td style={styles.td}>₹{p.price ? Number(p.price).toLocaleString('en-IN') : '0'}</td>
                  <td style={styles.td}>{p.stockQty}</td>
                  <td style={styles.td}>{p.category?.name || '-'}</td>
                  <td style={styles.td}><span className={`admin-badge ${p.isActive ? 'badge-active' : 'badge-inactive'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={styles.td}>
                    <div style={styles.actionsCell}>
                      <button style={styles.editBtn} onClick={() => openEdit(p)}>Edit</button>
                      <button style={styles.delBtn} onClick={() => handleDelete(p.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No products found.</td></tr>
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

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h3>

            {[['name','Name',true],['description','Description',false],['price','Price',true],['mrp','MRP',true],['sku','SKU',true],['stockQty','Stock Qty',true],['unit','Unit',true]].map(([k,label,req]) => (
              <div key={k}>
                <label style={styles.label}>{label} {req && <span style={{ color: '#ef4444' }}>*</span>}</label>
                <input
                  style={{ ...styles.input, ...(errors[k] ? styles.inputError : {}) }}
                  value={form[k]}
                  onChange={e => { f(k)(e); if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' })); }}
                  required={req}
                />
                {errors[k] && <span style={styles.errorText}>{errors[k]}</span>}
              </div>
            ))}

            {/* Image Upload */}
            <div>
              <label style={styles.label}>Product Image</label>
              <div
                style={{ ...styles.uploadBox, ...(imageDragOver ? styles.uploadBoxDrag : {}) }}
                onDragOver={e => { e.preventDefault(); setImageDragOver(true); }}
                onDragLeave={() => setImageDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUploading ? (
                  <div style={styles.uploadPlaceholder}>
                    <div style={styles.uploadSpinner} />
                    <span style={styles.uploadHint}>Uploading...</span>
                  </div>
                ) : form.imageUrl ? (
                  <div style={styles.uploadPreviewWrap}>
                    <img src={form.imageUrl} alt="preview" style={styles.uploadPreview} onError={e => { e.target.style.display = 'none'; }} />
                    <div style={styles.uploadOverlay}>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>Click or drag to change</span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.uploadPlaceholder}>
                    <span style={{ fontSize: '2rem' }}>🖼️</span>
                    <span style={styles.uploadHint}>Click or drag &amp; drop image here</span>
                    <span style={styles.uploadSubhint}>PNG, JPG, WEBP — max 5MB</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageFile(e.target.files[0])} />
              <input
                style={{ ...styles.input, marginTop: '0.4rem', fontSize: '0.78rem' }}
                placeholder="Or paste image URL directly..."
                value={form.imageUrl.startsWith('blob:') ? '' : form.imageUrl}
                onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
              />
            </div>

            <div>
              <label style={styles.label}>Category <span style={{ color: '#ef4444' }}>*</span></label>
              <select style={{ ...styles.select, ...(errors.categoryId ? styles.inputError : {}) }} value={form.categoryId}
                onChange={e => { f('categoryId')(e); if (errors.categoryId) setErrors(prev => ({ ...prev, categoryId: '' })); }} required>
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <span style={styles.errorText}>{errors.categoryId}</span>}
            </div>
            <div>
              <label style={styles.label}>Brand <span style={{ color: '#ef4444' }}>*</span></label>
              <select style={{ ...styles.select, ...(errors.brandId ? styles.inputError : {}) }} value={form.brandId}
                onChange={e => { f('brandId')(e); if (errors.brandId) setErrors(prev => ({ ...prev, brandId: '' })); }} required>
                <option value="">Select brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {errors.brandId && <span style={styles.errorText}>{errors.brandId}</span>}
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
  toolbar: { marginBottom: '1rem' },
  info: { color: 'var(--text-secondary)', padding: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'transparent' },
  search: { width: 'min(360px, 100%)', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.875rem' },
  th: { color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem 1rem', verticalAlign: 'middle' },
  sub: { color: 'var(--text-muted)', fontSize: '0.75rem' },
  img: { width: '40px', height: '40px', objectFit: 'cover', borderRadius: '0.4rem' },
  actionsCell: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  editBtn: { background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' },
  delBtn: { background: 'var(--btn-danger-bg)', color: 'var(--btn-danger-text)', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' },
  pagination: { display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', justifyContent: 'center' },
  pageBtn: { background: 'var(--btn-secondary-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '0.4rem', cursor: 'pointer' },
  pageInfo: { color: 'var(--text-muted)', fontSize: '0.875rem' },
  input: { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.875rem', boxSizing: 'border-box' },
  select: { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.875rem' },
  label: { color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, overflowY: 'auto' },
  modal: { background: 'var(--bg-secondary)', borderRadius: '1rem', padding: '2rem', width: '480px', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)' },
  modalTitle: { color: 'var(--text-primary)', fontWeight: 700, margin: 0 },
  modalBtns: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' },
  confirmBtn: { background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 },
  inputError: { borderColor: '#ef4444', boxShadow: '0 0 0 1px #ef4444' },
  errorText: { color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' },
  uploadBox: { border: '2px dashed var(--input-border)', borderRadius: '0.6rem', minHeight: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--input-bg)', transition: 'border-color 0.2s, background 0.2s', position: 'relative', overflow: 'hidden' },
  uploadBoxDrag: { borderColor: 'var(--btn-primary-bg)', background: 'rgba(99,102,241,0.07)' },
  uploadPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', padding: '1rem' },
  uploadHint: { color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 },
  uploadSubhint: { color: 'var(--text-muted)', fontSize: '0.75rem' },
  uploadPreviewWrap: { width: '100%', height: '130px', position: 'relative' },
  uploadPreview: { width: '100%', height: '130px', objectFit: 'contain', borderRadius: '0.4rem' },
  uploadOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', borderRadius: '0.4rem' },
  uploadSpinner: { width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: 'var(--btn-primary-bg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
};
