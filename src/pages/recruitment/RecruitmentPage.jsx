import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Filter, Eye, Edit3, Trash2, Mail, Calendar, MoreVertical, UserCheck, XCircle, FileText, Send, PencilLine, Inbox } from 'lucide-react';
import { previewCtcBreakup } from '../../api/payroll';
import { getManagerOptions } from '../../api/employees';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import ProgressBar from '../../components/ui/ProgressBar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchFilter from '../../components/ui/SearchFilter';
import Tabs from '../../components/ui/Tabs';
import StatCard from '../../components/ui/StatCard';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import SensitiveValue from '../../components/ui/SensitiveValue';
import { getRecruiterDashboard, getCandidate } from '../../api/recruitment';
import ScheduleInterviewModal from './ScheduleInterviewModal';
import InterviewFeedbackModal from './InterviewFeedbackModal';
import CandidateEditModal from './CandidateEditModal';
import CandidateInterviewsTab from './CandidateInterviewsTab';

function candidateEmailError(value) {
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Enter a valid email address';
}

// Strips anything that isn't a digit, space, or leading "+" as the user types - previously this
// field accepted arbitrary letters and special characters with no restriction at all.
function sanitizePhoneInput(value) {
  const leadingPlus = value.startsWith('+') ? '+' : '';
  return leadingPlus + value.slice(leadingPlus.length).replace(/[^\d\s]/g, '');
}

function candidatePhoneError(value) {
  if (!value) return null;
  const digitCount = (value.match(/\d/g) || []).length;
  return digitCount >= 10 && digitCount <= 13 ? null : 'Enter a valid phone number (10-13 digits)';
}

const stages = ['Applied', 'Screening', 'Technical', 'Manager', 'HR', 'Offered', 'Hired', 'Rejected'];
const STAGE_ACCENT = {
  Applied: 'bg-blue-500', Screening: 'bg-cyan-500', Technical: 'bg-purple-500',
  Manager: 'bg-orange-500', HR: 'bg-emerald-500', Offered: 'bg-amber-500',
  Hired: 'bg-emerald-600', Rejected: 'bg-red-500',
};

export default function RecruitmentPage() {
  const { data, candidates, candidatesSource, candidatesLoading, lookups, jobPostings } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isRecruiter = (user?.role || '').toLowerCase() === 'recruiter';

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [view, setView] = useState('kanban');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: '', experience: '', currentCTC: '', expectedCTC: '', source: 'LinkedIn', phone: '', jobPostingId: '' });
  const [offerCandidate, setOfferCandidate] = useState(null);
  const [offerForm, setOfferForm] = useState({ designationId: '', departmentId: '', offeredCtc: '', dateOfJoining: '', reportingManagerId: '' });
  const [offerBreakup, setOfferBreakup] = useState(null);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [managerOptions, setManagerOptions] = useState([]);
  const [scheduleModal, setScheduleModal] = useState(null); // { candidate, interview? }
  const [feedbackInterview, setFeedbackInterview] = useState(null);
  const [editModalCandidate, setEditModalCandidate] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getManagerOptions().then(setManagerOptions).catch(() => setManagerOptions([]));
  }, []);

  useEffect(() => {
    if (!isRecruiter || candidatesSource !== 'live') return;
    getRecruiterDashboard().then(setDashboardStats).catch(() => setDashboardStats(null));
  }, [isRecruiter, candidatesSource, refreshKey]);

  const refreshAfterInterviewChange = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!offerForm.offeredCtc || Number(offerForm.offeredCtc) <= 0) { setOfferBreakup(null); return; }
    const t = setTimeout(() => {
      previewCtcBreakup(Number(offerForm.offeredCtc)).then(setOfferBreakup).catch(() => setOfferBreakup(null));
    }, 300);
    return () => clearTimeout(t);
  }, [offerForm.offeredCtc]);

  const openOfferModal = (candidate) => {
    setOfferForm({
      designationId: candidate.offeredDesignationId || '',
      departmentId: candidate.offeredDepartmentId || '',
      offeredCtc: candidate.offeredCtc || candidate.expectedSalary || '',
      dateOfJoining: candidate.offeredDateOfJoining || '',
      reportingManagerId: candidate.offeredReportingManagerId || '',
    });
    setOfferBreakup(null);
    setOfferCandidate(candidate);
  };

  const handleProposeSelection = async () => {
    if (candidatesSource !== 'live') { toast.error('Connect to the live backend to submit offer proposals'); return; }
    if (!offerForm.designationId || !offerForm.departmentId || !offerForm.offeredCtc || !offerForm.dateOfJoining) {
      toast.error('Designation, department, CTC and date of joining are required');
      return;
    }
    setOfferSubmitting(true);
    try {
      await candidates.proposeSelection(offerCandidate.id, offerForm);
      toast.success(`${offerCandidate.name}'s offer proposal submitted for manager approval`);
      setOfferCandidate(null);
      setSelected(null);
    } catch (err) {
      toast.error(err.message || 'Failed to submit offer proposal');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const employeeName = (id) => id ? data.employees.find(e => e.id === id)?.name : null;

  const NEXT_ACTION_BY_STATUS = {
    NEW: 'Move to Screening', SCREENING: 'Move to Technical', SHORTLISTED: 'Schedule Interview',
    INTERVIEW_SCHEDULED: 'Complete Interview', INTERVIEWED: 'Submit for Approval',
    PENDING_APPROVAL: 'Awaiting HR Manager Approval', REVISION_REQUESTED: 'Recruiter to Resubmit',
    SELECTED: 'Awaiting Offer Acceptance', OFFER_MADE: 'Awaiting Offer Acceptance',
    OFFER_ACCEPTED: 'Awaiting Joining', JOINED: 'Closed - Joined', OFFER_DECLINED: 'Closed - Declined', REJECTED: 'Closed - Rejected',
  };
  const nextActionFor = (candidate) => NEXT_ACTION_BY_STATUS[candidate.status] || '-';

  const daysSinceNum = (dateStr) => dateStr ? Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)) : 0;
  const daysSince = (dateStr) => {
    if (!dateStr) return '-';
    const days = daysSinceNum(dateStr);
    return days <= 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'}`;
  };
  const [moveMenuFor, setMoveMenuFor] = useState(null);
  useEffect(() => {
    if (!moveMenuFor) return;
    const close = () => setMoveMenuFor(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [moveMenuFor]);

  const myEmployeeId = useMemo(() => data.employees.find(e => e.email === user?.email)?.id || null, [data.employees, user]);
  const [ownerFilter, setOwnerFilter] = useState('mine'); // 'mine' | 'all' - recruiters default to their own pipeline

  const allCandidatesRaw = data.candidates;
  const allCandidates = useMemo(() => {
    if (ownerFilter === 'all' || !myEmployeeId) return allCandidatesRaw;
    return allCandidatesRaw.filter(c => c.assignedRecruiterId === myEmployeeId);
  }, [allCandidatesRaw, ownerFilter, myEmployeeId]);

  const filtered = useMemo(() => {
    return allCandidates.filter(c => {
      const s = search.toLowerCase();
      const matchSearch = !s || c.name.toLowerCase().includes(s) || c.role.toLowerCase().includes(s) || c.email.toLowerCase().includes(s);
      const matchStage = !filters.stage || filters.stage === 'All' || c.stage === filters.stage;
      const matchRole = !filters.role || filters.role === 'All' || c.role === filters.role;
      const matchSkill = !filters.skill || filters.skill === 'All' || (c.skills || []).includes(filters.skill);
      return matchSearch && matchStage && matchRole && matchSkill;
    });
  }, [allCandidates, search, filters]);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.role) { toast.error('Name, email and role are required'); return; }
    const emailErr = candidateEmailError(form.email);
    const phoneErr = candidatePhoneError(form.phone);
    if (emailErr) { toast.error(emailErr); return; }
    if (phoneErr) { toast.error(phoneErr); return; }
    try {
      await candidates.create({ ...form, jobPostingId: form.jobPostingId || null, stage: 'Applied', score: Math.floor(Math.random() * 40 + 60), appliedDate: new Date().toISOString().split('T')[0], skills: [], status: 'Active', location: 'Hyderabad', noticePeriod: '30 days', currentCompany: '-', interviewer: '-', feedback: null, resume: 'resume.pdf' });
      toast.success(`Candidate ${form.name} added successfully`);
      setShowAdd(false);
      setForm({ name: '', email: '', role: '', experience: '', currentCTC: '', expectedCTC: '', source: 'LinkedIn', phone: '', jobPostingId: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to add candidate');
    }
  };

  const moveStage = async (candidate, newStage) => {
    try {
      await candidates.update(candidate.id, { stage: newStage });
      toast.success(`${candidate.name} moved to ${newStage}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update candidate stage');
    }
  };

  const handleReject = async (candidate) => {
    const ok = await confirm({ title: 'Reject Candidate?', message: `Reject ${candidate.name}?`, type: 'danger', confirmText: 'Reject' });
    if (!ok) return;
    try {
      await candidates.update(candidate.id, { stage: 'Rejected', status: 'Rejected' });
      toast.warning(`${candidate.name} has been rejected`);
    } catch (err) {
      toast.error(err.message || 'Failed to reject candidate');
    }
  };

  const handleClaim = async (candidate) => {
    try {
      await candidates.claim(candidate.id);
      toast.success(`${candidate.name} assigned to you`);
    } catch (err) {
      toast.error(err.message || 'Failed to claim candidate');
    }
  };

  const handleDelete = async (candidate) => {
    const ok = await confirm({ title: 'Delete Candidate?', message: `Delete ${candidate.name} from the pipeline?`, type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await candidates.remove(candidate.id);
      toast.success('Candidate deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete candidate');
    }
  };

  const handleScheduleInterview = (candidate) => {
    if (candidatesSource !== 'live') { toast.error('Connect to the live backend to schedule interviews'); return; }
    if (!candidate.jobPostingId) { toast.error('This candidate has no linked job posting to schedule against'); return; }
    setScheduleModal({ candidate });
  };

  const stageData = stages.slice(0, 6).map(s => ({ stage: s, count: allCandidates.filter(c => c.stage === s).length }));
  // Filter out falsy roles (a candidate with no role set) before building the dropdown - an
  // undefined/empty entry in this Set rendered as a blank, unlabeled option that silently did
  // nothing when selected (its value never matched any real candidate's role).
  const roles = [...new Set(allCandidates.map(c => c.role).filter(Boolean))];
  const skills = [...new Set(allCandidates.flatMap(c => c.skills || []))].sort();

  const columns = [
    { key: 'name', label: 'Candidate', render: (_, row) => <div className="flex items-center gap-2"><Avatar name={row.name} size="sm" /><div><p className="font-medium text-text text-sm">{row.name}</p><p className="text-xs text-text-secondary">{row.email}</p></div></div> },
    { key: 'role', label: 'Role' },
    { key: 'experience', label: 'Experience' },
    { key: 'stage', label: 'Stage', render: (v) => <Badge>{v}</Badge> },
    { key: 'score', label: 'Score', render: (v) => <div className="flex items-center gap-2"><ProgressBar value={v} max={100} size="sm" color={v >= 80 ? 'success' : v >= 60 ? 'warning' : 'danger'} /><span className="text-xs font-semibold">{v}%</span></div> },
    { key: 'source', label: 'Source' },
    { key: 'assignedRecruiterId', label: 'Recruiter', render: (v) => employeeName(v) || '-' },
    { key: 'actions', label: '', sortable: false, render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(row); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary"><Eye size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); handleScheduleInterview(row); }} disabled={!row.jobPostingId} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent" title={row.jobPostingId ? 'Schedule Interview' : 'No linked job posting - direct hires can\'t be scheduled against one'}><Calendar size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Recruitment' }]} />
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-text">Recruitment Pipeline</h1><p className="text-sm text-text-secondary">{allCandidates.length} candidates</p></div>
        <div className="flex gap-2">
          <div className="flex bg-surface-3 rounded-lg p-0.5">
            <button onClick={() => setOwnerFilter('mine')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${ownerFilter === 'mine' ? 'bg-primary text-white' : 'text-text-secondary'}`}>My Candidates</button>
            <button onClick={() => setOwnerFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${ownerFilter === 'all' ? 'bg-primary text-white' : 'text-text-secondary'}`}>All Candidates</button>
          </div>
          <div className="flex bg-surface-3 rounded-lg p-0.5">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${view === 'kanban' ? 'bg-primary text-white' : 'text-text-secondary'}`}>Kanban</button>
            <button onClick={() => setView('table')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${view === 'table' ? 'bg-primary text-white' : 'text-text-secondary'}`}>Table</button>
          </div>
          <Button icon={Plus} size="sm" onClick={() => setShowAdd(true)}>Add Candidate</Button>
        </div>
      </div>

      {isRecruiter && dashboardStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Calendar} label="Upcoming Interviews" value={dashboardStats.upcomingInterviews} color="info" showSparkline={false} />
          <StatCard icon={MoreVertical} label="Pending Feedback" value={dashboardStats.pendingFeedback} color="warning" showSparkline={false} />
          <StatCard icon={FileText} label="Offers Pending" value={dashboardStats.offersPending} color="primary" showSparkline={false} />
          <StatCard icon={XCircle} label="Rejected" value={dashboardStats.rejectedCandidates} color="danger" showSparkline={false} />
          <StatCard icon={UserCheck} label="Waiting for Scheduling" value={dashboardStats.waitingForScheduling} color="default" showSparkline={false} />
          <StatCard icon={Send} label="Waiting for HR Approval" value={dashboardStats.waitingForHrApproval} color="warning" showSparkline={false} />
          <StatCard icon={Send} label="Waiting for Manager Approval" value={dashboardStats.waitingForManagerApproval} color="warning" showSparkline={false} />
          <StatCard icon={FileText} label="Waiting for Offer" value={dashboardStats.waitingForOffer} color="success" showSparkline={false} />
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {stageData.map(s => <Card key={s.stage} hoverable><p className="text-[10px] text-text-secondary font-medium uppercase">{s.stage}</p><p className="text-2xl font-bold text-text mt-1">{s.count}</p></Card>)}
      </div>

      <SearchFilter searchValue={search} onSearch={setSearch} filters={[
        { key: 'stage', label: 'Stage', options: stages },
        { key: 'role', label: 'Role', options: roles },
        { key: 'skill', label: 'Technology', options: skills },
      ]} activeFilters={filters} onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClearFilters={() => setFilters({})} />

      {view === 'table' ? (
        <Card padding={false}><DataTable columns={columns} data={filtered} pageSize={12} onRowClick={setSelected} /></Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 items-start">
          {stages.slice(0, 6).map((stage, idx) => {
            const stageAll = filtered.filter(c => c.stage === stage);
            const avgAge = stageAll.length
              ? Math.round(stageAll.reduce((sum, c) => sum + daysSinceNum(c.appliedDate), 0) / stageAll.length)
              : 0;
            const pendingApprovalCount = stageAll.filter(c => c.status === 'PENDING_APPROVAL').length;
            return (
              <div key={stage} className={`min-w-[300px] max-w-[300px] flex-shrink-0 flex flex-col bg-surface-2/50 border border-border rounded-xl overflow-hidden ${idx > 0 ? 'border-l border-l-border/60' : ''}`} style={{ maxHeight: 'calc(100vh - 320px)' }}>
                <div className={`h-1 ${STAGE_ACCENT[stage] || 'bg-primary'}`} />
                <div className="sticky top-0 z-10 bg-surface-2 px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text">{stage}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-3 text-text-secondary font-medium">{stageAll.length}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-text-secondary">
                    <span>Avg {avgAge}d in stage</span>
                    {pendingApprovalCount > 0 && <span className="text-warning font-medium">{pendingApprovalCount} awaiting approval</span>}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {stageAll.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 text-text-secondary">
                      <Inbox size={22} className="mb-2 opacity-30" />
                      <p className="text-xs">No candidates here</p>
                      <p className="text-[10px] mt-0.5 opacity-70">Move candidates from the previous stage</p>
                    </div>
                  ) : stageAll.map(c => (
                    <div key={c.id} className="bg-surface-2 border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all">
                      <div className="flex items-start gap-3 mb-2.5">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text truncate">{c.name}</p>
                          <p className="text-xs text-text-secondary truncate">{c.role}</p>
                        </div>
                        {c.priority && c.priority !== 'MEDIUM' && (
                          <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-medium ${c.priority === 'URGENT' ? 'text-danger' : 'text-warning'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" /> {c.priority}
                          </span>
                        )}
                      </div>
                      {c.jobPostingTitle ? (
                        <p className="text-[10px] text-primary font-medium mb-1.5 truncate">Applied for: {c.jobPostingTitle}{c.jobPostingDepartment ? ` (${c.jobPostingDepartment})` : ''}</p>
                      ) : (
                        <p className="text-[10px] text-text-secondary/70 font-medium mb-1.5">Direct Hire</p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {(c.skills || []).slice(0, 3).map(s => <span key={s} className="text-[10px] px-2 py-0.5 bg-surface-3 text-text-secondary rounded-full">{s}</span>)}
                      </div>
                      <div className="space-y-1 text-[11px] text-text-secondary mb-2.5">
                        <div className="flex justify-between"><span>Experience</span><span className="text-text font-medium">{c.experience}</span></div>
                        <div className="flex justify-between"><span>Current Company</span><span className="text-text font-medium truncate ml-2">{c.currentCompany}</span></div>
                        <div className="flex justify-between items-center"><span>Expected CTC</span><SensitiveValue type="currency" value={c.expectedSalary} id={`kanban-ectc-${c.id}`} className="text-text font-medium" label="Expected CTC" /></div>
                        <div className="flex justify-between"><span>Notice Period</span><span className="text-text font-medium">{c.noticePeriod}</span></div>
                        <div className="flex justify-between items-center"><span>Recruiter</span>{c.assignedRecruiterId ? <span className="text-text font-medium">{employeeName(c.assignedRecruiterId)}</span> : isRecruiter && candidatesSource === 'live' ? (
                          <button onClick={() => handleClaim(c)} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 font-medium">Claim</button>
                        ) : <span className="text-text font-medium">-</span>}</div>
                      </div>
                      <div className="flex items-center gap-2 mb-2.5"><ProgressBar value={c.score} max={100} size="sm" color={c.score >= 80 ? 'success' : 'warning'} /><span className="text-xs font-semibold text-text">{c.score}%</span></div>
                      <p className="text-[10px] text-text-secondary mb-2.5">Applied {daysSince(c.appliedDate)} ago</p>
                      {c.status === 'PENDING_APPROVAL' && <div className="mb-2.5 text-[10px] px-2 py-1 bg-warning/10 text-warning rounded-lg font-medium">Awaiting manager approval</div>}
                      {c.status === 'REVISION_REQUESTED' && <div className="mb-2.5 text-[10px] px-2 py-1 bg-danger/10 text-danger rounded-lg"><p className="font-medium">Manager requested changes:</p><p className="mt-0.5">{c.managerRemarks}</p></div>}
                      {c.convertedEmployeeId && <div className="mb-2.5 text-[10px] px-2 py-1 bg-success/10 text-success rounded-lg font-medium text-center">Employee {c.convertedEmployeeId}</div>}

                      <div className="grid grid-cols-4 gap-1 pt-2 border-t border-border/60">
                        <button onClick={() => setSelected(c)} className="text-[10px] py-1.5 rounded-lg bg-surface-3 text-text-secondary hover:bg-surface-4 hover:text-text font-medium">View</button>
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setMoveMenuFor(moveMenuFor === c.id ? null : c.id); }} className="w-full text-[10px] py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-medium">Move</button>
                          {moveMenuFor === c.id && (
                            <div className="absolute z-20 top-full left-0 mt-1 w-36 py-1 bg-surface-2 border border-border rounded-lg shadow-xl">
                              {stages.slice(0, 7).filter(s => s !== c.stage).map(s => (
                                <button key={s} onClick={() => { moveStage(c, s); setMoveMenuFor(null); }} className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-surface-3">{s}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleScheduleInterview(c)} disabled={!c.jobPostingId} title={c.jobPostingId ? undefined : 'No linked job posting'} className="text-[10px] py-1.5 rounded-lg bg-info/10 text-info hover:bg-info/20 font-medium disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-info/10">Schedule</button>
                        <button onClick={() => setSelected(c)} className="text-[10px] py-1.5 rounded-lg bg-surface-3 text-text-secondary hover:bg-surface-4 hover:text-text font-medium">Feedback</button>
                      </div>
                      {c.stage === 'HR' && !c.convertedEmployeeId && c.status !== 'PENDING_APPROVAL' && (
                        <button onClick={() => openOfferModal(c)} className="w-full mt-1.5 text-[10px] py-1.5 bg-success/10 text-success rounded-lg hover:bg-success/20 font-medium">{c.status === 'REVISION_REQUESTED' ? 'Resubmit Proposal' : 'Submit for Approval'}</button>
                      )}
                      <button onClick={() => handleReject(c)} className="w-full mt-1.5 text-[10px] py-1 text-danger hover:underline">Reject Candidate</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Candidate" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Candidate name" />
          <Input label="Email *" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email address" error={candidateEmailError(form.email)} />
          <Input label="Role *" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="e.g. React Developer" />
          <Input label="Experience" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} placeholder="e.g. 5 years" />
          <Input label="Current CTC" value={form.currentCTC} onChange={e => setForm(p => ({ ...p, currentCTC: e.target.value }))} placeholder="e.g. ₹12L" />
          <Input label="Expected CTC" value={form.expectedCTC} onChange={e => setForm(p => ({ ...p, expectedCTC: e.target.value }))} placeholder="e.g. ₹18L" />
          <Select label="Source" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} options={['LinkedIn','Naukri','Indeed','Referral','Company Website','Campus'].map(s => ({ value: s, label: s }))} />
          <Input label="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: sanitizePhoneInput(e.target.value) }))} placeholder="+91 XXXXX XXXXX" error={candidatePhoneError(form.phone)} />
          <Select label="Job Posting (optional)" className="col-span-2" value={form.jobPostingId || ''} onChange={e => setForm(p => ({ ...p, jobPostingId: e.target.value }))}
            options={(jobPostings || []).map(j => ({ value: j.id, label: j.title }))} placeholder="Direct Hire (no job posting)" />
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleCreate} disabled={!!candidateEmailError(form.email) || !!candidatePhoneError(form.phone)}>Add Candidate</Button></div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Candidate Profile" size="xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-surface-3 rounded-xl">
              <Avatar name={selected.name} size="lg" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text">{selected.name}</h3>
                  <span className="text-[11px] font-mono text-text-secondary bg-surface-4 px-1.5 py-0.5 rounded">{selected.candidateCode || 'CAN-PENDING'}</span>
                </div>
                <p className="text-sm text-primary">{selected.role}</p>
                <p className="text-xs text-text-secondary">{selected.email} &middot; {selected.phone}</p>
                <div className="flex gap-2 mt-2"><Badge>{selected.stage}</Badge><Badge variant="default">{selected.source}</Badge>{selected.priority && selected.priority !== 'MEDIUM' && <Badge variant={selected.priority === 'URGENT' ? 'danger' : 'warning'}>{selected.priority}</Badge>}</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" icon={PencilLine} onClick={() => setEditModalCandidate(selected)}>Edit Candidate</Button>
                <Button size="sm" variant="secondary" icon={Calendar} disabled={!selected.jobPostingId} title={selected.jobPostingId ? undefined : 'This candidate has no linked job posting to schedule against'} onClick={() => handleScheduleInterview(selected)}>Schedule Interview</Button>
                {!selected.jobPostingId && <p className="text-[10px] text-text-secondary -mt-1.5">No linked job posting (Direct Hire) - interviews can't be scheduled until one is linked.</p>}
                <Button size="sm" variant="secondary" icon={Mail} onClick={() => toast.info('Direct email to candidates is not available yet')}>Send Email</Button>
                {selected.stage === 'HR' && !selected.convertedEmployeeId && selected.status !== 'PENDING_APPROVAL' && (
                  <Button size="sm" variant="secondary" icon={FileText} onClick={() => openOfferModal(selected)}>{selected.status === 'REVISION_REQUESTED' ? 'Resubmit Proposal' : 'Submit for Approval'}</Button>
                )}
                {selected.status === 'PENDING_APPROVAL' && <Badge variant="warning">Awaiting manager approval</Badge>}
                {/* Only ever shown post-conversion (convertedEmployeeId is set exclusively inside
                    approveSelection, when a real Employee row is created) - a candidate never has
                    this before then, per "a candidate is not yet an employee". */}
                {selected.convertedEmployeeId && <Badge variant="success">Employee {selected.convertedEmployeeId}</Badge>}
              </div>
            </div>

            {/* Always-visible status strip - never buried behind a tab. */}
            <div className="grid grid-cols-5 gap-3 p-3 bg-surface-2 border border-border rounded-xl text-xs">
              <div><p className="text-text-secondary">Current Stage</p><p className="text-text font-semibold mt-0.5">{selected.stage}</p></div>
              <div>
                <p className="text-text-secondary">Recruiter</p>
                {selected.assignedRecruiterId ? (
                  <p className="text-text font-semibold mt-0.5">{employeeName(selected.assignedRecruiterId) || '-'}</p>
                ) : isRecruiter && candidatesSource === 'live' ? (
                  <button onClick={() => handleClaim(selected)} className="mt-0.5 text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 font-medium">Claim Candidate</button>
                ) : <p className="text-text font-semibold mt-0.5">-</p>}
              </div>
              <div><p className="text-text-secondary">Hiring Manager</p><p className="text-text font-semibold mt-0.5">{employeeName(selected.hiringManagerId) || '-'}</p></div>
              <div><p className="text-text-secondary">Next Action</p><p className="text-text font-semibold mt-0.5">{nextActionFor(selected)}</p></div>
              <div><p className="text-text-secondary">Days Since Applied</p><p className="text-text font-semibold mt-0.5">{daysSince(selected.appliedDate)}</p></div>
            </div>
            <div className="p-3 bg-surface-2 border border-border rounded-xl text-xs">
              <p className="text-text-secondary">Applied For</p>
              {selected.jobPostingTitle ? (
                <div className="mt-0.5">
                  <p className="text-text font-semibold">{selected.jobPostingTitle}{selected.jobPostingDepartment ? ` · ${selected.jobPostingDepartment}` : ''}</p>
                  {selected.jobPostingSkills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selected.jobPostingSkills.map(s => <span key={s} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">{s}</span>)}
                    </div>
                  )}
                </div>
              ) : <p className="text-text font-semibold mt-0.5">Direct Hire (no job posting)</p>}
            </div>

            {selected.status === 'REVISION_REQUESTED' && selected.managerRemarks && (
              <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl">
                <p className="text-xs text-danger font-semibold">Manager requested changes</p>
                <p className="text-xs text-text-secondary mt-0.5">{selected.managerRemarks}</p>
              </div>
            )}

            <Tabs tabs={[
              { id: 'profile', label: 'Profile', content: (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {[['Experience', selected.experience], ['Notice Period', selected.noticePeriod], ['Current Company', selected.currentCompany], ['Current Location', selected.currentLocation || '-'], ['Preferred Location', selected.preferredLocation || '-'], ['Applied Date', selected.appliedDate], ['Score', `${selected.score}%`], ['Priority', selected.priority || '-'], ['Business Unit', selected.businessUnit || '-']].map(([k, v]) => (
                      <div key={k}><p className="text-xs text-text-secondary">{k}</p><p className="text-text font-medium mt-0.5">{v || '-'}</p></div>
                    ))}
                    <div><p className="text-xs text-text-secondary">Current CTC</p><p className="text-text font-medium mt-0.5"><SensitiveValue type="currency" value={selected.currentCTC} id={`candidate-current-ctc-${selected.id}`} /></p></div>
                    <div><p className="text-xs text-text-secondary">Expected CTC</p><p className="text-text font-medium mt-0.5"><SensitiveValue type="currency" value={selected.expectedCTC} id={`candidate-expected-ctc-${selected.id}`} /></p></div>
                  </div>
                  {selected.feedback && <div className="p-3 bg-surface-3 rounded-lg"><p className="text-xs text-text-secondary mb-1">Notes</p><p className="text-sm text-text">{selected.feedback}</p></div>}
                  <div className="flex gap-2 flex-wrap">
                    {stages.slice(0, 6).filter(s => s !== selected.stage && s !== 'Rejected').map(s => (
                      <button key={s} onClick={() => { moveStage(selected, s); setSelected(null); }} className="px-3 py-1.5 text-xs font-medium bg-surface-3 rounded-lg hover:bg-surface-4 text-text-secondary hover:text-text">Move to {s}</button>
                    ))}
                    <button onClick={() => { handleReject(selected); setSelected(null); }} className="px-3 py-1.5 text-xs font-medium bg-danger/10 rounded-lg hover:bg-danger/20 text-danger">Reject</button>
                  </div>
                </div>
              )},
              ...(candidatesSource === 'live' ? [{ id: 'interviews', label: 'Interviews & Timeline', content: (
                <CandidateInterviewsTab
                  key={refreshKey}
                  candidate={selected}
                  onReschedule={(interview) => setScheduleModal({ candidate: selected, interview, mode: 'reschedule' })}
                  onEdit={(interview) => setScheduleModal({ candidate: selected, interview, mode: 'edit' })}
                  onClone={(interview) => setScheduleModal({ candidate: selected, interview, mode: 'clone' })}
                  onFeedback={(interview) => setFeedbackInterview(interview)}
                />
              )}] : []),
            ]} />
          </div>
        )}
      </Modal>

      <ScheduleInterviewModal
        open={!!scheduleModal}
        onClose={() => setScheduleModal(null)}
        candidate={scheduleModal?.candidate}
        jobPostingId={scheduleModal?.candidate?.jobPostingId}
        employees={data.employees}
        interview={scheduleModal?.interview}
        mode={scheduleModal?.mode}
        nextRound={1}
        onScheduled={refreshAfterInterviewChange}
      />
      <InterviewFeedbackModal
        open={!!feedbackInterview}
        onClose={() => setFeedbackInterview(null)}
        interview={feedbackInterview}
        onSubmitted={refreshAfterInterviewChange}
      />
      <CandidateEditModal
        open={!!editModalCandidate}
        onClose={() => setEditModalCandidate(null)}
        candidate={editModalCandidate}
        employees={data.employees}
        jobPostings={jobPostings}
        onUpdated={async () => {
          refreshAfterInterviewChange();
          if (editModalCandidate) {
            const fresh = await getCandidate(editModalCandidate.id).catch(() => null);
            if (fresh) setSelected(fresh);
          }
        }}
      />

      <Modal open={!!offerCandidate} onClose={() => setOfferCandidate(null)} title="Submit Offer Proposal for Approval" size="lg">
        {offerCandidate && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-xl">
              <Avatar name={offerCandidate.name} size="md" />
              <div><p className="font-medium text-text">{offerCandidate.name}</p><p className="text-xs text-text-secondary">{offerCandidate.email}</p></div>
            </div>
            {offerCandidate.status === 'REVISION_REQUESTED' && offerCandidate.managerRemarks && (
              <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl">
                <p className="text-xs text-danger font-semibold">Manager requested changes</p>
                <p className="text-xs text-text-secondary mt-0.5">{offerCandidate.managerRemarks}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Select label="Designation *" value={offerForm.designationId} onChange={e => setOfferForm(p => ({ ...p, designationId: e.target.value }))}
                options={(lookups.designations || []).map(d => ({ value: d.id, label: d.title }))} placeholder="Select designation" />
              <Select label="Department *" value={offerForm.departmentId} onChange={e => setOfferForm(p => ({ ...p, departmentId: e.target.value }))}
                options={(lookups.departments || []).map(d => ({ value: d.id, label: d.name }))} placeholder="Select department" />
              <Input label="Annual CTC (₹) *" type="number" value={offerForm.offeredCtc} onChange={e => setOfferForm(p => ({ ...p, offeredCtc: e.target.value }))} placeholder="e.g. 1200000" />
              <Input label="Date of Joining *" type="date" value={offerForm.dateOfJoining} onChange={e => setOfferForm(p => ({ ...p, dateOfJoining: e.target.value }))} />
              <Select label="Reporting Manager" value={offerForm.reportingManagerId} onChange={e => setOfferForm(p => ({ ...p, reportingManagerId: e.target.value }))}
                options={managerOptions.map(m => ({ value: m.id, label: m.designation ? `${m.name} (${m.designation})` : m.name }))} placeholder="Select reporting manager" />
            </div>
            {offerBreakup && (
              <div className="p-3 bg-surface-3 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Monthly CTC Breakup (per CEO's standard template)</p>
                {Object.entries(offerBreakup).filter(([k]) => k !== 'ctc').map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="text-text-secondary capitalize">{k.replace(/([A-Z])/g, ' $1')}</span><span className="text-text font-medium">₹{Number(v).toLocaleString('en-IN')}</span></div>
                ))}
              </div>
            )}
            <p className="text-xs text-text-secondary">This submits the proposal to a manager for approval. Nothing is emailed to {offerCandidate.email} until the manager approves it.</p>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOfferCandidate(null)}>Cancel</Button><Button onClick={handleProposeSelection} disabled={offerSubmitting}>{offerSubmitting ? 'Submitting...' : 'Submit for Approval'}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
