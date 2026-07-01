import { useState, useMemo } from 'react';
import { Monitor, Laptop, Plus, Edit3, Trash2, RotateCcw, Wrench, QrCode, Printer } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import StatCard from '../../components/ui/StatCard';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';

export default function AssetsPage() {
  const { data, assets, assetsSource, assetsLoading } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ type: 'Laptop', name: '', serial: '', vendor: '', cost: '', warranty: '1 year' });

  const allAssets = data.assets;
  const filtered = useMemo(() => allAssets.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = !s || a.name.toLowerCase().includes(s) || a.serial.toLowerCase().includes(s) || (a.assignedTo || '').toLowerCase().includes(s);
    const matchType = !filters.type || filters.type === 'All' || a.type === filters.type;
    const matchStatus = !filters.status || filters.status === 'All' || a.status === filters.status;
    return matchSearch && matchType && matchStatus;
  }), [allAssets, search, filters]);

  const handleCreate = async () => {
    if (!form.name || !form.serial) { toast.error('Name and serial number required'); return; }
    try {
      await assets.create({ ...form, status: 'Available', assignedTo: null, assignedDate: null, purchaseDate: new Date().toISOString().split('T')[0], location: 'Hyderabad', condition: 'Excellent' });
      toast.success('Asset added successfully');
      setShowAdd(false); setForm({ type: 'Laptop', name: '', serial: '', vendor: '', cost: '', warranty: '1 year' });
    } catch (err) {
      toast.error(err.message || 'Failed to add asset');
    }
  };

  const handleAssign = async (asset) => {
    try {
      await assets.update(asset.id, { status: 'Assigned', assignedTo: 'New Employee', assignedDate: new Date().toISOString().split('T')[0] });
      toast.success('Asset assigned');
    } catch (err) {
      toast.error(err.message || 'Failed to assign asset');
    }
  };
  const handleUnassign = async (asset) => {
    try {
      await assets.update(asset.id, { status: 'Available', assignedTo: null, assignedDate: null });
      toast.info('Asset unassigned');
    } catch (err) {
      toast.error(err.message || 'Failed to return asset');
    }
  };
  const handleRepair = async (asset) => {
    try {
      await assets.update(asset.id, { status: 'Under Repair' });
      toast.warning('Asset sent for repair');
    } catch (err) {
      toast.error(err.message || 'Failed to update asset');
    }
  };
  const handleDispose = async (asset) => {
    const ok = await confirm({ title: 'Dispose Asset?', message: `Dispose ${asset.name} (${asset.serial})?`, type: 'danger', confirmText: 'Dispose' });
    if (!ok) return;
    try {
      await assets.update(asset.id, { status: 'Disposed' });
      toast.warning('Asset disposed');
    } catch (err) {
      toast.error(err.message || 'Failed to dispose asset');
    }
  };
  const handleDelete = async (asset) => {
    const ok = await confirm({ title: 'Delete Asset?', message: `Delete ${asset.name}?`, type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await assets.remove(asset.id);
      toast.success('Asset deleted');
      setSelected(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete asset');
    }
  };

  const statusCounts = { Assigned: allAssets.filter(a => a.status === 'Assigned').length, Available: allAssets.filter(a => a.status === 'Available').length, 'Under Repair': allAssets.filter(a => a.status === 'Under Repair').length };

  const columns = [
    { key: 'type', label: 'Type' },
    { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-text">{v}</span> },
    { key: 'serial', label: 'Serial No', render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'assignedTo', label: 'Assigned To', render: (v) => v || <span className="text-text-secondary">-</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
    { key: 'condition', label: 'Condition' },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(row); }} className="p-1 rounded hover:bg-surface-3 text-text-secondary"><Monitor size={14} /></button>
        {row.status === 'Available' && <button onClick={(e) => { e.stopPropagation(); handleAssign(row); }} className="p-1 rounded hover:bg-success/10 text-success text-xs">Assign</button>}
        {row.status === 'Assigned' && <button onClick={(e) => { e.stopPropagation(); handleUnassign(row); }} className="p-1 rounded hover:bg-warning/10 text-warning text-xs">Return</button>}
        <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="p-1 rounded hover:bg-danger/10 text-danger"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Assets' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Assets</h1>
          <p className="text-sm text-text-secondary">
            {assetsLoading ? 'Loading from server...' : `${allAssets.length} total assets`}
            {!assetsLoading && assetsSource === 'mock' && <span className="ml-2 text-warning">(demo data)</span>}
          </p>
        </div>
        <Button icon={Plus} size="sm" onClick={() => setShowAdd(true)}>Add Asset</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Monitor} label="Total" value={allAssets.length} color="primary" delay={0} />
        <StatCard icon={Laptop} label="Assigned" value={statusCounts.Assigned} color="success" delay={1} />
        <StatCard icon={Monitor} label="Available" value={statusCounts.Available} color="info" delay={2} />
        <StatCard icon={Wrench} label="Under Repair" value={statusCounts['Under Repair']} color="warning" delay={3} />
      </div>
      <SearchFilter searchValue={search} onSearch={setSearch} filters={[
        { key: 'type', label: 'Type', options: ['Laptop','Monitor','Keyboard','Mouse','Headset','ID Card','SIM','Software License','Access Card'] },
        { key: 'status', label: 'Status', options: ['Assigned','Available','Under Repair','Disposed','In Transit'] },
      ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />
      <Card padding={false}><DataTable columns={columns} data={filtered} pageSize={12} onRowClick={setSelected} /></Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Asset">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} options={['Laptop','Monitor','Keyboard','Mouse','Headset','ID Card','SIM','Software License','Access Card'].map(v => ({ value: v, label: v }))} />
          <Input label="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. MacBook Pro 14" />
          <Input label="Serial No *" value={form.serial} onChange={e => setForm(p => ({ ...p, serial: e.target.value }))} />
          <Input label="Vendor" value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} />
          <Input label="Cost" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="₹" />
          <Input label="Warranty" value={form.warranty} onChange={e => setForm(p => ({ ...p, warranty: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleCreate}>Add Asset</Button></div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Asset Details" size="lg">
        {selected && <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[['Type', selected.type], ['Name', selected.name], ['Serial', selected.serial], ['Status', selected.status], ['Assigned To', selected.assignedTo || '-'], ['Condition', selected.condition], ['Vendor', selected.vendor], ['Cost', selected.cost], ['Purchase Date', selected.purchaseDate], ['Warranty', selected.warranty], ['Location', selected.location], ['Assigned Date', selected.assignedDate || '-']].map(([k, v]) => (
              <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium">{v}</p></div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {selected.status === 'Available' && <Button size="sm" onClick={() => { handleAssign(selected); setSelected(null); }}>Assign</Button>}
            {selected.status === 'Assigned' && <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => { handleUnassign(selected); setSelected(null); }}>Return</Button>}
            <Button size="sm" variant="secondary" icon={Wrench} onClick={() => { handleRepair(selected); setSelected(null); }}>Send for Repair</Button>
            <Button size="sm" variant="secondary" icon={QrCode} onClick={() => toast.info('QR Code generated')}>QR Code</Button>
            <Button size="sm" variant="secondary" icon={Printer} onClick={() => toast.info('Asset label printed')}>Print Label</Button>
            <Button size="sm" variant="danger" onClick={() => handleDispose(selected)}>Dispose</Button>
          </div>
        </div>}
      </Modal>
    </div>
  );
}
