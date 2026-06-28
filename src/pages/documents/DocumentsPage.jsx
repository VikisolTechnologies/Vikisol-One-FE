import { useState, useMemo } from 'react';
import { FileText, Download, Plus, Upload, Trash2, Eye, Archive, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';

const categories = ['All', 'Employment', 'Legal', 'Compensation', 'Benefits', 'Policy', 'Performance', 'Disciplinary', 'Training', 'General'];

export default function DocumentsPage() {
  const { data, documents } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Employment', employee: '', empId: '' });

  const allDocs = data.documents;
  const filtered = useMemo(() => allDocs.filter(d => {
    const s = search.toLowerCase();
    const matchSearch = !s || d.name.toLowerCase().includes(s) || (d.employee || '').toLowerCase().includes(s);
    const matchCat = filter === 'All' || d.category === filter;
    return matchSearch && matchCat;
  }), [allDocs, search, filter]);

  const handleUpload = () => {
    if (!form.name) { toast.error('Document name is required'); return; }
    documents.create({ ...form, type: 'PDF', date: new Date().toISOString().split('T')[0], size: `${Math.floor(Math.random() * 2000 + 100)} KB`, uploadedBy: 'Admin', status: 'Active', version: 'v1.0', signed: false });
    toast.success(`Document "${form.name}" uploaded`);
    setShowUpload(false); setForm({ name: '', category: 'Employment', employee: '', empId: '' });
  };

  const handleDelete = async (doc) => {
    const ok = await confirm({ title: 'Delete Document?', message: `Delete "${doc.name}"?`, type: 'danger', confirmText: 'Delete' });
    if (ok) { documents.remove(doc.id); toast.success('Document deleted'); setSelected(null); }
  };

  const handleArchive = (doc) => { documents.update(doc.id, { status: 'Archived' }); toast.info('Document archived'); };
  const handleSign = (doc) => { documents.update(doc.id, { signed: true }); toast.success('Document digitally signed'); };

  const columns = [
    { key: 'name', label: 'Document', render: (v) => <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center"><FileText size={14} className="text-danger" /></div><span className="font-medium text-text">{v}</span></div> },
    { key: 'category', label: 'Category', render: (v) => <Badge variant="default">{v}</Badge> },
    { key: 'employee', label: 'Employee' },
    { key: 'date', label: 'Date' },
    { key: 'size', label: 'Size' },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
    { key: 'signed', label: 'Signed', render: (v) => v ? <CheckCircle size={14} className="text-success" /> : <span className="text-text-secondary text-xs">-</span> },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); toast.success(`${row.name} downloaded`); }} className="p-1 rounded hover:bg-surface-3 text-text-secondary" title="Download"><Download size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setSelected(row); }} className="p-1 rounded hover:bg-surface-3 text-text-secondary" title="View"><Eye size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="p-1 rounded hover:bg-danger/10 text-danger"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Documents' }]} />
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-text">Documents</h1><p className="text-sm text-text-secondary">{allDocs.length} documents</p></div>
        <Button icon={Upload} size="sm" onClick={() => setShowUpload(true)}>Upload Document</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === c ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary hover:text-text'}`}>{c}</button>)}
      </div>

      <SearchFilter searchValue={search} onSearch={setSearch} filters={[]} activeFilters={{}} onFilterChange={() => {}} onClearFilters={() => {}} placeholder="Search documents..." />
      <Card padding={false}><DataTable columns={columns} data={filtered} pageSize={12} onRowClick={setSelected} /></Card>

      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document">
        <div className="space-y-4">
          <Input label="Document Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Offer Letter - John" />
          <Select label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} options={categories.filter(c => c !== 'All').map(v => ({ value: v, label: v }))} />
          <Input label="Employee Name" value={form.employee} onChange={e => setForm(p => ({ ...p, employee: e.target.value }))} />
          <Input label="Employee ID" value={form.empId} onChange={e => setForm(p => ({ ...p, empId: e.target.value }))} />
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors">
            <Upload size={24} className="mx-auto text-text-secondary mb-2" />
            <p className="text-sm text-text-secondary">Click or drag to upload file</p>
            <p className="text-xs text-text-secondary mt-1">PDF, DOC, DOCX up to 10MB</p>
          </div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button><Button onClick={handleUpload}>Upload</Button></div>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name} size="lg">
        {selected && <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[['Category', selected.category], ['Employee', selected.employee || '-'], ['Employee ID', selected.empId || '-'], ['Date', selected.date], ['Size', selected.size], ['Version', selected.version], ['Status', selected.status], ['Uploaded By', selected.uploadedBy], ['Signed', selected.signed ? 'Yes' : 'No']].map(([k, v]) => (
              <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium">{v}</p></div>
            ))}
          </div>
          <div className="p-8 bg-surface-3 rounded-xl text-center"><FileText size={48} className="mx-auto text-text-secondary mb-2" /><p className="text-sm text-text-secondary">PDF Preview</p></div>
          <div className="flex gap-2 flex-wrap">
            <Button icon={Download} onClick={() => toast.success('Downloaded')}>Download</Button>
            {!selected.signed && <Button variant="secondary" icon={CheckCircle} onClick={() => { handleSign(selected); setSelected({ ...selected, signed: true }); }}>Digital Sign</Button>}
            <Button variant="secondary" icon={Archive} onClick={() => { handleArchive(selected); setSelected(null); }}>Archive</Button>
            <Button variant="danger" icon={Trash2} onClick={() => handleDelete(selected)}>Delete</Button>
          </div>
        </div>}
      </Modal>
    </div>
  );
}
