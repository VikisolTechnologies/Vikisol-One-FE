import { api } from './client';

// Every document type the Document Studio engine can generate, with the extra fields (beyond
// the auto-resolved Employee ones) each type needs. Adding a type here is the only frontend
// change needed - the backend already supports any Document.DocumentType with a published
// template via the generic /documents/generate endpoint.
export const DOCUMENT_TYPES = [
  { value: 'OFFER_LETTER', label: 'Offer Letter', fields: [] },
  { value: 'APPOINTMENT_LETTER', label: 'Appointment Letter', fields: [] },
  { value: 'JOINING_LETTER', label: 'Joining Letter', fields: [] },
  { value: 'EXPERIENCE_LETTER', label: 'Experience Letter', fields: [{ key: 'LastWorkingDate', label: 'Last Working Date', type: 'date' }] },
  { value: 'RELIEVING_LETTER', label: 'Relieving Letter', fields: [{ key: 'LastWorkingDate', label: 'Last Working Date', type: 'date' }] },
  { value: 'SALARY_CERTIFICATE', label: 'Salary Certificate', fields: [{ key: 'MonthlyGross', label: 'Monthly Gross Salary' }, { key: 'AnnualCTC', label: 'Annual CTC' }] },
  { value: 'CONFIRMATION_LETTER', label: 'Confirmation Letter', fields: [] },
  { value: 'PROMOTION_LETTER', label: 'Promotion Letter', fields: [{ key: 'NewDesignation', label: 'New Designation' }, { key: 'EffectiveDate', label: 'Effective Date', type: 'date' }] },
  { value: 'SALARY_REVISION_LETTER', label: 'Salary Revision Letter', fields: [{ key: 'OldSalary', label: 'Previous Annual CTC' }, { key: 'NewSalary', label: 'Revised Annual CTC' }, { key: 'EffectiveDate', label: 'Effective Date', type: 'date' }] },
  { value: 'RESIGNATION_ACCEPTANCE_LETTER', label: 'Resignation Acceptance Letter', fields: [{ key: 'ResignationDate', label: 'Resignation Date', type: 'date' }, { key: 'LastWorkingDate', label: 'Last Working Date', type: 'date' }] },
  { value: 'TERMINATION_LETTER', label: 'Termination Letter', fields: [{ key: 'TerminationDate', label: 'Termination Date', type: 'date' }, { key: 'Reason', label: 'Reason' }] },
  { value: 'WARNING_LETTER', label: 'Warning Letter', fields: [{ key: 'Reason', label: 'Reason for Warning' }] },
  { value: 'INTERNSHIP_LETTER', label: 'Internship Letter', fields: [{ key: 'InternshipDuration', label: 'Internship Duration (e.g. 6 months)' }] },
  { value: 'CONTRACT_LETTER', label: 'Contract Letter', fields: [{ key: 'ContractDuration', label: 'Contract Duration (e.g. 1 year)' }] },
  { value: 'LEAVE_APPROVAL_LETTER', label: 'Leave Approval Letter', fields: [{ key: 'LeaveType', label: 'Leave Type' }, { key: 'LeaveStartDate', label: 'From', type: 'date' }, { key: 'LeaveEndDate', label: 'To', type: 'date' }] },
  { value: 'LEAVE_REJECTION_LETTER', label: 'Leave Rejection Letter', fields: [{ key: 'LeaveType', label: 'Leave Type' }, { key: 'LeaveStartDate', label: 'From', type: 'date' }, { key: 'LeaveEndDate', label: 'To', type: 'date' }, { key: 'Reason', label: 'Reason' }] },
  { value: 'EMPLOYMENT_VERIFICATION_LETTER', label: 'Employment Verification Letter', fields: [] },
];

export async function generateDocument({ documentType, employeeId, templateId, fields }) {
  return api.post('/documents/generate', { documentType, employeeId, templateId, fields });
}
