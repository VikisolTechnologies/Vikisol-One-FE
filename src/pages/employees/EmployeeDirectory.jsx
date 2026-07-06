import { useState, useMemo } from 'react';
import { UserPlus, Download, Upload, Eye, Edit3, Trash2, MoreVertical, UserCheck, UserX, Key, RefreshCw, FileText, Briefcase, Monitor, TrendingUp, LogOut, CheckCircle2, XCircle, Clock, UserPlus as UserPlusIcon, Shield, LogIn, ClipboardList, ScrollText, ArrowRightLeft } from 'lucide-react';
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
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { getEmployee, changeAccountRole, updateOnboardingChecklist, resetPassword, generateOfferLetter, generateExperienceLetter, generateRelievingLetter, getEmployeeTimeline, initiateTransfer, getTransferHistory, getAccountStatus } from '../../api/employees';
import { getEmployeeDocuments } from '../../api/documents';
import { getProfileCompletion } from '../../api/onboarding';
import { getBackgroundChecks } from '../../api/bgv';
import { DOCUMENT_TYPES, generateDocument } from '../../api/documentEngine';
import SensitiveValue from '../../components/ui/SensitiveValue';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { downloadFile } from '../../api/client';

const APP_ROLES = ['CEO', 'ADMIN', 'HR_MANAGER', 'MANAGER', 'RECRUITER', 'FINANCE', 'EMPLOYEE'];
const SECTION_TO_TAB = {
  personal: 'personal', education: 'education', employment: 'employment', skills: 'employment',
  documents: 'documents', bank: 'bank', tax: 'bank', nominee: 'bank',
};
const ONBOARDING_STEPS = [
  { key: 'documentsVerified', label: 'Documents Verified' },
  { key: 'assetsAssigned', label: 'IT Assets Assigned' },
  { key: 'bankDetailsCollected', label: 'Bank Details Collected' },
  { key: 'inductionCompleted', label: 'Induction Completed' },
];
const TIMELINE_ICONS = {
  RECRUITMENT: UserPlusIcon,
  BGV: Shield,
  ONBOARDING: LogIn,
  OFFBOARDING: ClipboardList,
  AUDIT: ScrollText,
};
const TRANSFER_TYPES = [
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'REPORTING_MANAGER', label: 'Reporting Manager' },
  { value: 'LOCATION', label: 'Location' },
  { value: 'COST_CENTER', label: 'Cost Center' },
  { value: 'BUSINESS_UNIT', label: 'Business Unit' },
];

export default function EmployeeDirectory() {
  const { data, employees, stats, lookups, employeesLoading, employeesSource } = useData();
  const { user } = useAuth();
  const isCEO = user?.role === 'ceo';
  const canManageOnboarding = ['ceo', 'hr_manager', 'admin'].includes(user?.role);
  // Hikes/resignations are compensation & exit decisions - HR's call, not a Manager's. Matches
  // the backend's @PreAuthorize on /employees/{id}/hike and /employees/{id}/resign.
  const canManageCompensation = ['ceo', 'hr_manager', 'admin'].includes(user?.role);
  // Linked Accounts panel: visible to CEO/HR Manager/Admin for anyone, or to the employee
  // viewing their own profile - same shape of gating as the other privileged tabs in this file.
  const canViewLinkedAccounts = (emp) => ['ceo', 'hr_manager', 'admin'].includes(user?.role) || (user?.id && emp && user.id === emp.id);
  const toast = useToast();
  const confirm = useConfirm();
  const [roleChangeBusy, setRoleChangeBusy] = useState(false);
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const deptOptions = employeesSource === 'live' && lookups.departments.length
    ? lookups.departments.map(d => ({ value: d.id, label: d.name }))
    : data.departments.map(d => ({ value: d, label: d }));
  const desigOptions = employeesSource === 'live' && lookups.designations.length
    ? lookups.designations.map(d => ({ value: d.id, label: d.title }))
    : null;

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empDocuments, setEmpDocuments] = useState(null); // null = not loaded for this employee yet
  const [profileCompletion, setProfileCompletion] = useState(null);
  const [profileTab, setProfileTab] = useState('personal');
  const [bgvChecks, setBgvChecks] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [addForm, setAddForm] = useState({ name: '', email: '', personalEmail: '', personalMobile: '', department: 'Development', designation: '', location: 'Hyderabad', phone: '', employmentType: 'Full Time' });
  const [editForm, setEditForm] = useState({});
  const [hikeEmp, setHikeEmp] = useState(null);
  const [hikeForm, setHikeForm] = useState({ newAnnualCtc: '', effectiveDate: '', reason: '' });
  const [hikeSubmitting, setHikeSubmitting] = useState(false);
  const [resignEmp, setResignEmp] = useState(null);
  const [resignForm, setResignForm] = useState({ lastWorkingDate: '', reason: '' });
  const [resignSubmitting, setResignSubmitting] = useState(false);
  const [transferEmp, setTransferEmp] = useState(null);
  const [transferForm, setTransferForm] = useState({ transferType: 'DEPARTMENT', newValue: '', effectiveDate: '', reason: '' });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferHistory, setTransferHistory] = useState(null);
  const [accountStatus, setAccountStatus] = useState(null); // null = not loaded, 'error' = failed/not permitted

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

  const handleCreate = async () => {
    if (!addForm.name || !addForm.email) { toast.error('Name and email are required'); return; }
    const empId = `VKS${String(allEmps.length + 100).padStart(3, '0')}`;
    try {
      await employees.create({ ...addForm, empId, id: Date.now(), status: 'Active', joinDate: new Date().toISOString().split('T')[0], ctc: 600000, skills: [], manager: 'Rohit Sharma' });
      toast.success(`Employee ${addForm.name} created successfully`);
      setShowAdd(false);
      setAddForm({ name: '', email: '', personalEmail: '', personalMobile: '', department: 'Development', designation: '', location: 'Hyderabad', phone: '', employmentType: 'Full Time' });
    } catch (err) {
      toast.error(err.message || 'Failed to create employee');
    }
  };

  const handleEdit = async () => {
    try {
      await employees.update(showEdit.id, editForm);
      toast.success(`Employee ${editForm.name || showEdit.name} updated successfully`);
      setShowEdit(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update employee');
    }
  };

  const handleDelete = async (emp) => {
    const ok = await confirm({ title: 'Delete Employee?', message: `Are you sure you want to delete ${emp.name}? This action cannot be undone.`, type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await employees.remove(emp.id);
      toast.success(`${emp.name} deleted successfully`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete employee');
    } finally {
      setContextMenu(null);
    }
  };

  const handleSuspend = async (emp) => {
    const ok = await confirm({ title: 'Suspend Employee?', message: `Suspend ${emp.name}? They will lose access to all systems.`, type: 'warning', confirmText: 'Suspend' });
    if (!ok) return;
    try {
      await employees.update(emp.id, { status: 'Suspended' });
      toast.warning(`${emp.name} has been suspended`);
    } catch (err) {
      toast.error(err.message || 'Failed to suspend employee');
    } finally {
      setContextMenu(null);
    }
  };

  const openView = async (row) => {
    setSelectedEmp(row);
    setEmpDocuments(null);
    setProfileCompletion(null);
    setBgvChecks(null);
    setTimeline(null);
    setTransferHistory(null);
    setAccountStatus(null);
    setProfileTab('personal');
    if (employeesSource === 'live') {
      try {
        const full = await getEmployee(row.id);
        setSelectedEmp(full);
      } catch {
        // keep the lightweight row data if the detail fetch fails
      }
      getEmployeeDocuments(row.id).then(setEmpDocuments).catch(() => setEmpDocuments([]));
      getProfileCompletion(row.id).then(setProfileCompletion).catch(() => setProfileCompletion(null));
      getBackgroundChecks(row.id).then(setBgvChecks).catch(() => setBgvChecks([]));
      getEmployeeTimeline(row.id).then(setTimeline).catch(() => setTimeline([]));
      getTransferHistory(row.id).then(setTransferHistory).catch(() => setTransferHistory([]));
      getAccountStatus(row.id).then(setAccountStatus).catch(() => setAccountStatus('error'));
    }
  };

  const openEdit = async (row) => {
    setEditForm({ ...row });
    setShowEdit(row);
    if (employeesSource === 'live') {
      try {
        const full = await getEmployee(row.id);
        setEditForm(full);
      } catch {
        // keep the lightweight row data if the detail fetch fails
      }
    }
  };

  const handleActivate = async (emp) => {
    try {
      await employees.update(emp.id, { status: 'Active' });
      toast.success(`${emp.name} has been activated`);
    } catch (err) {
      toast.error(err.message || 'Failed to activate employee');
    } finally {
      setContextMenu(null);
    }
  };
  const handleResetPassword = async (emp) => {
    setContextMenu(null);
    if (employeesSource !== 'live') { toast.error('Connect to the live backend to reset passwords'); return; }
    try {
      await resetPassword(emp.id);
      toast.success(`New temporary password emailed to ${emp.email}`);
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    }
  };

  const handleChangeAccountRole = async (emp, role) => {
    if (employeesSource !== 'live') { toast.error('Connect to the live backend to change account roles'); return; }
    setRoleChangeBusy(true);
    try {
      const updated = await changeAccountRole(emp.id, role);
      setSelectedEmp(updated);
      toast.success(`${emp.name}'s account role changed to ${role.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err.message || 'Failed to change account role');
    } finally {
      setRoleChangeBusy(false);
    }
  };

  const handleToggleOnboardingStep = async (emp, key, current) => {
    if (employeesSource !== 'live') { toast.error('Connect to the live backend to update onboarding'); return; }
    setOnboardingBusy(true);
    try {
      const updated = await updateOnboardingChecklist(emp.id, { [key]: !current });
      setSelectedEmp(updated);
    } catch (err) {
      toast.error(err.message || 'Failed to update onboarding checklist');
    } finally {
      setOnboardingBusy(false);
    }
  };

  const LETTER_GENERATORS = {
    'Offer Letter': generateOfferLetter,
    'Experience Letter': generateExperienceLetter,
    'Relieving Letter': generateRelievingLetter,
  };

  const handleGenerateLetter = async (emp, type) => {
    setContextMenu(null);
    const generator = LETTER_GENERATORS[type];
    if (!generator) { toast.info(`${type} generation is not available yet`); return; }
    if (employeesSource !== 'live') { toast.error(`Connect to the live backend to generate ${type.toLowerCase()}s`); return; }
    try {
      const fileUrl = await generator(emp.id);
      toast.success(`${type} generated`);
      await downloadFile(fileUrl);
    } catch (err) {
      toast.error(err.message || `Failed to generate ${type.toLowerCase()}`);
    }
  };

  // Generic document generation - covers every document type Document Studio supports (not just
  // the 3 with dedicated buttons above), via the backend's generic /documents/generate endpoint.
  const [genDocEmp, setGenDocEmp] = useState(null);
  const [genDocType, setGenDocType] = useState('OFFER_LETTER');
  const [genDocFields, setGenDocFields] = useState({});
  const [genDocBusy, setGenDocBusy] = useState(false);

  const openGenerateDocModal = (emp) => {
    setContextMenu(null);
    setGenDocEmp(emp);
    setGenDocType('OFFER_LETTER');
    setGenDocFields({});
  };

  const genDocTypeConfig = DOCUMENT_TYPES.find(t => t.value === genDocType);

  const handleGenerateDocument = async () => {
    if (employeesSource !== 'live') { toast.error('Connect to the live backend to generate documents'); return; }
    setGenDocBusy(true);
    try {
      const fileUrl = await generateDocument({ documentType: genDocType, employeeId: genDocEmp.id, fields: genDocFields });
      toast.success(`${genDocTypeConfig?.label || genDocType} generated`);
      await downloadFile(fileUrl);
      setGenDocEmp(null);
    } catch (err) {
      toast.error(err.message || 'Failed to generate document');
    } finally {
      setGenDocBusy(false);
    }
  };

  const openHikeModal = (emp) => {
    setHikeForm({ newAnnualCtc: emp.ctc || '', effectiveDate: '', reason: '' });
    setHikeEmp(emp);
    setContextMenu(null);
  };

  const handleIssueHike = async () => {
    if (employeesSource !== 'live') { toast.error('Connect to the live backend to issue hikes and send hike letters'); return; }
    if (!hikeForm.newAnnualCtc || !hikeForm.effectiveDate) { toast.error('New CTC and effective date are required'); return; }
    setHikeSubmitting(true);
    try {
      await employees.issueHike(hikeEmp.id, hikeForm);
      toast.success(`Hike issued for ${hikeEmp.name} — letter emailed`);
      setHikeEmp(null);
    } catch (err) {
      toast.error(err.message || 'Failed to issue hike');
    } finally {
      setHikeSubmitting(false);
    }
  };

  const openResignModal = (emp) => {
    setResignForm({ lastWorkingDate: '', reason: '' });
    setResignEmp(emp);
    setContextMenu(null);
  };

  const handleRecordResignation = async () => {
    if (employeesSource !== 'live') { toast.error('Connect to the live backend to record resignations'); return; }
    if (!resignForm.lastWorkingDate) { toast.error('Last working date is required'); return; }
    setResignSubmitting(true);
    try {
      await employees.resign(resignEmp.id, resignForm);
      toast.success(`Resignation recorded for ${resignEmp.name} — acknowledgement emailed`);
      setResignEmp(null);
    } catch (err) {
      toast.error(err.message || 'Failed to record resignation');
    } finally {
      setResignSubmitting(false);
    }
  };

  const openTransferModal = (emp) => {
    setTransferForm({ transferType: 'DEPARTMENT', newValue: '', effectiveDate: new Date().toISOString().split('T')[0], reason: '' });
    setTransferEmp(emp);
    setContextMenu(null);
  };

  const handleInitiateTransfer = async () => {
    if (employeesSource !== 'live') { toast.error('Connect to the live backend to record transfers'); return; }
    if (!transferForm.newValue || !transferForm.effectiveDate) { toast.error('New value and effective date are required'); return; }
    setTransferSubmitting(true);
    try {
      await initiateTransfer(transferEmp.id, transferForm);
      toast.success(`Transfer recorded for ${transferEmp.name}`);
      setTransferEmp(null);
      // Department/manager/location changes affect the employee record itself - refresh both the
      // row in the directory and, if their profile happens to be open, the profile + history too.
      const updated = await getEmployee(transferEmp.id);
      if (selectedEmp?.id === transferEmp.id) {
        setSelectedEmp(updated);
        getTransferHistory(transferEmp.id).then(setTransferHistory).catch(() => {});
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record transfer');
    } finally {
      setTransferSubmitting(false);
    }
  };

  const currentTransferValue = (emp, type) => {
    if (!emp) return '';
    switch (type) {
      case 'DEPARTMENT': return emp.department || '-';
      case 'REPORTING_MANAGER': return emp.manager || '-';
      case 'LOCATION': return emp.location || '-';
      case 'COST_CENTER': return emp.costCenter || '-';
      case 'BUSINESS_UNIT': return emp.businessUnit || '-';
      default: return '-';
    }
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
        <button onClick={(e) => { e.stopPropagation(); openView(row); }} aria-label={`View ${row.name}`} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text"><Eye size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} aria-label={`Edit ${row.name}`} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text"><Edit3 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setContextMenu(contextMenu?.id === row.id ? null : row); }} aria-label={`More actions for ${row.name}`} aria-haspopup="true" aria-expanded={contextMenu?.id === row.id} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text"><MoreVertical size={14} /></button>
        {contextMenu?.id === row.id && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-surface-2 border border-border rounded-xl shadow-2xl py-1 z-50" onClick={(e) => e.stopPropagation()} onMouseLeave={() => setContextMenu(null)}>
            {row.status === 'Active' ? (
              <button onClick={() => handleSuspend(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><UserX size={14} /> Suspend</button>
            ) : (
              <button onClick={() => handleActivate(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><UserCheck size={14} /> Activate</button>
            )}
            <button onClick={() => handleResetPassword(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><Key size={14} /> Reset Password</button>
            <button onClick={() => openGenerateDocModal(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><FileText size={14} /> Generate Document...</button>
            {canManageCompensation && <hr className="border-border my-1" />}
            {canManageCompensation && <button onClick={() => openHikeModal(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><TrendingUp size={14} /> Issue Hike</button>}
            {canManageCompensation && <button onClick={() => openTransferModal(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-3 hover:text-text"><ArrowRightLeft size={14} /> Transfer Employee</button>}
            {canManageCompensation && <button onClick={() => openResignModal(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warning hover:bg-warning/10"><LogOut size={14} /> Record Resignation</button>}
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
          <p className="text-sm text-text-secondary">
            {employeesLoading ? 'Loading from server...' : `${allEmps.length} employees · ${stats.active} active`}
            {!employeesLoading && employeesSource === 'mock' && <span className="ml-2 text-warning">(demo data)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Upload} size="sm" onClick={() => toast.info('Bulk import is not available yet')}>Import</Button>
          <Button variant="secondary" icon={Download} size="sm" onClick={() => toast.info('Export is not available yet')}>Export</Button>
          <Button icon={UserPlus} size="sm" onClick={() => setShowAdd(true)}>Add Employee</Button>
        </div>
      </div>

      {/* Generate Document Modal - covers every Document Studio document type generically */}
      <Modal open={!!genDocEmp} onClose={() => setGenDocEmp(null)} title={`Generate Document for ${genDocEmp?.name || ''}`} size="md">
        <div className="space-y-4">
          <Select label="Document Type" value={genDocType} onChange={e => { setGenDocType(e.target.value); setGenDocFields({}); }} options={DOCUMENT_TYPES} />
          {genDocTypeConfig?.fields.map(f => (
            <Input key={f.key} label={f.label} type={f.type || 'text'}
              value={genDocFields[f.key] || ''}
              onChange={e => setGenDocFields(prev => ({ ...prev, [f.key]: e.target.value }))} />
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setGenDocEmp(null)}>Cancel</Button>
            <Button icon={FileText} disabled={genDocBusy} onClick={handleGenerateDocument}>
              {genDocBusy ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Modal>

      <SearchFilter searchValue={search} onSearch={setSearch} filters={filterConfig} activeFilters={filters}
        onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
        onClearFilters={() => setFilters({})} placeholder="Search by name, ID, email, department..." />

      <Card padding={false}>
        {employeesLoading ? <TableSkeleton rows={8} cols={6} /> : <DataTable columns={columns} data={filtered} pageSize={12} onRowClick={openView} />}
      </Card>

      {/* Add Employee Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Employee" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name *" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter full name" />
          <Input label="Official Email *" type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="email@vikisol.in" />
          <Input label="Personal Email" type="email" value={addForm.personalEmail || ''} onChange={e => setAddForm(p => ({ ...p, personalEmail: e.target.value }))} placeholder="used only for the activation link" />
          <Input label="Personal Mobile" value={addForm.personalMobile || ''} onChange={e => setAddForm(p => ({ ...p, personalMobile: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
          {employeesSource === 'live' ? (
            <Select label="Department" value={addForm.departmentId || ''} onChange={e => setAddForm(p => ({ ...p, departmentId: e.target.value }))} options={deptOptions} />
          ) : (
            <Select label="Department" value={addForm.department} onChange={e => setAddForm(p => ({ ...p, department: e.target.value }))} options={deptOptions} />
          )}
          {desigOptions ? (
            <Select label="Designation" value={addForm.designationId || ''} onChange={e => setAddForm(p => ({ ...p, designationId: e.target.value }))} options={desigOptions} />
          ) : (
            <Input label="Designation" value={addForm.designation} onChange={e => setAddForm(p => ({ ...p, designation: e.target.value }))} placeholder="e.g. Senior Developer" />
          )}
          <Select label="Location" value={addForm.location} onChange={e => setAddForm(p => ({ ...p, location: e.target.value }))} options={['Hyderabad','Bangalore','Pune','Noida','Chennai','Mumbai','Remote'].map(l => ({ value: l, label: l }))} />
          <Input label="Official Phone" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
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
              <Input label="Official Email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              <Input label="Personal Email" type="email" value={editForm.personalEmail || ''} onChange={e => setEditForm(p => ({ ...p, personalEmail: e.target.value }))} />
              <Input label="Personal Mobile" value={editForm.personalMobile || ''} onChange={e => setEditForm(p => ({ ...p, personalMobile: e.target.value }))} />
              {employeesSource === 'live' ? (
                <Select label="Department" value={editForm.departmentId || ''} onChange={e => setEditForm(p => ({ ...p, departmentId: e.target.value }))} options={deptOptions} />
              ) : (
                <Select label="Department" value={editForm.department || ''} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} options={deptOptions} />
              )}
              {desigOptions ? (
                <Select label="Designation" value={editForm.designationId || ''} onChange={e => setEditForm(p => ({ ...p, designationId: e.target.value }))} options={desigOptions} />
              ) : (
                <Input label="Designation" value={editForm.designation || ''} onChange={e => setEditForm(p => ({ ...p, designation: e.target.value }))} />
              )}
              <Select label="Location" value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} options={['Hyderabad','Bangalore','Pune','Noida','Chennai','Mumbai','Remote'].map(l => ({ value: l, label: l }))} />
              <Input label="Official Phone" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
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
                  {/* Real bug fix: lifecycleStatus "ACTIVE" next to an already-shown "Active" status
                      badge read as a duplicate/glitched status pill. Only show the lifecycle badge
                      when it conveys something the plain status badge doesn't (e.g. PROBATION,
                      NOTICE_PERIOD, PRE_BOARDING) - and prefix it so it's clearly a different axis
                      (lifecycle stage) from the employment status badge next to it. */}
                  {selectedEmp.lifecycleStatus && selectedEmp.lifecycleStatus !== 'ACTIVE' && (
                    <Badge variant="info">Lifecycle: {selectedEmp.lifecycleStatus.replace(/_/g, ' ')}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={Edit3} onClick={() => { openEdit(selectedEmp); setSelectedEmp(null); }}>Edit</Button>
                <Button size="sm" variant="secondary" icon={FileText} onClick={() => handleGenerateLetter(selectedEmp, 'Offer Letter')}>Generate Letter</Button>
              </div>
            </div>
            {profileCompletion && (
              <div className="p-4 bg-surface-3 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Profile Completion</p>
                  <span className="text-sm font-bold text-primary">{profileCompletion.percent}%</span>
                </div>
                <ProgressBar value={profileCompletion.percent} max={100} color={profileCompletion.percent === 100 ? 'success' : 'warning'} />
                {profileCompletion.sections?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {profileCompletion.sections.map(s => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setProfileTab(SECTION_TO_TAB[s.key] || 'personal')}
                        className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg text-left ${s.done ? 'text-success hover:bg-success/10' : 'text-danger hover:bg-danger/10'}`}
                      >
                        {s.done ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Tabs active={profileTab} onChange={setProfileTab} tabs={[
              { id: 'personal', label: 'Personal', content: (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {[['Email', selectedEmp.email], ['Phone', selectedEmp.phone], ['Date of Birth', selectedEmp.dob], ['Gender', selectedEmp.gender], ['Blood Group', selectedEmp.bloodGroup], ['Marital Status', selectedEmp.maritalStatus], ['Address', selectedEmp.address], ['PAN', selectedEmp.pan, 'pan'], ['Aadhar', selectedEmp.aadhar, 'aadhaar']].map(([k, v, sensitiveType]) => (
                    <div key={k}>
                      <p className="text-xs text-text-secondary">{k}</p>
                      <p className="text-text font-medium mt-0.5">
                        {sensitiveType ? <SensitiveValue type={sensitiveType} value={v} id={`${k}-${selectedEmp.id}`} canReveal={canManageCompensation} /> : (v || '-')}
                      </p>
                    </div>
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
                  {[['Department', selectedEmp.department], ['Designation', selectedEmp.designation], ['Manager', selectedEmp.manager], ['Join Date', selectedEmp.joinDate], ['Experience', `${selectedEmp.experience || 0} years`], ['Employment Type', selectedEmp.employmentType], ['Notice Period', selectedEmp.noticePeriod], ['Location', selectedEmp.location]].map(([k, v]) => (
                    <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium mt-0.5">{v || '-'}</p></div>
                  ))}
                  <div><p className="text-xs text-text-secondary">CTC</p><p className="text-text font-medium mt-0.5"><SensitiveValue type="currency" value={selectedEmp.ctc} id={`ctc-${selectedEmp.id}`} canReveal={canManageCompensation} /></p></div>
                  <div className="col-span-3">
                    <p className="text-xs text-text-secondary mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">{selectedEmp.skills?.map(s => <span key={s} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{s}</span>)}</div>
                  </div>
                  {selectedEmp.onboarding && (
                    <div className="col-span-3 p-3 bg-surface-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-text-secondary font-semibold">Onboarding Checklist</p>
                        {ONBOARDING_STEPS.every(s => selectedEmp.onboarding[s.key]) && <Badge variant="success">Complete</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {ONBOARDING_STEPS.map(step => (
                          <label key={step.key} className={`flex items-center gap-2 text-sm ${canManageOnboarding && employeesSource === 'live' ? 'cursor-pointer' : 'cursor-default opacity-80'}`}>
                            <input type="checkbox" checked={!!selectedEmp.onboarding[step.key]} disabled={!canManageOnboarding || employeesSource !== 'live' || onboardingBusy}
                              onChange={() => handleToggleOnboardingStep(selectedEmp, step.key, selectedEmp.onboarding[step.key])}
                              className="w-4 h-4 accent-primary" />
                            <span className="text-text">{step.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {isCEO && employeesSource === 'live' && (
                    <div className="col-span-3 p-3 bg-surface-3 rounded-lg">
                      <p className="text-xs text-text-secondary font-semibold mb-2">Application Login Role</p>
                      <div className="flex items-center gap-2">
                        <Select value={selectedEmp.accountRole || 'EMPLOYEE'} disabled={roleChangeBusy}
                          onChange={e => handleChangeAccountRole(selectedEmp, e.target.value)}
                          options={APP_ROLES.map(r => ({ value: r, label: r.replace('_', ' ') }))} className="w-56" />
                        {!selectedEmp.accountRole && <span className="text-xs text-warning">No login account yet</span>}
                      </div>
                    </div>
                  )}
                  {employeesSource === 'live' && (
                    <div className="col-span-3 p-3 bg-surface-3 rounded-lg">
                      <p className="text-xs text-text-secondary font-semibold mb-2">Transfer History</p>
                      {transferHistory === null && <p className="text-xs text-text-secondary">Loading...</p>}
                      {transferHistory?.length === 0 && <p className="text-xs text-text-secondary">No transfers recorded yet.</p>}
                      {transferHistory && transferHistory.length > 0 && (
                        <div className="space-y-2">
                          {transferHistory.map(t => (
                            <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-surface-2 rounded-lg text-sm">
                              <div>
                                <span className="text-text font-medium">{TRANSFER_TYPES.find(tt => tt.value === t.transferType)?.label || t.transferType}</span>
                                <span className="text-text-secondary">: {t.previousValue || '-'} &rarr; {t.newValue}</span>
                                {t.reason && <p className="text-xs text-text-secondary mt-0.5">"{t.reason}"</p>}
                              </div>
                              <div className="text-right text-xs text-text-secondary shrink-0 ml-3">
                                <p>{t.effectiveDate}</p>
                                {t.initiatedByName && <p>by {t.initiatedByName}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )},
              { id: 'bank', label: 'Bank & Tax', content: (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[['Bank Name', selectedEmp.bankName], ['Account No', selectedEmp.bankAccount, 'account'], ['IFSC Code', selectedEmp.ifsc], ['PAN', selectedEmp.pan, 'pan']].map(([k, v, sensitiveType]) => (
                    <div key={k}>
                      <p className="text-xs text-text-secondary">{k}</p>
                      <p className="text-text font-medium mt-0.5">
                        {sensitiveType ? <SensitiveValue type={sensitiveType} value={v} id={`bank-tab-${k}-${selectedEmp.id}`} canReveal={canManageCompensation} /> : (v || '-')}
                      </p>
                    </div>
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
              { id: 'onboarding-bgv', label: 'Onboarding & BGV', content: (
                <div className="space-y-4">
                  {employeesSource !== 'live' && <p className="text-xs text-warning">(demo data - live backend required)</p>}
                  {employeesSource === 'live' && (
                    <>
                      <div>
                        <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider mb-2">Background Verification</p>
                        {bgvChecks === null && <p className="text-xs text-text-secondary">Loading...</p>}
                        {bgvChecks && (
                          <div className="grid grid-cols-2 gap-2">
                            {bgvChecks.map(c => (
                              <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-surface-3 rounded-lg text-sm">
                                <span className="text-text">{c.checkType.replace(/_/g, ' ')}</span>
                                <Badge variant={{ PENDING: 'default', SUBMITTED: 'info', IN_REVIEW: 'warning', APPROVED: 'success', REJECTED: 'danger' }[c.status]} dot>{c.status.replace(/_/g, ' ')}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )},
              { id: 'documents', label: 'Documents', content: (
                <div className="space-y-2">
                  {employeesSource !== 'live' && <p className="text-xs text-warning mb-1">(demo data)</p>}
                  {employeesSource === 'live' && empDocuments === null && <p className="text-xs text-text-secondary">Loading...</p>}
                  {employeesSource === 'live' && empDocuments?.length === 0 && <p className="text-xs text-text-secondary">No documents uploaded for this employee yet.</p>}
                  {(employeesSource === 'live' ? (empDocuments || []) : ['Offer Letter', 'Appointment Letter', 'NDA', 'ID Proof', 'Address Proof'].map(name => ({ id: name, name, fileUrl: null }))).map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                      <div className="flex items-center gap-2"><FileText size={14} className="text-primary" /><span className="text-sm text-text">{d.name}</span></div>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!d.fileUrl) { toast.error('No file stored for this document'); return; }
                        try {
                          await downloadFile(d.fileUrl, d.name);
                        } catch (err) {
                          toast.error(err.message || 'Failed to download document');
                        }
                      }}>Download</Button>
                    </div>
                  ))}
                </div>
              )},
              { id: 'timeline', label: 'Timeline', content: (
                <div className="space-y-3">
                  {employeesSource !== 'live' && <p className="text-xs text-warning">(demo data - live backend required)</p>}
                  {employeesSource === 'live' && timeline === null && <p className="text-xs text-text-secondary">Loading...</p>}
                  {employeesSource === 'live' && timeline?.length === 0 && <p className="text-xs text-text-secondary">No timeline events recorded yet.</p>}
                  {employeesSource === 'live' && timeline && timeline.length > 0 && (
                    <div className="relative pl-6">
                      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                      {timeline.map((t, i) => {
                        const Icon = TIMELINE_ICONS[t.category] || Clock;
                        return (
                          <div key={i} className="relative pb-4 last:pb-0">
                            <div className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full bg-surface-3 border-2 border-primary flex items-center justify-center" />
                            <div className="flex items-start gap-2">
                              <Icon size={14} className="text-primary mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-text">{t.title}</p>
                                  <Badge variant="default">{t.category}</Badge>
                                </div>
                                {t.description && <p className="text-xs text-text-secondary mt-0.5">{t.description}</p>}
                                <p className="text-[11px] text-text-secondary/70 mt-0.5">{t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )},
              ...(canViewLinkedAccounts(selectedEmp) ? [{ id: 'linked-accounts', label: 'Linked Accounts', content: (
                <div className="space-y-4">
                  {employeesSource !== 'live' && <p className="text-xs text-warning">(demo data - live backend required)</p>}
                  {employeesSource === 'live' && accountStatus === null && <p className="text-xs text-text-secondary">Loading...</p>}
                  {employeesSource === 'live' && accountStatus === 'error' && <p className="text-xs text-danger">Could not load account status (you may not have permission, or this employee has no login account yet).</p>}
                  {employeesSource === 'live' && accountStatus && accountStatus !== 'error' && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-xs text-text-secondary">Official Company Email</p><p className="text-text font-medium mt-0.5">{accountStatus.officialEmail || '-'}</p></div>
                      <div><p className="text-xs text-text-secondary">Personal Recovery Email</p><p className="text-text font-medium mt-0.5">{accountStatus.personalEmail || '-'}</p></div>
                      <div>
                        <p className="text-xs text-text-secondary">Account Status</p>
                        <div className="mt-0.5">
                          <Badge variant={{ ACTIVE: 'success', LOCKED: 'danger', PENDING_ACTIVATION: 'warning', DISABLED: 'default', NO_ACCOUNT: 'default' }[accountStatus.accountStatus] || 'default'} dot>
                            {(accountStatus.accountStatus || 'NO_ACCOUNT').replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div><p className="text-xs text-text-secondary">Failed Login Count</p><p className="text-text font-medium mt-0.5">{accountStatus.failedLoginCount ?? 0}</p></div>
                      <div><p className="text-xs text-text-secondary">Last Login</p><p className="text-text font-medium mt-0.5">{accountStatus.lastLoginAt ? new Date(accountStatus.lastLoginAt).toLocaleString() : 'Never'}</p></div>
                      <div><p className="text-xs text-text-secondary">Last Password Change</p><p className="text-text font-medium mt-0.5">{accountStatus.passwordChangedAt ? new Date(accountStatus.passwordChangedAt).toLocaleString() : '-'}</p></div>
                      {accountStatus.accountStatus === 'LOCKED' && accountStatus.lockedUntil && (
                        <div><p className="text-xs text-text-secondary">Locked Until</p><p className="text-text font-medium mt-0.5">{new Date(accountStatus.lockedUntil).toLocaleString()}</p></div>
                      )}
                      <div className="col-span-2 p-3 bg-surface-3 rounded-lg">
                        <p className="text-xs text-text-secondary font-semibold mb-1">Microsoft Account</p>
                        {accountStatus.microsoftLoginAvailable ? (
                          <p className="text-sm text-text">{accountStatus.microsoftLinked ? 'Linked' : 'Not linked'}{accountStatus.lastMicrosoftAuthAt ? ` · last used ${new Date(accountStatus.lastMicrosoftAuthAt).toLocaleString()}` : ''}</p>
                        ) : (
                          <p className="text-sm text-text-secondary">Not configured for this tenant yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}] : []),
            ]} />
          </div>
        )}
      </Modal>

      {/* Issue Hike Modal */}
      <Modal open={!!hikeEmp} onClose={() => setHikeEmp(null)} title="Issue Hike">
        {hikeEmp && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-xl">
              <Avatar name={hikeEmp.name} size="md" />
              <div><p className="font-medium text-text">{hikeEmp.name}</p><p className="text-xs text-text-secondary">Current CTC: <SensitiveValue type="currency" value={hikeEmp.ctc} id={`hike-current-ctc-${hikeEmp.id}`} canReveal={canManageCompensation} /></p></div>
            </div>
            <Input label="New Annual CTC (₹) *" type="number" value={hikeForm.newAnnualCtc} onChange={e => setHikeForm(p => ({ ...p, newAnnualCtc: e.target.value }))} placeholder="e.g. 1500000" />
            <Input label="Effective Date *" type="date" value={hikeForm.effectiveDate} onChange={e => setHikeForm(p => ({ ...p, effectiveDate: e.target.value }))} />
            <Textarea label="Reason / Notes" value={hikeForm.reason} onChange={e => setHikeForm(p => ({ ...p, reason: e.target.value }))} placeholder="Annual appraisal, promotion, retention, etc." />
            <p className="text-xs text-text-secondary">The new CTC will be split using the CEO's standard breakup, and a hike letter will be emailed to {hikeEmp.email}.</p>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setHikeEmp(null)}>Cancel</Button><Button onClick={handleIssueHike} disabled={hikeSubmitting}>{hikeSubmitting ? 'Sending...' : 'Issue Hike & Send Letter'}</Button></div>
          </div>
        )}
      </Modal>

      {/* Record Resignation Modal */}
      <Modal open={!!resignEmp} onClose={() => setResignEmp(null)} title="Record Resignation">
        {resignEmp && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-xl">
              <Avatar name={resignEmp.name} size="md" />
              <div><p className="font-medium text-text">{resignEmp.name}</p><p className="text-xs text-text-secondary">{resignEmp.designation}</p></div>
            </div>
            <Input label="Last Working Date *" type="date" value={resignForm.lastWorkingDate} onChange={e => setResignForm(p => ({ ...p, lastWorkingDate: e.target.value }))} />
            <Textarea label="Reason / Notes" value={resignForm.reason} onChange={e => setResignForm(p => ({ ...p, reason: e.target.value }))} placeholder="Optional context for HR records" />
            <p className="text-xs text-text-secondary">This marks {resignEmp.name} as on notice and emails a resignation acknowledgement to {resignEmp.email}.</p>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setResignEmp(null)}>Cancel</Button><Button onClick={handleRecordResignation} disabled={resignSubmitting}>{resignSubmitting ? 'Sending...' : 'Record Resignation'}</Button></div>
          </div>
        )}
      </Modal>

      {/* Transfer Employee Modal */}
      <Modal open={!!transferEmp} onClose={() => setTransferEmp(null)} title="Transfer Employee">
        {transferEmp && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-xl">
              <Avatar name={transferEmp.name} size="md" />
              <div><p className="font-medium text-text">{transferEmp.name}</p><p className="text-xs text-text-secondary">{transferEmp.designation}</p></div>
            </div>
            <Select label="Transfer Type" value={transferForm.transferType}
              onChange={e => setTransferForm(p => ({ ...p, transferType: e.target.value, newValue: '' }))}
              options={TRANSFER_TYPES} />
            <div>
              <p className="text-xs text-text-secondary mb-1">Current Value</p>
              <p className="text-sm text-text font-medium">{currentTransferValue(transferEmp, transferForm.transferType)}</p>
            </div>
            {transferForm.transferType === 'DEPARTMENT' && (
              <Select label="New Department *" value={transferForm.newValue} onChange={e => setTransferForm(p => ({ ...p, newValue: e.target.value }))} options={deptOptions} />
            )}
            {transferForm.transferType === 'REPORTING_MANAGER' && (
              <Select label="New Reporting Manager *" value={transferForm.newValue}
                onChange={e => setTransferForm(p => ({ ...p, newValue: e.target.value }))}
                options={allEmps.filter(e => e.id !== transferEmp.id).map(e => ({ value: e.id, label: e.name }))} />
            )}
            {['LOCATION', 'COST_CENTER', 'BUSINESS_UNIT'].includes(transferForm.transferType) && (
              <Input label="New Value *" value={transferForm.newValue} onChange={e => setTransferForm(p => ({ ...p, newValue: e.target.value }))}
                placeholder={transferForm.transferType === 'LOCATION' ? 'e.g. Bangalore' : 'e.g. CC-104'} />
            )}
            <Input label="Effective Date *" type="date" value={transferForm.effectiveDate} onChange={e => setTransferForm(p => ({ ...p, effectiveDate: e.target.value }))} />
            <Textarea label="Reason / Notes" value={transferForm.reason} onChange={e => setTransferForm(p => ({ ...p, reason: e.target.value }))} placeholder="Optional context for HR records" />
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setTransferEmp(null)}>Cancel</Button><Button onClick={handleInitiateTransfer} disabled={transferSubmitting}>{transferSubmitting ? 'Saving...' : 'Record Transfer'}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
