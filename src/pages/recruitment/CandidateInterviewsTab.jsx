import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Link as LinkIcon, RefreshCw, XCircle, MessageSquare, Pencil, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { getCandidateInterviews, getCandidateTimeline, cancelInterview, reorderInterviews } from '../../api/recruitment';

const STATUS_VARIANT = { SCHEDULED: 'info', COMPLETED: 'success', CANCELLED: 'danger', NO_SHOW: 'warning', RESCHEDULED: 'warning' };
const TYPE_LABELS = { HR: 'HR', TECHNICAL_L1: 'Technical L1', TECHNICAL_L2: 'Technical L2', TECHNICAL_L3: 'Technical L3', MANAGERIAL: 'Managerial', CLIENT: 'Client', FINAL_HR: 'Final HR', CEO_ROUND: 'CEO Round', CUSTOM: 'Custom' };
const TIMELINE_LABELS = {
  CANDIDATE_CREATED: 'Candidate Created', INTERVIEW_SCHEDULED: 'Interview Scheduled', INTERVIEW_COMPLETED: 'Interview Completed',
  INTERVIEW_CANCELLED: 'Interview Cancelled', INTERVIEW_RESCHEDULED: 'Interview Rescheduled', FIELD_CHANGED: 'Field Updated', OFFER_GENERATED: 'Offer Generated',
};

export default function CandidateInterviewsTab({ candidate, onReschedule, onEdit, onClone, onFeedback }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [interviews, setInterviews] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(() => {
    getCandidateInterviews(candidate.id).then(setInterviews).catch(() => setInterviews([]));
    getCandidateTimeline(candidate.id).then(setTimeline).catch(() => setTimeline([]));
  }, [candidate.id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (interview) => {
    const ok = await confirm({ title: 'Cancel Interview?', message: `Cancel the ${TYPE_LABELS[interview.type] || interview.type} round for ${candidate.name}?`, type: 'danger', confirmText: 'Cancel Interview' });
    if (!ok) return;
    try {
      await cancelInterview(interview.id, 'Cancelled by recruiter');
      toast.success('Interview cancelled');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel interview');
    }
  };

  const handleMove = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= interviews.length) return;
    const reordered = [...interviews];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setReordering(true);
    try {
      const updated = await reorderInterviews(candidate.id, reordered.map(i => i.id));
      setInterviews(updated);
      toast.success('Rounds reordered');
    } catch (err) {
      toast.error(err.message || 'Failed to reorder rounds');
    } finally {
      setReordering(false);
    }
  };

  if (interviews === null || timeline === null) return <p className="text-xs text-text-secondary">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Interview Rounds</p>
        {interviews.length === 0 && <p className="text-xs text-text-secondary">No interviews scheduled yet.</p>}
        <div className="space-y-2">
          {interviews.map((i, index) => (
            <div key={i.id} className="p-3 bg-surface-3 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col -my-1">
                    <button onClick={() => handleMove(index, -1)} disabled={index === 0 || reordering} className="text-text-secondary hover:text-text disabled:opacity-20"><ArrowUp size={12} /></button>
                    <button onClick={() => handleMove(index, 1)} disabled={index === interviews.length - 1 || reordering} className="text-text-secondary hover:text-text disabled:opacity-20"><ArrowDown size={12} /></button>
                  </div>
                  <span className="text-sm font-medium text-text">{i.title || `${TYPE_LABELS[i.type] || i.type} - Round ${i.round}`}</span>
                </div>
                <Badge variant={STATUS_VARIANT[i.status]} dot>{i.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                <span className="flex items-center gap-1"><Calendar size={12} /> {i.scheduledDate}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {i.scheduledTime} ({i.duration}min{i.timezone ? `, ${i.timezone}` : ''})</span>
                {i.interviewer && i.interviewer !== '-' && <span>Interviewer: {i.interviewer}</span>}
                {i.meetingLink && <a href={i.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><LinkIcon size={12} /> Join</a>}
                {i.location && <span className="flex items-center gap-1"><MapPin size={12} /> {i.location}</span>}
              </div>
              {i.recommendation && (
                <div className="mt-2 text-xs">
                  <Badge variant={i.recommendation.includes('HIRE') ? 'success' : i.recommendation === 'HOLD' ? 'warning' : 'danger'}>{i.recommendation.replace('_', ' ')}</Badge>
                  {i.strengths && <p className="text-text-secondary mt-1">Strengths: {i.strengths}</p>}
                  {i.weaknesses && <p className="text-text-secondary mt-0.5">Weaknesses: {i.weaknesses}</p>}
                </div>
              )}
              {i.status === 'SCHEDULED' && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(i)}>Edit</Button>
                  <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => onReschedule(i)}>Reschedule</Button>
                  <Button size="sm" variant="ghost" icon={Copy} onClick={() => onClone(i)}>Clone Round</Button>
                  <Button size="sm" variant="ghost" icon={MessageSquare} onClick={() => onFeedback(i)}>Submit Feedback</Button>
                  <button onClick={() => handleCancel(i)} className="inline-flex items-center gap-1 text-xs text-danger hover:underline px-2"><XCircle size={13} /> Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Timeline</p>
        <div className="space-y-2 border-l-2 border-border pl-4">
          {timeline.map((t, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
              <p className="text-xs text-text-secondary">{t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}</p>
              <p className="text-sm text-text font-medium">{TIMELINE_LABELS[t.type] || t.type}: {t.title}</p>
              {t.detail && <p className="text-xs text-text-secondary">{t.detail}</p>}
              {(t.interviewer || t.recruiter) && <p className="text-xs text-text-secondary">{t.interviewer && `Interviewer: ${t.interviewer}`} {t.recruiter && `· Recruiter: ${t.recruiter}`}</p>}
            </div>
          ))}
          {timeline.length === 0 && <p className="text-xs text-text-secondary">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}
