export const USERS = [
  { id: 1, email: 'syam@vikisol.in', password: 'ceo123', name: 'Syam Prabhakar Seeli', role: 'ceo', avatar: 'SP', designation: 'Founder & CEO', department: 'Management', empId: 'VKS001' },
  { id: 2, email: 'hr@vikisol.in', password: 'hr123', name: 'Priya Sharma', role: 'hr_manager', avatar: 'PS', designation: 'HR Manager', department: 'Human Resources', empId: 'VKS002' },
  { id: 3, email: 'rohit@vikisol.in', password: 'mgr123', name: 'Rohit Sharma', role: 'manager', avatar: 'RS', designation: 'Engineering Manager', department: 'Development', empId: 'VKS003' },
  { id: 4, email: 'aarav@vikisol.in', password: 'emp123', name: 'Aarav Patel', role: 'employee', avatar: 'AP', designation: 'Senior React Developer', department: 'Development', empId: 'VKS101' },
  { id: 5, email: 'neha@vikisol.in', password: 'emp123', name: 'Neha Joshi', role: 'employee', avatar: 'NJ', designation: 'UX/UI Designer', department: 'Design', empId: 'VKS102' },
  { id: 6, email: 'recruiter@vikisol.in', password: 'rec123', name: 'Sneha Reddy', role: 'recruiter', avatar: 'SR', designation: 'Senior Recruiter', department: 'Recruitment', empId: 'VKS010' },
  { id: 7, email: 'finance@vikisol.in', password: 'fin123', name: 'Amit Kumar', role: 'finance', avatar: 'AK', designation: 'Finance Lead', department: 'Finance', empId: 'VKS020' },
  { id: 8, email: 'admin@vikisol.in', password: 'admin123', name: 'Vikram Singh', role: 'admin', avatar: 'VS', designation: 'System Administrator', department: 'IT', empId: 'VKS030' },
];

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
  ceo: ['dashboard', 'employees', 'recruitment', 'new-hires', 'projects', 'resources', 'timesheets', 'leave', 'attendance', 'payroll', 'tickets', 'assets', 'performance', 'org-chart', 'reports', 'documents', 'company-branding', 'document-studio', 'settings', 'notifications'],
  hr_manager: ['dashboard', 'employees', 'recruitment', 'new-hires', 'projects', 'resources', 'timesheets', 'leave', 'attendance', 'payroll', 'tickets', 'assets', 'performance', 'org-chart', 'reports', 'documents', 'company-branding', 'document-studio', 'settings'],
  manager: ['dashboard', 'employees', 'new-hires', 'projects', 'resources', 'timesheets', 'leave', 'attendance', 'tickets', 'performance', 'org-chart', 'reports'],
  employee: ['dashboard', 'projects', 'timesheets', 'leave', 'attendance', 'payroll', 'tickets', 'performance', 'documents'],
  recruiter: ['dashboard', 'recruitment', 'reports'],
  finance: ['dashboard', 'payroll', 'reports'],
  admin: ['dashboard', 'employees', 'recruitment', 'new-hires', 'projects', 'resources', 'timesheets', 'leave', 'attendance', 'payroll', 'tickets', 'assets', 'performance', 'org-chart', 'reports', 'documents', 'company-branding', 'document-studio', 'settings'],
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
