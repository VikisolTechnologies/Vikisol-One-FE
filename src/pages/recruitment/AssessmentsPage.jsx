import { useState, useEffect, useMemo } from 'react';
import { Trophy, FileText, ArrowRightCircle, ExternalLink } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import StatCard from '../../components/ui/StatCard';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import { getAllAssessments, moveAssessmentToInterview } from '../../api/assessments';
import { getAllJobPostings } from '../../api/recruitment';

const STATUS_VARIANT = { PASS: 'success', FAIL: 'danger', PENDING_REVIEW: 'warning' };

export default function AssessmentsPage() {
  const toast = useToast();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobPostings, setJobPostings] = useState([]);
  const [moveTarget, setMoveTarget] = useState(null);
  const [form, setForm] = useState({ jobPostingId: '', interviewerName: '', round: 1, scheduledDate: '', scheduledTime: '', duration: 30, mode: 'VIDEO' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getAllAssessments().then(res => setAssessments(res.items)).catch(() => toast.error('Failed to load assessments')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    getAllJobPostings().then(res => setJobPostings(res.items)).catch(() => setJobPostings([]));
  }, []);

  const stats = useMemo(() => ({
    total: assessments.length,
    passed: assessments.filter(a => a.status === 'PASS').length,
    failed: assessments.filter(a => a.status === 'FAIL').length,
    moved: assessments.filter(a => a.movedToInterview).length,
  }), [assessments]);

  const openMoveModal = (row) => {
    setForm({ jobPostingId: '', interviewerName: '', round: 1, scheduledDate: '', scheduledTime: '', duration: 30, mode: 'VIDEO' });
    setMoveTarget(row);
  };

  const handleMove = async () => {
    if (!form.jobPostingId || !form.scheduledDate || !form.scheduledTime) {
      toast.error('Job posting, date and time are required');
      return;
    }
    setSubmitting(true);
    try {
      await moveAssessmentToInterview(moveTarget.id, form);
      toast.success(`${moveTarget.candidateName} moved to interview`);
      setMoveTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to move candidate to interview');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'candidateName', label: 'Candidate' },
    { key: 'candidateEmail', label: 'Email' },
    { key: 'candidatePhone', label: 'Mobile' },
    { key: 'experienceYears', label: 'Experience', render: v => `${v ?? 0} yrs` },
    { key: 'techStack', label: 'Tech Stack', render: v => (v || []).join(', ') || '-' },
    { key: 'testName', label: 'Test' },
    { key: 'dateTaken', label: 'Date Taken', render: v => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'score', label: 'Score', render: (v, row) => `${v}/${row.maxScore} (${row.percentage}%)` },
    { key: 'status', label: 'Result', render: v => <Badge variant={STATUS_VARIANT[v] || 'default'}>{v.replace('_', ' ')}</Badge> },
    { key: 'resumeUrl', label: 'Resume', render: v => v ? <a href={v} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1"><FileText size={14} />View<ExternalLink size={11} /></a> : '-' },
    {
      key: 'actions', label: 'Actions', sortable: false, render: (_, row) => (
        row.status === 'PASS' && !row.movedToInterview ? (
          <Button size="sm" variant="ghost" icon={ArrowRightCircle} onClick={() => openMoveModal(row)}>Move to Interview</Button>
        ) : row.movedToInterview ? <Badge variant="info">Interview Scheduled</Badge> : <span className="text-text-secondary text-xs">-</span>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Recruitment' }, { label: 'Arena Assessments' }]} />

      <div>
        <h1 className="text-xl font-bold text-text flex items-center gap-2"><Trophy size={22} className="text-primary" /> Vikisol Arena Assessments</h1>
        <p className="text-sm text-text-secondary mt-1">Candidate test results submitted from Vikisol Arena, with scores and pass/fail status.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Trophy} label="Total Submissions" value={stats.total} color="primary" showSparkline={false} />
        <StatCard icon={Trophy} label="Passed" value={stats.passed} color="success" showSparkline={false} />
        <StatCard icon={Trophy} label="Failed" value={stats.failed} color="danger" showSparkline={false} />
        <StatCard icon={ArrowRightCircle} label="Moved to Interview" value={stats.moved} color="info" showSparkline={false} />
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="p-8 text-center text-text-secondary text-sm">Loading assessments...</div>
        ) : (
          <DataTable columns={columns} data={assessments} pageSize={10} />
        )}
      </Card>

      <Modal open={!!moveTarget} onClose={() => setMoveTarget(null)} title={`Move ${moveTarget?.candidateName || ''} to Interview`} size="md">
        <div className="space-y-4">
          <Select label="Job Posting" placeholder="Select job posting" value={form.jobPostingId}
            onChange={e => setForm(f => ({ ...f, jobPostingId: e.target.value }))}
            options={jobPostings.map(j => ({ value: j.id, label: j.title }))} />
          <Input label="Interviewer Name" value={form.interviewerName} onChange={e => setForm(f => ({ ...f, interviewerName: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Scheduled Date" type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
            <Input label="Scheduled Time" type="time" value={form.scheduledTime} onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Round" type="number" value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} />
            <Input label="Duration (mins)" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          </div>
          <Select label="Mode" value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
            options={[{ value: 'VIDEO', label: 'Video' }, { value: 'IN_PERSON', label: 'In Person' }, { value: 'PHONE', label: 'Phone' }]} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setMoveTarget(null)}>Cancel</Button>
            <Button onClick={handleMove} disabled={submitting}>{submitting ? 'Scheduling...' : 'Schedule Interview'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
