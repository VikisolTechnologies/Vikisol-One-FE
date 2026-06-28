import { useState, useMemo } from 'react';
import { UserPlus, Download, Upload, Eye, Edit3, Trash2, MoreVertical, UserCheck, UserX, Key, RefreshCw, FileText, Briefcase, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import Tabs from '../../components/ui/Tabs';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import ProgressBar from '../../components/ui/ProgressBar';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';

export default function EmployeeDirectory() {
  const { data, employees, stats } = useData();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [addForm, setAddForm] = useState({ name: '', email: '', department: 'Development', designation: '', location: 'Hyderabad', phone: '', employmentType: 'Full Time' });
  const [editForm, setEditForm] = useState({});

  const allEmps = data.employees;

  const filtered = useMemo(() => {
    return allEmps.filter(e => {
      const s = search.toLowerCase();
      const matchSearch = !s || e.name.toLowerCase().includes(s) || e.empId.toLowerCase().includes(s) || e.email.toLowerCase().includes(s) || e.department.toLowerCase().includes(s) || e.designation.toLowerCase().includes(s);
      const matchDept = !filters.department || filters.department === 'All' || e.department === filters.department;
      const matchStatus = !filters.status || filters.status === 'All' || e.status === filters.status;
      const matchLocation = !filters.location || filters.location === 'All' || e.location === filters.location;
      const matchType = !filters.employmentType || filters.employmentType === 'All' || e.employmentType === filters.employmentType;
      return matchSearch && matchDept && matchStatus && matchLocation && matchType;
    });
  }, [allEmps, search, filters]);

  const handleCreate = () => {
    if (!addForm.name || !addForm.email) { toast.error('Name and email are required'); return; }
    const empId = `VKS${String(allEmps.length + 100).padStart(3, '0')}`;
    employees.create({ ...addForm, empId, id: Date.now(), status: 'Active', joinDate: new Date().toISOString().split('T')[0], ctc: 600000, skills: [], manager: 'Rohit Sharma' });
    toast.success(`Employee ${addForm.name} created successfully`);
    setShowAdd(false);
    setAddForm({ name: '', email: '', department: 'Development', designation: '', location: 'Hyderabad', phone: '', employmentType: 'Full Time' });
  };

  const handleEdit = () => {
    employees.update(showEdit.id, editForm);
    toast.success(`Employee ${editForm.name || showEdit.name} updated successfully`);
    setShowEdit(null);
  };

  const handleDelete = async (emp) => {
    const ok = await confirm({ title: 'Delete Employee?', message: `Are you sure you want to delete ${emp.name}? This action cannot be undone.`, type: 'danger', confirmText: 'Delete' });
    if (ok) { employees.remove(emp.id); toast.success(`${emp.name} deleted successfully`); setContextMenu(null); }
  };

  const handleSuspend = async (emp) => {
    const ok = await confirm({ title: 'Suspend Employee?', message: `Suspend ${emp.name}? They will lose access to all systems.`, type: 'warning', confirmText: 'Suspend' });
    if (ok) { employees.update(emp.id, { status: 'Suspended' }); toast.warning(`${emp.name} has been suspended`); setContextMenu(null); }
  };

  const handleActivate = (emp) => { employees.update(emp.id, { status: 'Active' }); toast.success(`${emp.name} has been activated`); setContextMenu(null); };
  const handleResetPassword = (emp) => { toast.info(`Password reset link sent to ${emp.email}`); setContextMenu(null); };

  const handleGenerateLetter = (emp, type) => {
    toast.success(`${type} generated for ${emp.name}`);
    setContextMenu(null);
  };

  const filterConfig = [
    { key: 'department', label: 'Department', options: data.departments },
    { key: 'status', label: 'Status', options: ['Active', 'On Leave', 'Notice Period', 'Suspended'] },
    { key: 'location', label: 'Location', options: ['Hyderabad', 'Bangalore', 'Pune', 'Noida', 'Chennai', 'Mumbai', 'Gurgaon', 'Remote'] },
    { key: 'employmentType', label: 'Type', options: ['Full Time', 'Contract', 'Intern'] },
  ];

  const columns = [
    { key: 'name', label: 'Employee', render: (_, row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.name} size="sm" />
        <div><p className="font-medium text-text text-sm">{row.name}</p><p className="text-xs text-text-secondary">{row.empId}</p></div>
      </div>
    )},
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'status', label: 'Status', render: (v) => <Badge dot>{v}</Badge> },
    { key: 'location', label: 'Location' },
    { key: 'joinDate', label: 'Joined' },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex items-center gap-1 relative">
        <button onClick={(e) => { e.stopPropagation(); setSelectedEmp(row); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text"><Eye size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setEditForm({ ...row }); setShowEdit(row); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text"><Edit3 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setContextMenu(contextMenu?.id === row.id ? null : row); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text"><MoreVertical size={14} /></button>
        {contextMenu?.id === row.id && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-surface-2 border border-border rounded-xl shadow-2xl py-1 z-50" onMouseLeave={() => setContextMenu(null)}>
            {row.status === 'Active' ? (
              <button onClick={() => handleSuspend(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><UserX size={14} /> Suspend</button>
            ) : (
              <button onClick={() => handleActivate(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><UserCheck size={14} /> Activate</button>
            )}
            <button onClick={() => handleResetPassword(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><Key size={14} /> Reset Password</button>
            <button onClick={() => handleGenerateLetter(row, 'Offer Letter')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><FileText size={14} /> Generate Offer Letter</button>
            <button onClick={() => handleGenerateLetter(row, 'Experience Letter')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><FileText size={14} /> Experience Letter</button>
            <button onClick={() => handleGenerateLetter(row, 'Relieving Letter')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><FileText size={14} /> Relieving Letter</button>
            <hr className="border-border my-1" />
            <button onClick={() => handleDelete(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10"><Trash2 size={14} /> Delete Employee</button>
          </div>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Employees' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Employee Directory</h1>
          <p className="text-sm text-text-secondary">{allEmps.length} employees &middot; {stats.active} active</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Upload} size="sm" onClick={() => toast.info('Bulk upload template downloaded')}>Import</Button>
          <Button variant="secondary" icon={Download} size="sm" onClick={() => toast.success('Employee data exported')}>Export</Button>
          <Button icon={UserPlus} size="sm" onClick={() => setShowAdd(true)}>Add Employee</Button>
        </div>
      </div>

      <SearchFilter searchValue={search} onSearch={setSearch} filters={filterConfig} activeFilters={filters}
        onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
        onClearFilters={() => setFilters({})} placeholder="Search by name, ID, email, department..." />

      <Card padding={false}>
        <DataTable columns={columns} data={filtered} pageSize={12} onRowClick={setSelectedEmp} />
      </Card>

      {/* Add Employee Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Employee" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name *" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter full name" />
          <Input label="Email *" type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="email@vikisol.in" />
          <Select label="Department" value={addForm.department} onChange={e => setAddForm(p => ({ ...p, department: e.target.value }))} options={data.departments.map(d => ({ value: d, label: d }))} />
          <Input label="Designation" value={addForm.designation} onChange={e => setAddForm(p => ({ ...p, designation: e.target.value }))} placeholder="e.g. Senior Developer" />
          <Select label="Location" value={addForm.location} onChange={e => setAddForm(p => ({ ...p, location: e.target.value }))} options={['Hyderabad','Bangalore','Pune','Noida','Chennai','Mumbai','Remote'].map(l => ({ value: l, label: l }))} />
          <Input label="Phone" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
          <Select label="Employment Type" value={addForm.employmentType} onChange={e => setAddForm(p => ({ ...p, employmentType: e.target.value }))} options={[{ value: 'Full Time', label: 'Full Time' }, { value: 'Contract', label: 'Contract' }, { value: 'Intern', label: 'Intern' }]} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Employee</Button>
        </div>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Employee" size="lg">
        {showEdit && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              <Input label="Email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              <Select label="Department" value={editForm.department || ''} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} options={data.departments.map(d => ({ value: d, label: d }))} />
              <Input label="Designation" value={editForm.designation || ''} onChange={e => setEditForm(p => ({ ...p, designation: e.target.value }))} />
              <Select label="Location" value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} options={['Hyderabad','Bangalore','Pune','Noida','Chennai','Mumbai','Remote'].map(l => ({ value: l, label: l }))} />
              <Input label="Phone" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              <Select label="Status" value={editForm.status || ''} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} options={['Active','On Leave','Notice Period','Suspended'].map(s => ({ value: s, label: s }))} />
              <Select label="Employment Type" value={editForm.employmentType || ''} onChange={e => setEditForm(p => ({ ...p, employmentType: e.target.value }))} options={[{ value: 'Full Time', label: 'Full Time' }, { value: 'Contract', label: 'Contract' }, { value: 'Intern', label: 'Intern' }]} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setShowEdit(null)}>Cancel</Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </div>
          </>
        )}
      </Modal>

      {/* View Employee Profile Modal */}
      <Modal open={!!selectedEmp && !showEdit} onClose={() => setSelectedEmp(null)} title="Employee Profile" size="xl">
        {selectedEmp && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-surface-3 rounded-xl">
              <Avatar name={selectedEmp.name} size="xl" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text">{selectedEmp.name}</h3>
                <p className="text-sm text-primary">{selectedEmp.designation}</p>
                <p className="text-xs text-text-secondary mt-1">{selectedEmp.empId} &middot; {selectedEmp.department} &middot; {selectedEmp.location}</p>
                <div className="flex gap-2 mt-2">
                  <Badge dot>{selectedEmp.status}</Badge>
                  <Badge variant="default">{selectedEmp.employmentType}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={Edit3} onClick={() => { setEditForm({ ...selectedEmp }); setShowEdit(selectedEmp); setSelectedEmp(null); }}>Edit</Button>
                <Button size="sm" variant="secondary" icon={FileText} onClick={() => handleGenerateLetter(selectedEmp, 'Offer Letter')}>Generate Letter</Button>
              </div>
            </div>
            <Tabs tabs={[
              { id: 'personal', label: 'Personal', content: (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {[['Email', selectedEmp.email], ['Phone', selectedEmp.phone], ['Date of Birth', selectedEmp.dob], ['Gender', selectedEmp.gender], ['Blood Group', selectedEmp.bloodGroup], ['Marital Status', selectedEmp.maritalStatus], ['Address', selectedEmp.address], ['PAN', selectedEmp.pan], ['Aadhar', selectedEmp.aadhar]].map(([k, v]) => (
                    <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium mt-0.5">{v || '-'}</p></div>
                  ))}
                  {selectedEmp.emergencyContact && (
                    <div className="col-span-3 p-3 bg-surface-3 rounded-lg">
                      <p className="text-xs text-text-secondary font-semibold mb-2">Emergency Contact</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div><p className="text-xs text-text-secondary">Name</p><p className="text-text text-sm">{selectedEmp.emergencyContact.name}</p></div>
                        <div><p className="text-xs text-text-secondary">Phone</p><p className="text-text text-sm">{selectedEmp.emergencyContact.phone}</p></div>
                        <div><p className="text-xs text-text-secondary">Relation</p><p className="text-text text-sm">{selectedEmp.emergencyContact.relation}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              )},
              { id: 'employment', label: 'Employment', content: (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {[['Department', selectedEmp.department], ['Designation', selectedEmp.designation], ['Manager', selectedEmp.manager], ['Join Date', selectedEmp.joinDate], ['Experience', `${selectedEmp.experience || 0} years`], ['Employment Type', selectedEmp.employmentType], ['Notice Period', selectedEmp.noticePeriod], ['CTC', `₹${(selectedEmp.ctc / 100000).toFixed(1)}L`], ['Location', selectedEmp.location]].map(([k, v]) => (
                    <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium mt-0.5">{v || '-'}</p></div>
                  ))}
                  <div className="col-span-3">
                    <p className="text-xs text-text-secondary mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">{selectedEmp.skills?.map(s => <span key={s} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{s}</span>)}</div>
                  </div>
                </div>
              )},
              { id: 'bank', label: 'Bank & Tax', content: (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[['Bank Name', selectedEmp.bankName], ['Account No', selectedEmp.bankAccount], ['IFSC Code', selectedEmp.ifsc], ['PAN', selectedEmp.pan]].map(([k, v]) => (
                    <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium mt-0.5">{v || '-'}</p></div>
                  ))}
                </div>
              )},
              { id: 'education', label: 'Education', content: (
                <div className="space-y-3">
                  {selectedEmp.education?.map((edu, i) => (
                    <div key={i} className="p-3 bg-surface-3 rounded-lg">
                      <p className="text-sm font-medium text-text">{edu.degree}</p>
                      <p className="text-xs text-text-secondary">{edu.institution} &middot; {edu.year}</p>
                    </div>
                  ))}
                </div>
              )},
              { id: 'documents', label: 'Documents', content: (
                <div className="space-y-2">
                  {['Offer Letter','Appointment Letter','NDA','ID Proof','Address Proof'].map(d => (
                    <div key={d} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                      <div className="flex items-center gap-2"><FileText size={14} className="text-primary" /><span className="text-sm text-text">{d}</span></div>
                      <Button size="sm" variant="ghost" onClick={() => toast.info(`${d} downloaded`)}>Download</Button>
                    </div>
                  ))}
                </div>
              )},
            ]} />
          </div>
        )}
      </Modal>
    </div>
  );
}
