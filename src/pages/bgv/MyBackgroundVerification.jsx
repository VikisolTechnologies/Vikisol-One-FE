import { useState, useEffect } from 'react';
import { Clock, FileCheck2, ShieldCheck, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { getBackgroundChecks } from '../../api/bgv';
import { getMyProfile } from '../../api/employees';
import { downloadFile } from '../../api/client';

const STATUS_COLOR = { PENDING: 'default', SUBMITTED: 'info', IN_REVIEW: 'warning', APPROVED: 'success', REJECTED: 'danger' };
const CHECK_LABELS = { IDENTITY: 'Identity Verification', EDUCATION: 'Education Verification', EMPLOYMENT: 'Employment Verification', ADDRESS: 'Address Verification', REFERENCE: 'Reference Check', POLICE: 'Police Verification', DRUG_TEST: 'Drug Test', VISA: 'Visa Verification' };

// Timeline order the client asked for - our Status enum is a flatter 5 values (Pending/Submitted/
// In Review/Approved/Rejected) rather than a literal 9-stage pipeline per check type, so this
// shows the same overall stage the HR-facing BGV page uses rather than inventing separate stage
// data with no backing store. A genuine 9-stage-per-check pipeline would need a real schema change
// and is intentionally not faked here.
const STAGES = ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'APPROVED'];
const STAGE_LABELS = { PENDING: 'Documents Pending', SUBMITTED: 'Documents Submitted', IN_REVIEW: 'Under Review', APPROVED: 'Cleared' };

// Read-only, per the client's explicit role table (Employee: Read Only) - no edit/upload actions
// here, only visibility into where each check stands.
export default function MyBackgroundVerification() {
  const toast = useToast();
  const [checks, setChecks] = useState(null);

  useEffect(() => {
    getMyProfile()
      .then(profile => getBackgroundChecks(profile.id))
      .then(setChecks)
      .catch(() => { toast.error('Could not load your background verification status'); setChecks([]); });
  }, []);

  const overall = checks && checks.length
    ? (checks.some(c => c.status === 'REJECTED') ? 'REJECTED'
      : checks.every(c => c.status === 'APPROVED') ? 'APPROVED'
      : checks.some(c => c.status === 'IN_REVIEW' || c.status === 'SUBMITTED') ? 'IN_REVIEW'
      : 'PENDING')
    : null;

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Background Verification' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">Background Verification</h1>
        <p className="text-sm text-text-secondary">Status of your pre-employment verification checks.</p>
      </div>

      {checks === null && <Card><p className="text-sm text-text-secondary">Loading...</p></Card>}

      {checks && checks.length === 0 && (
        <Card>
          <EmptyState icon={ShieldCheck} title="No background verification on file" description="Your HR team will initiate background verification shortly after joining." />
        </Card>
      )}

      {checks && checks.length > 0 && (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-text">Overall Status</p>
              <Badge variant={STATUS_COLOR[overall]} dot>{STAGE_LABELS[overall] || overall}</Badge>
            </div>
            <div className="flex items-center gap-1">
              {STAGES.map((s, i) => {
                const reached = overall === 'REJECTED' ? s === 'PENDING' : STAGES.indexOf(overall) >= i;
                return (
                  <div key={s} className="flex-1 flex items-center gap-1">
                    <div className={`flex-1 h-1.5 rounded-full ${reached ? 'bg-primary' : 'bg-surface-3'}`} />
                    {i < STAGES.length - 1 && <span className="w-0" />}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5">
              {STAGES.map(s => <span key={s} className="text-[10px] text-text-secondary flex-1 text-center">{STAGE_LABELS[s]}</span>)}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {checks.map(c => (
              <Card key={c.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text">{CHECK_LABELS[c.checkType] || c.checkType}</span>
                  <Badge variant={STATUS_COLOR[c.status]} dot>{c.status.replace('_', ' ')}</Badge>
                </div>
                {c.remarks && <p className="text-xs text-text-secondary mb-2">{c.remarks}</p>}
                {c.reviewedByName && <p className="text-[10px] text-text-secondary">Last reviewed by {c.reviewedByName}{c.reviewedAt ? ` on ${new Date(c.reviewedAt).toLocaleDateString()}` : ''}</p>}
                {c.documentId && (
                  <button onClick={() => downloadFile(`/documents/${c.documentId}/download`)} className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">
                    <FileCheck2 size={12} /> View Submitted Document
                  </button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
