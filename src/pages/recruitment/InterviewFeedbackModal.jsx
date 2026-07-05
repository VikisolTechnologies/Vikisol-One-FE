import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { Select, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { submitInterviewFeedback, RECOMMENDATIONS } from '../../api/recruitment';

const RECOMMENDATION_LABELS = { STRONG_HIRE: 'Strong Hire', HIRE: 'Hire', HOLD: 'Hold', REJECT: 'Reject', STRONG_REJECT: 'Strong Reject' };
const RATING_FIELDS = [
  ['technicalRating', 'Technical Rating'],
  ['communicationRating', 'Communication'],
  ['problemSolvingRating', 'Problem Solving'],
  ['codingRating', 'Coding'],
  ['architectureRating', 'Architecture'],
  ['cultureFitRating', 'Culture Fit'],
];

function RatingSelect({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary">
        <option value="">-</option>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}

export default function InterviewFeedbackModal({ open, onClose, interview, onSubmitted }) {
  const toast = useToast();
  const [form, setForm] = useState({
    recommendation: '', technicalRating: '', communicationRating: '', problemSolvingRating: '',
    codingRating: '', architectureRating: '', cultureFitRating: '', strengths: '', weaknesses: '', comments: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.recommendation) { toast.error('Select a recommendation'); return; }
    setSubmitting(true);
    try {
      await submitInterviewFeedback(interview.id, form);
      toast.success('Feedback submitted');
      onSubmitted?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (!interview) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Interview Feedback - ${interview.candidateName || ''}`} size="lg">
      <div className="space-y-4">
        <Select label="Recommendation *" value={form.recommendation} onChange={e => set('recommendation', e.target.value)}
          options={RECOMMENDATIONS.map(r => ({ value: r, label: RECOMMENDATION_LABELS[r] }))} placeholder="Select recommendation" />

        <div className="grid grid-cols-3 gap-4">
          {RATING_FIELDS.map(([key, label]) => (
            <RatingSelect key={key} label={label} value={form[key]} onChange={v => set(key, v)} />
          ))}
        </div>

        <Textarea label="Strengths" value={form.strengths} onChange={e => set('strengths', e.target.value)} />
        <Textarea label="Weaknesses" value={form.weaknesses} onChange={e => set('weaknesses', e.target.value)} />
        <Textarea label="Comments" value={form.comments} onChange={e => set('comments', e.target.value)} />

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Feedback'}</Button>
        </div>
      </div>
    </Modal>
  );
}
