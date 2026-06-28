import { createContext, useContext, useCallback } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ui/Toast';

const ApprovalContext = createContext(null);

const HIERARCHY = {
  intern: ['team_lead', 'project_manager', 'hr_manager', 'ceo'],
  employee: ['team_lead', 'project_manager', 'hr_manager', 'ceo'],
  team_lead: ['project_manager', 'hr_manager', 'ceo'],
  project_manager: ['hr_manager', 'ceo'],
  manager: ['hr_manager', 'ceo'],
  hr: ['hr_manager', 'ceo'],
  hr_manager: ['ceo'],
  recruiter: ['hr_manager', 'ceo'],
  finance: ['ceo'],
  admin: ['ceo'],
  ceo: [],
};

function canApprove(approverRole, submitterRole) {
  const chain = HIERARCHY[submitterRole] || HIERARCHY.employee;
  return chain.includes(approverRole) || approverRole === 'ceo' || approverRole === 'hr_manager' || approverRole === 'admin';
}

function createApprovalEntry(user, action, reason = '') {
  return {
    id: Date.now() + Math.random(),
    action,
    by: user.name,
    byId: user.empId || user.id,
    designation: user.designation,
    role: user.role,
    timestamp: new Date().toISOString(),
    reason,
  };
}

export function ApprovalProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();

  const approve = useCallback((record, collection, updateFn, reason = '') => {
    const entry = createApprovalEntry(user, 'Approved', reason);
    const history = [...(record.approvalHistory || []), entry];
    updateFn(record.id, {
      status: 'Approved',
      approvedBy: user.name,
      approvedByDesignation: user.designation,
      approvedAt: entry.timestamp,
      approvalHistory: history,
      currentApprover: null,
    });
    toast.success(`Approved successfully`);
    return entry;
  }, [user, toast]);

  const reject = useCallback((record, collection, updateFn, reason = '') => {
    const entry = createApprovalEntry(user, 'Rejected', reason);
    const history = [...(record.approvalHistory || []), entry];
    updateFn(record.id, {
      status: 'Rejected',
      rejectedBy: user.name,
      rejectedByDesignation: user.designation,
      rejectedAt: entry.timestamp,
      rejectedReason: reason,
      approvalHistory: history,
      currentApprover: null,
    });
    toast.warning(`Rejected`);
    return entry;
  }, [user, toast]);

  const submit = useCallback((record, collection, updateFn) => {
    const entry = createApprovalEntry(user, 'Submitted');
    const history = [...(record.approvalHistory || []), entry];
    updateFn(record.id, {
      status: 'Pending',
      submittedBy: user.name,
      submittedAt: entry.timestamp,
      approvalHistory: history,
    });
    toast.success('Submitted for approval');
    return entry;
  }, [user, toast]);

  const override = useCallback((record, collection, updateFn, newStatus, reason = '') => {
    if (user.role !== 'ceo' && user.role !== 'hr_manager') {
      toast.error('Only CEO or HR Manager can override');
      return null;
    }
    const entry = createApprovalEntry(user, `Override: ${newStatus}`, reason);
    const history = [...(record.approvalHistory || []), entry];
    updateFn(record.id, {
      status: newStatus,
      overriddenBy: user.name,
      overriddenAt: entry.timestamp,
      approvalHistory: history,
    });
    toast.info(`Status overridden to ${newStatus}`);
    return entry;
  }, [user, toast]);

  const bulkApprove = useCallback((records, updateFn, reason = '') => {
    records.forEach(record => {
      const entry = createApprovalEntry(user, 'Approved', reason);
      const history = [...(record.approvalHistory || []), entry];
      updateFn(record.id, {
        status: 'Approved',
        approvedBy: user.name,
        approvedByDesignation: user.designation,
        approvedAt: entry.timestamp,
        approvalHistory: history,
      });
    });
    toast.success(`${records.length} items approved`);
  }, [user, toast]);

  const bulkReject = useCallback((records, updateFn, reason = '') => {
    records.forEach(record => {
      const entry = createApprovalEntry(user, 'Rejected', reason);
      const history = [...(record.approvalHistory || []), entry];
      updateFn(record.id, {
        status: 'Rejected',
        rejectedBy: user.name,
        rejectedReason: reason,
        approvalHistory: history,
      });
    });
    toast.warning(`${records.length} items rejected`);
  }, [user, toast]);

  const getApprovalTimeline = useCallback((record) => {
    return (record.approvalHistory || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, []);

  const isCEO = user?.role === 'ceo';
  const isHRManager = user?.role === 'hr_manager';
  const isManager = ['ceo', 'hr_manager', 'manager', 'admin'].includes(user?.role);

  return (
    <ApprovalContext.Provider value={{
      approve, reject, submit, override, bulkApprove, bulkReject,
      getApprovalTimeline, canApprove, createApprovalEntry,
      isCEO, isHRManager, isManager,
    }}>
      {children}
    </ApprovalContext.Provider>
  );
}

export const useApproval = () => useContext(ApprovalContext);
