import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmployeeAutocomplete from '../../components/ui/EmployeeAutocomplete';
import { useToast } from '../../components/ui/Toast';
import { scheduleInterview, rescheduleInterview, editInterview, INTERVIEW_TYPES, INTERVIEW_PLATFORMS } from '../../api/recruitment';

const TYPE_LABELS = { HR: 'HR', TECHNICAL_L1: 'Technical L1', TECHNICAL_L2: 'Technical L2', TECHNICAL_L3: 'Technical L3', MANAGERIAL: 'Managerial', CLIENT: 'Client', FINAL_HR: 'Final HR', CEO_ROUND: 'CEO Round', CUSTOM: 'Custom' };
const PLATFORM_LABELS = { GOOGLE_MEET: 'Google Meet', MICROSOFT_TEAMS: 'Microsoft Teams', ZOOM: 'Zoom', IN_PERSON: 'In Person', PHONE_CALL: 'Phone Call' };
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC'];

// Full interview form covering 4 modes:
// - 'schedule' (no `interview` passed): create a brand-new round.
// - 'reschedule': date/time only (everything else locked) - matches the original "quick" flow.
// - 'edit': every field editable except candidate/job posting, as long as the interview isn't
//   COMPLETED - "everything should remain editable until the interview is completed".
// - 'clone': prefills every field from an existing interview but creates a NEW round (blank
//   date/time, round+1) - "Clone Round".
export default function ScheduleInterviewModal({ open, onClose, candidate, jobPostingId, employees, nextRound, interview, mode = 'schedule', onScheduled }) {
  const toast = useToast();
  const effectiveMode = interview ? mode : 'schedule';
  const isReschedule = effectiveMode === 'reschedule';
  const isClone = effectiveMode === 'clone';
  const isEdit = effectiveMode === 'edit';
  const isNewRound = effectiveMode === 'schedule' || isClone;

  const [form, setForm] = useState(() => ({
    title: !isClone && interview?.title || '',
    type: interview?.type || 'HR',
    interviewerId: interview?.interviewerId || '',
    additionalInterviewerIds: interview?.additionalInterviewerIds || [],
    hrManagerId: interview?.hrManagerId || '',
    round: isClone ? (interview?.round || 0) + 1 : (interview?.round || nextRound || 1),
    scheduledDate: isNewRound ? '' : (interview?.scheduledDate || ''),
    scheduledTime: isNewRound ? '' : (interview?.scheduledTime || ''),
    duration: interview?.duration || 30,
    timezone: interview?.timezone || 'Asia/Kolkata',
    platform: interview?.platform || 'GOOGLE_MEET',
    meetingLink: isClone ? '' : (interview?.meetingLink || ''),
    location: interview?.location || '',
    notes: isClone ? '' : (interview?.notes || ''),
    agenda: interview?.agenda || '',
    prepNotes: interview?.prepNotes || '',
  }));
  const [submitting, setSubmitting] = useState(false);

  const primaryInterviewer = employees.find(e => e.id === form.interviewerId);
  const showFullFields = !isReschedule;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const title = { schedule: 'Schedule Interview', reschedule: 'Reschedule Interview', edit: 'Edit Interview', clone: 'Clone Round' }[effectiveMode];
  const submitLabel = { schedule: 'Schedule & Send Invite', reschedule: 'Reschedule & Resend Invite', edit: 'Save Changes', clone: 'Schedule Cloned Round' }[effectiveMode];

  const handleSubmit = async () => {
    if (isNewRound && !form.interviewerId) { toast.error('Select a primary interviewer'); return; }
    if (!form.scheduledDate || !form.scheduledTime) { toast.error('Date and time are required'); return; }
    setSubmitting(true);
    try {
      if (isReschedule) {
        await rescheduleInterview(interview.id, { scheduledDate: form.scheduledDate, scheduledTime: form.scheduledTime, reason: form.notes });
        toast.success('Interview rescheduled and invite re-sent');
      } else if (isEdit) {
        await editInterview(interview.id, { ...form, candidateId: candidate.id, jobPostingId, interviewerName: primaryInterviewer?.name || interview.interviewer });
        toast.success('Interview updated');
      } else {
        await scheduleInterview({ ...form, candidateId: candidate.id, jobPostingId, interviewerName: primaryInterviewer?.name });
        toast.success(isClone ? 'Round cloned and scheduled' : 'Interview scheduled - invite sent to candidate and interviewer(s)');
      }
      onScheduled?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save interview');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        {showFullFields && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Interview Title" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Java Full Stack Developer - L1 Technical Interview" className="col-span-2" />
              <Select label="Interview Type" value={form.type} onChange={e => set('type', e.target.value)} options={INTERVIEW_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))} />
              <Input label="Round" type="number" min="1" value={form.round} onChange={e => set('round', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <EmployeeAutocomplete label="Primary Interviewer *" employees={employees} value={form.interviewerId} onChange={id => set('interviewerId', id)} />
              </div>
              <div>
                <EmployeeAutocomplete label="HR Manager" employees={employees} value={form.hrManagerId} onChange={id => set('hrManagerId', id)} excludeIds={[form.interviewerId]} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Additional Interviewers</label>
              <EmployeeAutocomplete employees={employees} value="" placeholder="Add another interviewer"
                onChange={id => id && set('additionalInterviewerIds', [...new Set([...form.additionalInterviewerIds, id])])}
                excludeIds={[form.interviewerId, form.hrManagerId, ...form.additionalInterviewerIds]} />
              {form.additionalInterviewerIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.additionalInterviewerIds.map(id => {
                    const emp = employees.find(e => e.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-3 rounded-full text-xs text-text">
                        {emp?.name || id}
                        <button onClick={() => set('additionalInterviewerIds', form.additionalInterviewerIds.filter(x => x !== id))} className="text-text-secondary hover:text-danger">&times;</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <div className="grid grid-cols-4 gap-4">
          <Input label="Interview Date *" type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} />
          <Input label="Interview Time *" type="time" value={form.scheduledTime} onChange={e => set('scheduledTime', e.target.value)} />
          <Input label="Duration (mins)" type="number" min="10" value={form.duration} onChange={e => set('duration', e.target.value)} disabled={isReschedule} />
          <Select label="Timezone" value={form.timezone} onChange={e => set('timezone', e.target.value)} options={TIMEZONES.map(t => ({ value: t, label: t }))} disabled={isReschedule} />
        </div>

        {showFullFields && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Meeting Platform" value={form.platform} onChange={e => set('platform', e.target.value)} options={INTERVIEW_PLATFORMS.map(p => ({ value: p, label: PLATFORM_LABELS[p] }))} />
              {form.platform === 'IN_PERSON'
                ? <Input label="Interview Location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Office address" />
                : form.platform === 'PHONE_CALL'
                  ? <Input label="Phone Number" value={form.location} onChange={e => set('location', e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  : <Input label="Meeting Link" value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)} placeholder="https://meet.google.com/..." />
              }
            </div>
            <Textarea label="Agenda" value={form.agenda} onChange={e => set('agenda', e.target.value)} placeholder="What will be covered in this round" />
            <Textarea label="Preparation Notes (for candidate)" value={form.prepNotes} onChange={e => set('prepNotes', e.target.value)} placeholder="Topics the candidate should prepare" />
          </>
        )}
        <Textarea label={isReschedule ? 'Reason for Reschedule' : 'Internal Notes'} value={form.notes} onChange={e => set('notes', e.target.value)} />

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : submitLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
