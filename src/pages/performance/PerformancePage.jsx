import { useState, useEffect } from 'react';
import { Target, Award, Star, Plus, Edit3, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import * as performanceApi from '../../api/performance';

const MOCK_GOALS = [
  { id: 1, title: 'Complete React Migration', category: 'Technical', progress: 80, status: 'On Track', due: '2024-06-30', weight: 30 },
  { id: 2, title: 'Mentor 2 Junior Developers', category: 'Leadership', progress: 50, status: 'On Track', due: '2024-09-30', weight: 20 },
  { id: 3, title: 'AWS Certification', category: 'Learning', progress: 30, status: 'At Risk', due: '2024-08-15', weight: 15 },
  { id: 4, title: 'Reduce Bug Count by 40%', category: 'Quality', progress: 65, status: 'On Track', due: '2024-12-31', weight: 25 },
  { id: 5, title: 'Improve Code Review Turnaround', category: 'Process', progress: 90, status: 'On Track', due: '2024-07-31', weight: 10 },
];

const MOCK_REVIEWS = [
  { period: 'H1 2024', rating: 4.2, status: 'In Progress', reviewer: 'Rohit Sharma', comments: 'Strong technical execution. Needs to improve documentation.' },
  { period: 'H2 2023', rating: 3.8, status: 'Completed', reviewer: 'Rohit Sharma', comments: 'Consistent delivery. Good team collaboration.' },
  { period: 'H1 2023', rating: 4.0, status: 'Completed', reviewer: 'Priya Sharma', comments: 'Excellent problem-solving. Recommended for promotion.' },
];

export default function PerformancePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user, isAuthenticated } = useAuth() || {};
  const [goals, setGoals] = useState(MOCK_GOALS);
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [source, setSource] = useState('mock'); // 'mock' | 'live'
  const [loading, setLoading] = useState(false);
  const [activeCycleId, setActiveCycleId] = useState(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'Technical', due: '', weight: 20 });

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    performanceApi.getAllCycles()
      .then(async (cycles) => {
        if (!cycles || !cycles.length) {
          setSource('mock');
          return;
        }
        const cycle = cycles.find(c => c.status === 'ACTIVE') || cycles[0];
        setActiveCycleId(cycle.id);
        const [myGoals, myReviews] = await Promise.all([
          performanceApi.getMyGoals(cycle.id).catch(() => []),
          performanceApi.getMyReviews().catch(() => []),
        ]);
        setGoals(myGoals);
        setReviews(myReviews);
        setSource('live');
      })
      .catch(() => {
        setSource('mock');
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleAddGoal = async () => {
    if (!form.title) { toast.error('Goal title is required'); return; }
    if (source === 'live') {
      if (!activeCycleId) { toast.error('No active review cycle found'); return; }
      try {
        const created = await performanceApi.createGoal(form, user?.id, activeCycleId);
        setGoals(prev => [...prev, created]);
        toast.success('Goal added successfully');
        setShowAddGoal(false); setForm({ title: '', category: 'Technical', due: '', weight: 20 });
      } catch (err) {
        toast.error(err.message || 'Failed to add goal');
      }
      return;
    }
    setGoals(prev => [...prev, { ...form, id: Date.now(), progress: 0, status: 'On Track' }]);
    toast.success('Goal added successfully');
    setShowAddGoal(false); setForm({ title: '', category: 'Technical', due: '', weight: 20 });
  };

  const handleUpdateProgress = async (id, progress) => {
    const clamped = Math.min(100, Math.max(0, progress));
    if (source === 'live') {
      const goal = goals.find(g => g.id === id);
      if (!goal) return;
      try {
        const updated = await performanceApi.updateGoal(id, { ...goal, progress: clamped }, goal.employeeId, goal.reviewCycleId);
        setGoals(prev => prev.map(g => g.id === id ? updated : g));
        toast.success('Progress updated');
      } catch (err) {
        toast.error(err.message || 'Failed to update progress');
      }
      return;
    }
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress: clamped } : g));
    toast.success('Progress updated');
  };

  const handleDeleteGoal = async (id) => {
    const ok = await confirm({ title: 'Delete Goal?', message: 'Remove this goal from your objectives?', type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    // No delete endpoint on the backend for goals - this remains a local/demo-only action.
    setGoals(prev => prev.filter(g => g.id !== id));
    toast.success('Goal deleted');
  };

  const overallRating = reviews.length ? (reviews[0].rating || 4.2) : 4.2;
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Performance' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Performance</h1>
          {!loading && source === 'mock' && <p className="text-xs text-warning">(demo data — connect to live backend for real performance metrics)</p>}
          {loading && <p className="text-xs text-text-secondary">Loading from server...</p>}
        </div>
        <Button icon={Plus} size="sm" onClick={() => setShowAddGoal(true)}>Add Goal</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Star} label="Current Rating" value={`${overallRating}/5`} color="primary" delay={0} />
        <StatCard icon={Target} label="Goals" value={goals.length} change={`${goals.filter(g => g.status === 'On Track').length} on track`} color="success" delay={1} />
        <StatCard icon={Award} label="Avg Progress" value={`${avgProgress}%`} color="warning" delay={2} />
      </div>

      <Card title="Goals & Objectives">
        <div className="space-y-3">
          {goals.map(g => (
            <div key={g.id} className="p-4 bg-surface-3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1"><h4 className="text-sm font-semibold text-text">{g.title}</h4><p className="text-xs text-text-secondary">{g.category} &middot; Due: {g.due} &middot; Weight: {g.weight}%</p></div>
                <div className="flex items-center gap-2">
                  <Badge>{g.status}</Badge>
                  <button onClick={() => { setEditGoal(g); }} className="p-1 rounded hover:bg-surface-4 text-text-secondary"><Edit3 size={14} /></button>
                  <button onClick={() => handleDeleteGoal(g.id)} className="p-1 rounded hover:bg-danger/10 text-danger"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1"><ProgressBar value={g.progress} max={100} showLabel color={g.progress >= 70 ? 'success' : g.progress >= 40 ? 'warning' : 'danger'} /></div>
                <div className="flex gap-1">
                  <button onClick={() => handleUpdateProgress(g.id, g.progress - 10)} className="px-2 py-0.5 bg-surface-4 rounded text-xs text-text-secondary hover:text-text">-10</button>
                  <button onClick={() => handleUpdateProgress(g.id, g.progress + 10)} className="px-2 py-0.5 bg-primary/10 rounded text-xs text-primary hover:bg-primary/20">+10</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Review History">
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.period} className="p-4 bg-surface-3 rounded-xl cursor-pointer hover:bg-surface-4 transition-colors" onClick={() => toast.info(`Viewing ${r.period} review details`)}>
              <div className="flex items-center justify-between mb-2">
                <div><p className="text-sm font-medium text-text">{r.period}</p><p className="text-xs text-text-secondary">Reviewed by {r.reviewer}</p></div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className={i < Math.floor(r.rating) ? 'text-primary fill-primary' : 'text-surface-4'} />)}
                    <span className="text-sm font-semibold text-text ml-1">{r.rating}</span>
                  </div>
                  <Badge variant={r.status === 'Completed' ? 'success' : 'warning'}>{r.status}</Badge>
                </div>
              </div>
              <p className="text-xs text-text-secondary">{r.comments}</p>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={showAddGoal} onClose={() => setShowAddGoal(false)} title="Add Goal">
        <div className="space-y-4">
          <Input label="Goal Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="What do you want to achieve?" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} options={['Technical','Leadership','Learning','Quality','Process','Business'].map(v => ({ value: v, label: v }))} />
            <Input label="Due Date" type="date" value={form.due} onChange={e => setForm(p => ({ ...p, due: e.target.value }))} />
          </div>
          <Input label="Weight (%)" type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: parseInt(e.target.value) || 0 }))} min="0" max="100" />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowAddGoal(false)}>Cancel</Button><Button onClick={handleAddGoal}>Add Goal</Button></div>
        </div>
      </Modal>

      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title="Update Goal">
        {editGoal && <div className="space-y-4">
          <Input label="Progress (%)" type="number" value={editGoal.progress} onChange={e => setEditGoal(p => ({ ...p, progress: parseInt(e.target.value) || 0 }))} min="0" max="100" />
          <Select label="Status" value={editGoal.status} onChange={e => setEditGoal(p => ({ ...p, status: e.target.value }))} options={['On Track','At Risk','Completed','Deferred'].map(v => ({ value: v, label: v }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditGoal(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (source === 'live') {
                try {
                  const updated = await performanceApi.updateGoal(editGoal.id, editGoal, editGoal.employeeId, editGoal.reviewCycleId);
                  setGoals(prev => prev.map(g => g.id === editGoal.id ? updated : g));
                  toast.success('Goal updated');
                } catch (err) {
                  toast.error(err.message || 'Failed to update goal');
                } finally {
                  setEditGoal(null);
                }
                return;
              }
              setGoals(prev => prev.map(g => g.id === editGoal.id ? editGoal : g));
              toast.success('Goal updated');
              setEditGoal(null);
            }}>Save</Button>
          </div>
        </div>}
      </Modal>
    </div>
  );
}
