export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'employees', label: 'Employees', icon: 'Users' },
  { id: 'recruitment', label: 'Recruitment', icon: 'UserPlus' },
  { id: 'projects', label: 'Projects', icon: 'FolderKanban' },
  { id: 'resources', label: 'Resources', icon: 'GitBranch' },
  { id: 'timesheets', label: 'Timesheets', icon: 'Clock' },
  { id: 'leave', label: 'Leave', icon: 'CalendarDays' },
  { id: 'attendance', label: 'Attendance', icon: 'UserCheck' },
  { id: 'payroll', label: 'Payroll', icon: 'IndianRupee' },
  { id: 'tickets', label: 'Tickets', icon: 'Ticket' },
  { id: 'assets', label: 'Assets', icon: 'Monitor' },
  { id: 'performance', label: 'Performance', icon: 'TrendingUp' },
  { id: 'org-chart', label: 'Org Chart', icon: 'Network' },
  { id: 'reports', label: 'Reports', icon: 'BarChart3' },
  { id: 'documents', label: 'Documents', icon: 'FileText' },
];

export const ROLE_PERMISSIONS = {
  ceo: ['dashboard', 'employees', 'recruitment', 'job-postings', 'assessments', 'new-hires', 'background-verification', 'offboarding', 'hr-tasks', 'analytics', 'projects', 'resources', 'timesheets', 'leave', 'attendance', 'payroll', 'tickets', 'assets', 'performance', 'org-chart', 'reports', 'documents', 'communication', 'policies', 'company-branding', 'document-studio', 'company-integrations', 'settings', 'notifications'],
  hr_manager: ['dashboard', 'employees', 'recruitment', 'job-postings', 'assessments', 'new-hires', 'background-verification', 'offboarding', 'hr-tasks', 'analytics', 'projects', 'resources', 'timesheets', 'leave', 'attendance', 'payroll', 'tickets', 'assets', 'performance', 'org-chart', 'reports', 'documents', 'communication', 'policies', 'company-branding', 'document-studio', 'settings'],
  manager: ['dashboard', 'employees', 'new-hires', 'offboarding', 'projects', 'resources', 'timesheets', 'leave', 'attendance', 'tickets', 'performance', 'org-chart', 'reports', 'policies'],
  employee: ['dashboard', 'projects', 'timesheets', 'leave', 'attendance', 'payroll', 'tickets', 'performance', 'documents', 'offboarding', 'policies', 'my-background-verification'],
  recruiter: ['dashboard', 'recruitment', 'job-postings', 'assessments', 'reports', 'policies'],
  finance: ['dashboard', 'payroll', 'reports', 'policies'],
  admin: ['dashboard', 'employees', 'recruitment', 'job-postings', 'assessments', 'new-hires', 'background-verification', 'offboarding', 'hr-tasks', 'analytics', 'projects', 'resources', 'timesheets', 'leave', 'attendance', 'payroll', 'tickets', 'assets', 'performance', 'org-chart', 'reports', 'documents', 'communication', 'policies', 'company-branding', 'document-studio', 'company-integrations', 'settings'],
};

export const TIMESHEET_DATA = {
  week: '23 Jun - 29 Jun 2026',
  projects: [
    { name: 'Vikisol Website Redesign', task: 'UI Development', hours: [8, 8, 8, 8, 8, 4, 0], total: 44 },
    { name: 'Mobile App Development', task: 'API Integration', hours: [0, 0, 0, 0, 0, 4, 8], total: 12 },
    { name: 'Internal Project', task: 'Bug Fixing', hours: [0, 0, 0, 0, 0, 0, 0], total: 0 },
  ],
  totalHours: [8, 8, 8, 8, 8, 8, 8],
  grandTotal: 56,
};

export const DEPARTMENTS = ['Development', 'Design', 'QA & Testing', 'HR', 'Finance', 'Management', 'IT', 'Recruitment', 'DevOps', 'Data Science', 'Product', 'Marketing'];
