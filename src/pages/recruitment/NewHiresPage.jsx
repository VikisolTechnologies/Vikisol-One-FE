import { useState, useEffect, useMemo } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { previewCtcBreakup } from '../../api/payroll';
import { getManagerOptions } from '../../api/employees';
import { updateOfferProposal } from '../../api/recruitment';

export default function NewHiresPage() {
  const { data, candidates, candidatesSource, lookups } = useData();
  const toast = useToast();
  const confirm = useConfirm();

  const [breakups, setBreakups] = useState({}); // candidateId -> breakup
  const [approving, setApproving] = useState(null);
  const [revisionCandidate, setRevisionCandidate] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [sendingRevision, setSendingRevision] = useState(false);
  const [managerOptions, setManagerOptions] = useState([]);
  const [editingId, setEditingId] = useState(null); // candidate id currently being adjusted inline
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const pending = useMemo(() => data.candidates.filter(c => c.status === 'PENDING_APPROVAL'), [data.candidates]);
  const revisionsSent = useMemo(() => data.candidates.filter(c => c.status === 'REVISION_REQUESTED'), [data.candidates]);

  useEffect(() => {
    getManagerOptions().then(setManagerOptions).catch(() => setManagerOptions([]));
  }, []);

  useEffect(() => {
    pending.forEach(c => {
      if (c.offeredCtc && !breakups[c.id]) {
        previewCtcBreakup(c.offeredCtc).then(b => setBreakups(prev => ({ ...prev, [c.id]: b }))).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const openEdit = (c) => {
    setEditForm({
      designationId: c.offeredDesignationId || '', departmentId: c.offeredDepartmentId || '',
      offeredCtc: c.offeredCtc || '', dateOfJoining: c.offeredDateOfJoining || '',
      reportingManagerId: c.offeredReportingManagerId || '',
      joiningBonus: c.offeredJoiningBonus || '', variablePay: c.offeredVariablePay || '',
    });
    setEditingId(c.id);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      await updateOfferProposal(editingId, editForm);
      toast.success('Offer proposal updated');
      setEditingId(null);
      if (editForm.offeredCtc) previewCtcBreakup(editForm.offeredCtc).then(b => setBreakups(prev => ({ ...prev, [editingId]: b }))).catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Failed to update offer proposal');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleApprove = async (candidate) => {
    if (candidatesSource !== 'live') { toast.error('Connect to the live backend to approve offers'); return; }
    const ok = await confirm({ title: 'Approve Offer?', message: `Approve ${candidate.name} at ₹${Number(candidate.offeredCtc).toLocaleString('en-IN')} for ${candidate.offeredDesignationTitle}? This will generate their Employee ID and email the offer letter immediately.`, type: 'info', confirmText: 'Approve & Send Offer' });
    if (!ok) return;
    setApproving(candidate.id);
    try {
      const result = await candidates.approveSelection(candidate.id);
      toast.success(`${candidate.name} approved — Employee ID ${result.employeeId} generated, offer letter emailed`);
    } catch (err) {
      toast.error(err.message || 'Failed to approve offer');
    } finally {
      setApproving(null);
    }
  };

  const openRevisionModal = (candidate) => { setRemarks(''); setRevisionCandidate(candidate); };

  const handleSendRevision = async () => {
    if (!remarks.trim()) { toast.error('Add a remark explaining what needs to change'); return; }
    setSendingRevision(true);
    try {
      await candidates.requestRevision(revisionCandidate.id, remarks);
      toast.success(`Sent back to the recruiter with your remarks`);
      setRevisionCandidate(null);
    } catch (err) {
      toast.error(err.message || 'Failed to send revision request');
    } finally {
      setSendingRevision(false);
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'New Hires' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">New Hires - Offer Approvals</h1>
        <p className="text-sm text-text-secondary">Review offer proposals submitted by recruiters before they go out to candidates.</p>
      </div>

      <Card title={`Pending Your Approval (${pending.length})`}>
        {pending.length === 0 && <p className="text-sm text-text-secondary py-6 text-center">Nothing pending right now.</p>}
        <div className="space-y-3">
          {pending.map(c => {
            const breakup = breakups[c.id];
            return (
              <div key={c.id} className="p-4 bg-surface-3 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} size="md" />
                    <div>
                      <p className="font-medium text-text">{c.name}</p>
                      <p className="text-xs text-text-secondary">{c.email} &middot; {c.offeredDesignationTitle} &middot; {c.offeredDepartmentName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(c)}>Edit Proposal</Button>
                    <Button size="sm" variant="secondary" icon={X} onClick={() => openRevisionModal(c)}>Request Revision</Button>
                    <Button size="sm" icon={Check} onClick={() => handleApprove(c)} disabled={approving === c.id}>{approving === c.id ? 'Approving...' : 'Approve & Send Offer'}</Button>
                  </div>
                </div>

                {editingId === c.id ? (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-surface-4/50 rounded-lg mb-2">
                    <Select label="Designation" value={editForm.designationId} onChange={e => setEditForm(p => ({ ...p, designationId: e.target.value }))}
                      options={(lookups.designations || []).map(d => ({ value: d.id, label: d.title }))} placeholder="Designation" />
                    <Select label="Department" value={editForm.departmentId} onChange={e => setEditForm(p => ({ ...p, departmentId: e.target.value }))}
                      options={(lookups.departments || []).map(d => ({ value: d.id, label: d.name }))} placeholder="Department" />
                    <Input label="Annual CTC (₹)" type="number" value={editForm.offeredCtc} onChange={e => setEditForm(p => ({ ...p, offeredCtc: e.target.value }))} />
                    <Input label="Joining Bonus (₹)" type="number" value={editForm.joiningBonus} onChange={e => setEditForm(p => ({ ...p, joiningBonus: e.target.value }))} />
                    <Input label="Variable Pay (₹)" type="number" value={editForm.variablePay} onChange={e => setEditForm(p => ({ ...p, variablePay: e.target.value }))} />
                    <Input label="Date of Joining" type="date" value={editForm.dateOfJoining} onChange={e => setEditForm(p => ({ ...p, dateOfJoining: e.target.value }))} />
                    <Select label="Reporting Manager" className="col-span-2" value={editForm.reportingManagerId} onChange={e => setEditForm(p => ({ ...p, reportingManagerId: e.target.value }))}
                      options={managerOptions.map(m => ({ value: m.id, label: m.name }))} placeholder="Reporting Manager" />
                    <div className="flex items-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save'}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div><p className="text-xs text-text-secondary">Proposed Annual CTC</p><p className="text-text font-semibold">₹{Number(c.offeredCtc || 0).toLocaleString('en-IN')}</p></div>
                    <div><p className="text-xs text-text-secondary">Date of Joining</p><p className="text-text font-medium">{c.offeredDateOfJoining || '-'}</p></div>
                    <div><p className="text-xs text-text-secondary">Experience</p><p className="text-text font-medium">{c.experience}</p></div>
                    {(c.offeredJoiningBonus || c.offeredVariablePay) && (
                      <>
                        <div><p className="text-xs text-text-secondary">Joining Bonus</p><p className="text-text font-medium">₹{Number(c.offeredJoiningBonus || 0).toLocaleString('en-IN')}</p></div>
                        <div><p className="text-xs text-text-secondary">Variable Pay</p><p className="text-text font-medium">₹{Number(c.offeredVariablePay || 0).toLocaleString('en-IN')}</p></div>
                      </>
                    )}
                  </div>
                )}
                {breakup && (
                  <div className="mt-2 p-3 bg-surface-4/50 rounded-lg">
                    <p className="text-[10px] font-semibold text-text-secondary uppercase mb-1.5">Monthly Breakup</p>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                      {Object.entries(breakup).filter(([k]) => k !== 'ctc').map(([k, v]) => (
                        <div key={k} className="flex justify-between"><span className="text-text-secondary capitalize">{k.replace(/([A-Z])/g, ' $1')}</span><span className="text-text font-medium">₹{Number(v).toLocaleString('en-IN')}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {revisionsSent.length > 0 && (
        <Card title={`Sent Back for Revision (${revisionsSent.length})`}>
          <div className="space-y-2">
            {revisionsSent.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                <div className="flex items-center gap-3"><Avatar name={c.name} size="sm" /><div><p className="text-sm text-text">{c.name}</p><p className="text-xs text-text-secondary">{c.managerRemarks}</p></div></div>
                <Badge variant="warning">Awaiting recruiter</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!revisionCandidate} onClose={() => setRevisionCandidate(null)} title="Request Revision" size="sm">
        {revisionCandidate && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Tell the recruiter what needs to change for <span className="text-text font-medium">{revisionCandidate.name}</span>'s offer.</p>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. CTC is too high for this level, please revise to align with band" rows={4} />
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setRevisionCandidate(null)}>Cancel</Button><Button variant="danger" onClick={handleSendRevision} disabled={sendingRevision}>{sendingRevision ? 'Sending...' : 'Send Back to Recruiter'}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
