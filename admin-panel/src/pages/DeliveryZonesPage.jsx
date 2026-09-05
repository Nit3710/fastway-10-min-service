import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { showToast, apiErrorMessage } from '../toast';

const blank = { pincode: '', delivery_charge: '', is_active: true };
export default function DeliveryZonesPage() {
  const [data,setData]=useState({content:[],totalPages:0}); const [page,setPage]=useState(0); const [search,setSearch]=useState('');
  const [modal,setModal] = useState(null); const [form,setForm] = useState(blank); const [saving,setSaving] = useState(false); const [busy,setBusy] = useState(false); const [result,setResult] = useState(null); const [errors,setErrors] = useState({});
  const [previewRows, setPreviewRows] = useState(null); const [pendingFile, setPendingFile] = useState(null);
  const input=useRef();
  const load=()=>api.get('/api/admin/serviceable-pincodes',{params:{search,page,size:15}}).then(r=>setData(r.data.data)).catch(e=>showToast(apiErrorMessage(e,'Could not load delivery zones.')));
  useEffect(()=>{load()},[page,search]);
  const save=async()=>{
    const nextErrors = {};
    if(!/^\d{6}$/.test(form.pincode)) nextErrors.pincode = 'Pincode must be exactly 6 digits.';
    if(form.delivery_charge===''||Number(form.delivery_charge)<0||isNaN(Number(form.delivery_charge))) nextErrors.delivery_charge = 'Enter a valid delivery charge.';
    if(Object.keys(nextErrors).length>0){ setErrors(nextErrors); return; }
    setSaving(true);
    try { const body={pincode:form.pincode,delivery_charge:Number(form.delivery_charge),is_active:form.is_active}; if(modal==='add') await api.post('/api/admin/serviceable-pincodes',body); else await api.put(`/api/admin/serviceable-pincodes/${form.pincode}`,body); showToast('Delivery zone saved.','success');setModal(null);load(); } catch(e){showToast(apiErrorMessage(e,'Could not save delivery zone.'))} finally{setSaving(false)}
  };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const rows = [];
      let isHeader = true;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (isHeader && (line.toLowerCase().includes('pincode') || line.toLowerCase().includes('charge'))) {
          isHeader = false;
          continue;
        }
        isHeader = false;
        const cols = line.split(',');
        if (cols.length >= 2) {
          rows.push({
            pincode: cols[0]?.trim() || '',
            deliveryCharge: cols[1]?.trim() || '0',
            isActive: cols[2] ? cols[2].trim().toLowerCase() === 'true' : true
          });
        }
      }
      setPendingFile(file);
      setPreviewRows(rows);
    };
    reader.readAsText(file);
  };
  const confirmBulkUpload = async () => {
    if (!pendingFile) return;
    setBusy(true);
    setPreviewRows(null);
    const fd = new FormData();
    fd.append('file', pendingFile);
    try {
      const r = await api.post('/api/admin/serviceable-pincodes/bulk-upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(r.data.data);
      showToast('Bulk upload processed.', 'success');
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Bulk upload failed.'));
    } finally {
      setBusy(false);
      setPendingFile(null);
    }
  };
  return <div style={styles.page}><div style={styles.header}><div><h1 style={styles.title}>Delivery Zones</h1><p style={styles.sub}>Manage serviceable pincodes and delivery charges</p></div><div style={styles.actions}><input ref={input} type="file" accept=".csv,text/csv" hidden onChange={handleFileChange}/><button style={styles.secondary} onClick={()=>input.current?.click()} disabled={busy}>{busy?'Uploading...':'Bulk Upload CSV'}</button><button style={styles.primary} onClick={()=>{setForm(blank);setErrors({});setModal('add')}}>+ Add Zone</button></div></div><input style={styles.search} placeholder="Search pincode" value={search} onChange={e=>{setPage(0);setSearch(e.target.value)}}/><div className="table-card"><div className="table-scroll"><table style={styles.table}><thead><tr><th style={styles.th}>Pincode</th><th style={styles.th}>Delivery charge</th><th style={styles.th}>Status</th><th style={styles.th}>Actions</th></tr></thead><tbody>{data.content?.map(z=><tr key={z.pincode} style={styles.tr}><td style={styles.td}>{z.pincode}</td><td style={styles.td}>₹{Number(z.deliveryCharge).toFixed(2)}</td><td style={styles.td}><button className={`admin-badge ${z.isActive ? 'badge-active' : 'badge-inactive'}`} onClick={()=>api.put(`/api/admin/serviceable-pincodes/${z.pincode}`,{is_active:!z.isActive}).then(load)}>{z.isActive?'Active':'Inactive'}</button></td><td style={styles.td}><div style={styles.actionsCell}><button style={styles.edit} onClick={()=>{setForm({pincode:z.pincode,delivery_charge:z.deliveryCharge,is_active:z.isActive});setErrors({});setModal('edit')}}>Edit</button><button style={styles.del} onClick={()=>api.delete(`/api/admin/serviceable-pincodes/${z.pincode}`).then(()=>{showToast('Zone deactivated.','success');load()})}>Deactivate</button></div></td></tr>)}{(!data.content || data.content.length === 0) && <tr><td colSpan={4} style={{...styles.td,textAlign:'center',color:'var(--text-muted)',padding:'2rem'}}>No delivery zones found.</td></tr>}</tbody></table></div></div><div style={styles.pager}><button style={page===0?{...styles.secondary,opacity:0.5,cursor:'not-allowed'}:styles.secondary} disabled={page===0} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page+1} of {Math.max(1,data.totalPages||1)}</span><button style={page+1>=(data.totalPages||1)?{...styles.secondary,opacity:0.5,cursor:'not-allowed'}:styles.secondary} disabled={page+1>=(data.totalPages||1)} onClick={()=>setPage(page+1)}>Next</button></div>{previewRows&&<div style={styles.overlay}><div style={styles.modal}><h2>CSV Data Preview</h2><p style={styles.sub}>Found {previewRows.length} records to import</p><div style={{maxHeight:'200px',overflowY:'auto',border:'1px solid var(--border-color)',borderRadius:'0.5rem',background:'var(--bg-primary)',margin:'0.5rem 0'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}><thead><tr style={{borderBottom:'1px solid var(--border-color)'}}><th style={{...styles.th,padding:'0.45rem 0.6rem'}}>Pincode</th><th style={{...styles.th,padding:'0.45rem 0.6rem'}}>Charge</th><th style={{...styles.th,padding:'0.45rem 0.6rem'}}>Status</th></tr></thead><tbody>{previewRows.slice(0,5).map((r,i)=><tr key={i} style={{borderBottom:i===Math.min(5,previewRows.length)-1?'none':'1px solid var(--border-color)'}}><td style={{...styles.td,padding:'0.45rem 0.6rem'}}>{r.pincode}</td><td style={{...styles.td,padding:'0.45rem 0.6rem'}}>₹{Number(r.deliveryCharge).toFixed(2)}</td><td style={{...styles.td,padding:'0.45rem 0.6rem'}}><span className={`admin-badge ${r.isActive ? 'badge-active' : 'badge-inactive'}`} style={{fontSize:'0.7rem',padding:'0.1rem 0.35rem'}}>{r.isActive?'Active':'Inactive'}</span></td></tr>)}</tbody></table>{previewRows.length>5&&<div style={{padding:'0.5rem',textAlign:'center',fontSize:'0.75rem',color:'var(--text-muted)',borderTop:'1px solid var(--border-color)'}}>+ {previewRows.length-5} more rows...</div>}</div><div style={styles.modalBtns}><button style={styles.cancelBtn} onClick={()=>{setPreviewRows(null);setPendingFile(null)}}>Cancel</button><button style={styles.confirmBtn} disabled={busy} onClick={confirmBulkUpload}>{busy?'Uploading...':'Confirm Import'}</button></div></div></div>}{result&&<div style={styles.overlay}><div style={styles.modal}><h2>Bulk Upload Result</h2><div style={{display:'grid',gap:'0.4rem',margin:'0.2rem 0',fontSize:'0.9rem'}}><p>Succeeded: <strong style={{color:'#22c55e'}}>{result.succeeded}</strong></p><p>Failed: <strong style={{color:'#ef4444'}}>{result.failed}</strong></p></div>{result.failures?.length>0&&<div style={{maxHeight:'160px',overflowY:'auto',border:'1px solid var(--border-color)',padding:'0.6rem',borderRadius:'0.4rem',background:'var(--bg-primary)',fontSize:'0.78rem'}}><ul style={{paddingLeft:'1.2rem',margin:0,display:'grid',gap:'0.25rem',color:'var(--text-secondary)'}}>{result.failures.map(f=><li key={f.row}>Row {f.row}: {f.reason}</li>)}</ul></div>}<div style={styles.modalBtns}><button style={styles.confirmBtn} onClick={()=>setResult(null)}>Close</button></div></div></div>}{modal&&<div style={styles.overlay}><div style={styles.modal}><h2>{modal==='add'?'Add delivery zone':'Edit delivery zone'}</h2><label>Pincode <span style={{ color: '#ef4444' }}>*</span><input style={{ ...styles.input, ...(errors.pincode ? styles.inputError : {}) }} value={form.pincode} disabled={modal==='edit'} required pattern="\d{6}" title="Exactly 6 digits pincode" onChange={e=>{setForm({...form,pincode:e.target.value}); if(errors.pincode) setErrors(prev=>({...prev,pincode:''}))}}/>{errors.pincode&&<p style={{color:'#ef4444',fontSize:'0.75rem',marginTop:'0.2rem'}}>{errors.pincode}</p>}</label><label>Delivery charge <span style={{ color: '#ef4444' }}>*</span><input style={{ ...styles.input, ...(errors.delivery_charge ? styles.inputError : {}) }} type="number" min="0" required value={form.delivery_charge} onChange={e=>{setForm({...form,delivery_charge:e.target.value}); if(errors.delivery_charge) setErrors(prev=>({...prev,delivery_charge:''}))}}/>{errors.delivery_charge&&<p style={{color:'#ef4444',fontSize:'0.75rem',marginTop:'0.2rem'}}>{errors.delivery_charge}</p>}</label><label>Status<select style={styles.input} value={String(form.is_active)} onChange={e=>setForm({...form,is_active:e.target.value==='true'})}><option value="true">Active</option><option value="false">Inactive</option></select></label><div style={styles.modalBtns}><button style={styles.cancelBtn} onClick={()=>setModal(null)}>Cancel</button><button style={styles.confirmBtn} disabled={saving} onClick={save}>{saving?'Saving...':'Save'}</button></div></div></div>}</div>
}
const styles={page:{padding:'2rem'},header:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem',marginBottom:'1rem'},title:{color:'var(--text-primary)',fontSize:'1.5rem',fontWeight:700,margin:0},sub:{color:'var(--text-muted)',fontSize:'.85rem',marginTop:'.35rem'},actions:{display:'flex',gap:'.6rem'},primary:{background:'var(--btn-primary-bg)',color:'var(--btn-primary-text)',border:0,padding:'.6rem 1rem',borderRadius:'.5rem',cursor:'pointer',fontWeight:600},secondary:{background:'var(--btn-secondary-bg)',color:'var(--btn-secondary-text)',border:0,padding:'.6rem 1rem',borderRadius:'.5rem',cursor:'pointer'},search:{width:'min(360px,100%)',marginBottom:'1rem',background:'var(--input-bg)',border:'1px solid var(--input-border)',color:'var(--input-text)',padding:'.65rem .8rem',borderRadius:'.5rem'},table:{width:'100%',background:'transparent',borderCollapse:'collapse'},th:{textAlign:'left',color:'var(--text-muted)',padding:'.75rem 1rem',borderBottom:'1px solid var(--border-color)',fontSize:'0.75rem'},tr:{borderBottom:'1px solid var(--border-color)'},td:{color:'var(--text-secondary)',padding:'.75rem 1rem',fontSize:'0.85rem'},badge:{color:'#fff',border:0,borderRadius:'99px',padding:'.3rem .65rem',cursor:'pointer'},actionsCell:{display:'flex',gap:'0.5rem',alignItems:'center'},edit:{background:'var(--btn-secondary-bg)',color:'var(--btn-secondary-text)',border:0,padding:'.35rem .65rem',borderRadius:'.35rem',cursor:'pointer',fontSize:'0.8rem'},del:{background:'var(--btn-danger-bg)',color:'var(--btn-danger-text)',border:0,padding:'.35rem .65rem',borderRadius:'.35rem',cursor:'pointer',fontSize:'0.8rem'},pager:{display:'flex',gap:'1rem',justifyContent:'center',alignItems:'center',padding:'1rem 0',color:'var(--text-muted)'},result:{marginTop:'1rem',padding:'1rem',background:'var(--bg-secondary)',border:'1px solid var(--border-color)',borderRadius:'.6rem',color:'var(--text-secondary)'},overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100},modal:{background:'var(--bg-secondary)',color:'var(--text-primary)',padding:'2rem',borderRadius:'1rem',width:'min(460px,calc(100vw - 2rem))',display:'grid',gap:'.8rem',border:'1px solid var(--border-color)'},input:{display:'block',width:'100%',marginTop:'.3rem',background:'var(--input-bg)',border:'1px solid var(--input-border)',color:'var(--input-text)',padding:'.6rem',borderRadius:'.4rem'},modalBtns:{display:'flex',justifyContent:'flex-end',gap:'.6rem',marginTop:'.5rem'},cancelBtn:{background:'transparent',border:'1px solid var(--border-color)',color:'var(--text-secondary)',padding:'0.5rem 1rem',borderRadius:'0.5rem',cursor:'pointer'},confirmBtn:{background:'var(--btn-primary-bg)',color:'var(--btn-primary-text)',border:'none',padding:'0.5rem 1rem',borderRadius:'0.5rem',cursor:'pointer',fontWeight:600},inputError:{borderColor:'#ef4444',boxShadow:'0 0 0 1px #ef4444'}};
