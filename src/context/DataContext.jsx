import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { generateEmployees, generateLeaveRequests, generateTimesheets, generateTickets, generateCandidates, generateProjects, generateAssets, generatePayslips, generateDocuments, generateAnnouncements, generateNotifications, generateHolidays } from '../data/generator';
import * as employeesApi from '../api/employees';
import { getAllDepartments, createDepartment, updateDepartment, deleteDepartment } from '../api/departments';
import { getAllDesignations, createDesignation, updateDesignation, deleteDesignation } from '../api/designations';
import * as leaveApi from '../api/leave';
import * as attendanceApi from '../api/attendance';
import * as ticketsApi from '../api/tickets';
import * as assetsApi from '../api/assets';
import * as payrollApi from '../api/payroll';
import * as projectsApi from '../api/projects';
import * as timesheetsApi from '../api/timesheets';
import * as documentsApi from '../api/documents';
import * as settingsApi from '../api/settings';
import * as notificationsApi from '../api/notifications';
import * as recruitmentApi from '../api/recruitment';
import * as announcementsApi from '../api/announcements';
import * as auditLogsApi from '../api/auditLogs';
import { useAuth } from './AuthContext';
import { logError } from '../utils/logger';

const DataContext = createContext(null);

function initData() {
  const employees = generateEmployees(250);
  return {
    employees,
    leaveRequests: generateLeaveRequests(employees, 150),
    timesheets: generateTimesheets(employees, 300),
    tickets: generateTickets(employees, 500),
    candidates: generateCandidates(100),
    projects: generateProjects(50),
    assets: generateAssets(200),
    payslips: generatePayslips(employees),
    documents: generateDocuments(100),
    announcements: generateAnnouncements(),
    notifications: generateNotifications(),
    holidays: generateHolidays(),
    departments: ['Development','QA & Testing','Design','HR','Finance','DevOps','Data Science','Product','Marketing','IT','Management','Recruitment'],
    designations: ['Junior Developer','Developer','Senior Developer','Lead Developer','Manager','Director','VP','Architect','Engineer','Analyst','Executive','Coordinator'],
    auditLogs: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      action: ['Created employee','Updated leave request','Approved timesheet','Deleted ticket','Generated payslip','Updated project','Assigned asset','Modified role'][i % 8],
      user: ['Syam Prabhakar Seeli','Priya Sharma','Rohit Sharma','Admin'][i % 4],
      target: `Record #${i + 100}`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      ip: `192.168.1.${(i % 254) + 1}`,
    })),
  };
}

export function DataProvider({ children }) {
  const [data, setData] = useState(() => initData());
  const [employeesSource, setEmployeesSource] = useState('mock'); // 'mock' | 'live'
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [lookups, setLookups] = useState({ departments: [], designations: [] });
  const [leaveRequestsSource, setLeaveRequestsSource] = useState('mock'); // 'mock' | 'live'
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [attendanceSource, setAttendanceSource] = useState('mock'); // 'mock' | 'live'
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [ticketsSource, setTicketsSource] = useState('mock'); // 'mock' | 'live'
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [assetsSource, setAssetsSource] = useState('mock'); // 'mock' | 'live'
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState(null);
  const [payslipsSource, setPayslipsSource] = useState('mock'); // 'mock' | 'live'
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [projectsSource, setProjectsSource] = useState('mock'); // 'mock' | 'live'
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [timesheetsSource, setTimesheetsSource] = useState('mock'); // 'mock' | 'live'
  const [timesheetsLoading, setTimesheetsLoading] = useState(false);
  const [timesheetsError, setTimesheetsError] = useState(null);
  const [holidaysSource, setHolidaysSource] = useState('mock'); // 'mock' | 'live'
  const [announcementsSource, setAnnouncementsSource] = useState('mock');
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [auditLogsSource, setAuditLogsSource] = useState('mock');
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState(null);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [notificationsSource, setNotificationsSource] = useState('mock'); // 'mock' | 'live'
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [candidatesSource, setCandidatesSource] = useState('mock'); // 'mock' | 'live'
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [jobPostings, setJobPostings] = useState([]);
  const [documentsSource, setDocumentsSource] = useState('mock'); // 'mock' | 'live'
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState(null);
  const [visibleModules, setVisibleModules] = useState(null); // null = not loaded yet, fall back to mock ROLE_PERMISSIONS
  const { isAuthenticated, user } = useAuth() || {};
  const isPayrollAdmin = ['hr_manager', 'finance', 'ceo', 'admin'].includes(user?.role);

  // Lazy-load registry: assets/timesheets/documents/auditLogs are only fetched once a page that
  // actually needs them calls ensureLoad(domain) (see the effects below, each gated on
  // `requested.<domain>`) - instead of every domain being fetched eagerly at app boot regardless
  // of route. Other domains (employees, tickets, candidates, etc.) stay eager for now because
  // they're read by the always-mounted Topbar (global search) or multiple dashboards on first
  // paint - converting those safely needs decoupling global search from a preloaded in-memory
  // array first (a separate, larger change - see the Phase 3 report for why this wasn't done here).
  const [requested, setRequested] = useState({});
  const ensureLoad = useCallback((domain) => {
    setRequested(prev => (prev[domain] ? prev : { ...prev, [domain]: true }));
  }, []);
  // Bumping a retryToken re-runs the corresponding effect even if `requested` is already true -
  // used by the "Retry" button on an error state.
  const [retryTokens, setRetryTokens] = useState({});
  const retryLoad = useCallback((domain) => {
    setRetryTokens(prev => ({ ...prev, [domain]: (prev[domain] || 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { setVisibleModules(null); return; }
    settingsApi.getMyVisibleModules().then(setVisibleModules).catch(() => setVisibleModules(null));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Department/designation lookups are independently permissioned (any authenticated role can
    // read them) so they're fetched on their own - previously they were bundled into the same
    // Promise.all as the employees list, which meant any role that can't list all employees
    // (e.g. RECRUITER) silently never got lookups.departments/designations populated, even though
    // those two calls would have succeeded on their own. That left dropdowns like the recruitment
    // offer form's Designation/Department selects empty for recruiters.
    Promise.all([getAllDepartments().catch(() => []), getAllDesignations().catch(() => [])])
      .then(([departments, designations]) => setLookups({ departments, designations }));

    setEmployeesLoading(true);
    employeesApi.getAllEmployees({ size: 500 })
      .then((empResult) => {
        setData(prev => ({ ...prev, employees: empResult.items }));
        setEmployeesSource('live');
      })
      .catch(() => {
        // Current role can't list all employees (e.g. plain EMPLOYEE or RECRUITER) - keep mock data for this module
        setEmployeesSource('mock');
      })
      .finally(() => setEmployeesLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Leave types are needed to apply for leave at all, and are open to every authenticated role -
    // fetch them independently so a failure fetching the request lists below (e.g. transient error)
    // can never silently leave the Apply Leave form without real leave-type IDs to submit.
    const year = new Date().getFullYear();
    leaveApi.getLeaveTypes().then(setLeaveTypes).catch(() => setLeaveTypes([]));
    leaveApi.getMyBalances(year).then(setLeaveBalances).catch(() => setLeaveBalances([]));

    setLeaveRequestsLoading(true);
    // Try the broadest views first (team/pending), fall back to own requests only, then to mock.
    Promise.all([
      leaveApi.getMyLeaveRequests({ size: 200 }),
      leaveApi.getTeamLeaveRequests({ size: 200 }).catch(() => null),
      leaveApi.getPendingApprovals({ size: 200 }).catch(() => null),
    ])
      .then(([mine, team, pending]) => {
        const byId = new Map();
        (mine.items || []).forEach(l => byId.set(l.id, l));
        (team?.items || []).forEach(l => byId.set(l.id, l));
        (pending?.items || []).forEach(l => byId.set(l.id, l));
        setData(prev => ({ ...prev, leaveRequests: Array.from(byId.values()) }));
        setLeaveRequestsSource('live');
      })
      .catch(() => {
        // Plain employee or other role lacking permission for any leave endpoint - keep mock data
        setLeaveRequestsSource('mock');
      })
      .finally(() => setLeaveRequestsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setAttendanceLoading(true);
    attendanceApi.getTodayAttendance()
      .then((today) => {
        setTodayAttendance(today);
        setAttendanceSource('live');
      })
      .catch(() => {
        setAttendanceSource('mock');
      })
      .finally(() => setAttendanceLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setTicketsLoading(true);
    // Try the broadest view (admin/HR "all tickets") first, fall back to own tickets only, then to mock.
    ticketsApi.getAllTickets({ size: 500 })
      .catch(() => ticketsApi.getMyTickets({ size: 500 }))
      .then((result) => {
        setData(prev => ({ ...prev, tickets: result.items }));
        setTicketsSource('live');
      })
      .catch(() => {
        // Current role can't access any ticket endpoint - keep mock data for this module
        setTicketsSource('mock');
      })
      .finally(() => setTicketsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !requested.assets) return;
    setAssetsLoading(true);
    setAssetsError(null);
    assetsApi.getAllAssets({ size: 500 })
      .catch(() => assetsApi.getAvailableAssets().then(items => ({ items })))
      .then((result) => {
        setData(prev => ({ ...prev, assets: result.items }));
        setAssetsSource('live');
      })
      .catch((err) => {
        // Current role can't access any asset endpoint, or a real network/server error - keep
        // mock data for display but surface the error so the page can show a retry option
        // instead of silently looking like intentional demo mode.
        setAssetsSource('mock');
        setAssetsError(err?.message || 'Failed to load assets');
        logError('assets.load', err);
      })
      .finally(() => setAssetsLoading(false));
  }, [isAuthenticated, requested.assets, retryTokens.assets]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setPayslipsLoading(true);
    // HR/Finance/CEO/Admin see every employee's payslips (the real payroll register); a plain
    // employee only ever sees their own. Previously every role used getMyPayslips, so the admin
    // Payroll page silently only ever showed the logged-in user's own payslips.
    const fetchPayslips = isPayrollAdmin ? payrollApi.getAllPayslips({ size: 500 }) : payrollApi.getMyPayslips({ size: 500 });
    fetchPayslips
      .then((result) => {
        setData(prev => ({ ...prev, payslips: result.items }));
        setPayslipsSource('live');
      })
      .catch(() => {
        // Live payslip endpoint unavailable (role restriction or backend error) - keep mock data
        setPayslipsSource('mock');
      })
      .finally(() => setPayslipsLoading(false));
  }, [isAuthenticated, isPayrollAdmin]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setProjectsLoading(true);
    // Try the broadest view (manager/HR/CEO "all projects") first, fall back to own projects only, then to mock.
    projectsApi.getAllProjects({ size: 500 })
      .catch(() => projectsApi.getMyProjects().then(items => ({ items })))
      .then((result) => {
        setData(prev => ({ ...prev, projects: result.items }));
        setProjectsSource('live');
      })
      .catch(() => {
        // Current role can't access any project endpoint - keep mock data for this module
        setProjectsSource('mock');
      })
      .finally(() => setProjectsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !requested.timesheets) return;
    setTimesheetsLoading(true);
    setTimesheetsError(null);
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    // Try the broadest view (manager/HR/CEO "team") first, fall back to own entries only, then to mock.
    timesheetsApi.getTeamEntries(startStr, endStr)
      .catch(() => timesheetsApi.getMyEntries(startStr, endStr))
      .then((items) => {
        setData(prev => ({ ...prev, timesheets: items }));
        setTimesheetsSource('live');
      })
      .catch((err) => {
        // Current role can't access any timesheet endpoint, or a real error - keep mock data for
        // display but surface it so the page can offer a retry instead of looking like demo mode.
        setTimesheetsSource('mock');
        setTimesheetsError(err?.message || 'Failed to load timesheets');
        logError('timesheets.load', err);
      })
      .finally(() => setTimesheetsLoading(false));
  }, [isAuthenticated, requested.timesheets, retryTokens.timesheets]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setHolidaysLoading(true);
    const year = new Date().getFullYear();
    settingsApi.getHolidays(year)
      .then((items) => {
        setData(prev => ({ ...prev, holidays: items }));
        setHolidaysSource('live');
      })
      .catch(() => {
        // Holidays endpoint unavailable - keep mock data for this module
        setHolidaysSource('mock');
      })
      .finally(() => setHolidaysLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setAnnouncementsLoading(true);
    announcementsApi.getAllAnnouncements()
      .then((items) => {
        setData(prev => ({ ...prev, announcements: items }));
        setAnnouncementsSource('live');
      })
      .catch(() => setAnnouncementsSource('mock'))
      .finally(() => setAnnouncementsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !requested.auditLogs) return;
    // Only CEO/ADMIN can call this - other roles will 403 and silently keep the mock/empty view,
    // which is fine since they can't see the Audit Logs tab in the UI anyway.
    setAuditLogsLoading(true);
    setAuditLogsError(null);
    auditLogsApi.getAuditLogs({ size: 200 })
      .then((result) => {
        setData(prev => ({ ...prev, auditLogs: result.items }));
        setAuditLogsSource('live');
      })
      .catch((err) => {
        setAuditLogsSource('mock');
        // A 403 here is expected/normal for non-CEO/Admin roles - only surface a retry-able error
        // for genuine failures (network/5xx), not authorization rejections.
        if (err?.status !== 403) {
          setAuditLogsError(err?.message || 'Failed to load audit logs');
          logError('auditLogs.load', err);
        }
      })
      .finally(() => setAuditLogsLoading(false));
  }, [isAuthenticated, requested.auditLogs, retryTokens.auditLogs]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setNotificationsLoading(true);
    Promise.all([
      notificationsApi.getMyNotifications({ size: 200 }),
      notificationsApi.getUnreadCount().catch(() => null),
    ])
      .then(([result, count]) => {
        setData(prev => ({ ...prev, notifications: result.items }));
        if (typeof count === 'number') setUnreadCount(count);
        setNotificationsSource('live');
      })
      .catch(() => {
        // Notifications endpoint unavailable - keep mock data for this module
        setNotificationsSource('mock');
      })
      .finally(() => setNotificationsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setCandidatesLoading(true);
    Promise.all([
      recruitmentApi.getAllCandidates({ size: 200 }),
      recruitmentApi.getAllJobPostings({ size: 200 }).catch(() => ({ items: [] })),
    ])
      .then(([candResult, jobResult]) => {
        setData(prev => ({ ...prev, candidates: candResult.items }));
        setJobPostings(jobResult.items);
        setCandidatesSource('live');
      })
      .catch(() => {
        // Current role can't access recruitment endpoints - keep mock data for this module
        setCandidatesSource('mock');
      })
      .finally(() => setCandidatesLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !requested.documents) return;
    setDocumentsLoading(true);
    setDocumentsError(null);
    documentsApi.getUnverifiedDocuments()
      .catch(() => documentsApi.getMyDocuments())
      .then((docs) => {
        setData(prev => ({ ...prev, documents: docs }));
        setDocumentsSource('live');
      })
      .catch((err) => {
        setDocumentsSource('mock');
        setDocumentsError(err?.message || 'Failed to load documents');
        logError('documents.load', err);
      })
      .finally(() => setDocumentsLoading(false));
  }, [isAuthenticated, requested.documents, retryTokens.documents]);

  const crud = useCallback((collection) => ({
    getAll: () => data[collection],
    getById: (id) => data[collection].find(item => item.id === id),
    create: (item) => {
      const newItem = { ...item, id: Date.now() + Math.random() };
      setData(prev => ({ ...prev, [collection]: [newItem, ...prev[collection]] }));
      return newItem;
    },
    update: (id, updates) => {
      setData(prev => ({
        ...prev,
        [collection]: prev[collection].map(item => item.id === id ? { ...item, ...updates } : item),
      }));
    },
    remove: (id) => {
      setData(prev => ({ ...prev, [collection]: prev[collection].filter(item => item.id !== id) }));
    },
    bulkUpdate: (ids, updates) => {
      setData(prev => ({
        ...prev,
        [collection]: prev[collection].map(item => ids.includes(item.id) ? { ...item, ...updates } : item),
      }));
    },
    bulkRemove: (ids) => {
      setData(prev => ({ ...prev, [collection]: prev[collection].filter(item => !ids.includes(item.id)) }));
    },
  }), [data]);

  const mockEmployeeCrud = useMemo(() => crud('employees'), [crud]);

  const employees = useMemo(() => {
    if (employeesSource !== 'live') return mockEmployeeCrud;
    return {
      getAll: () => data.employees,
      getById: (id) => data.employees.find(e => e.id === id),
      create: async (form) => {
        const created = await employeesApi.createEmployee(form);
        setData(prev => ({ ...prev, employees: [created, ...prev.employees] }));
        return created;
      },
      update: async (id, form) => {
        const merged = { ...data.employees.find(e => e.id === id), ...form };
        const updated = await employeesApi.updateEmployee(id, merged);
        setData(prev => ({ ...prev, employees: prev.employees.map(e => e.id === id ? updated : e) }));
        return updated;
      },
      remove: async (id) => {
        await employeesApi.deactivateEmployee(id);
        setData(prev => ({ ...prev, employees: prev.employees.filter(e => e.id !== id) }));
      },
      issueHike: async (id, offer) => {
        const updated = await employeesApi.issueHike(id, offer);
        setData(prev => ({ ...prev, employees: prev.employees.map(e => e.id === id ? updated : e) }));
        return updated;
      },
      resign: async (id, offer) => {
        const updated = await employeesApi.recordResignation(id, offer);
        setData(prev => ({ ...prev, employees: prev.employees.map(e => e.id === id ? updated : e) }));
        return updated;
      },
    };
  }, [employeesSource, mockEmployeeCrud, data.employees]);
  const mockLeaveRequestsCrud = useMemo(() => crud('leaveRequests'), [crud]);

  const updateLeaveRequestLive = useCallback(async (id, updates) => {
    // Approval/rejection/cancellation flows go through dedicated endpoints rather than a generic PATCH.
    let updated;
    if (updates.status === 'Approved') {
      updated = await leaveApi.processLeaveAction(id, 'APPROVE', updates.reason || '');
    } else if (updates.status === 'Rejected') {
      updated = await leaveApi.processLeaveAction(id, 'REJECT', updates.rejectedReason || updates.reason || '');
    } else if (updates.status === 'Cancelled') {
      await leaveApi.cancelLeave(id);
      updated = { ...data.leaveRequests.find(l => l.id === id), ...updates };
    } else {
      updated = { ...data.leaveRequests.find(l => l.id === id), ...updates };
    }
    setData(prev => ({ ...prev, leaveRequests: prev.leaveRequests.map(l => l.id === id ? updated : l) }));
    return updated;
  }, [data.leaveRequests]);

  const leaveRequests = useMemo(() => {
    if (leaveRequestsSource !== 'live') return mockLeaveRequestsCrud;
    return {
      getAll: () => data.leaveRequests,
      getById: (id) => data.leaveRequests.find(l => l.id === id),
      create: async (form) => {
        const created = await leaveApi.applyLeave(form);
        setData(prev => ({ ...prev, leaveRequests: [created, ...prev.leaveRequests] }));
        return created;
      },
      update: updateLeaveRequestLive,
      bulkUpdate: async (ids, updates) => {
        await Promise.all(ids.map(id => updateLeaveRequestLive(id, updates)));
      },
    };
  }, [leaveRequestsSource, mockLeaveRequestsCrud, data.leaveRequests, updateLeaveRequestLive]);
  const mockTimesheetsCrud = useMemo(() => crud('timesheets'), [crud]);

  const updateTimesheetLive = useCallback(async (id, updates) => {
    // Approval/rejection flows go through the dedicated action endpoint rather than a generic PATCH.
    let updated;
    if (updates.status === 'Approved') {
      updated = await timesheetsApi.approveEntry(id);
    } else if (updates.status === 'Rejected') {
      updated = await timesheetsApi.rejectEntry(id);
    } else {
      const merged = { ...data.timesheets.find(t => t.id === id), ...updates };
      updated = await timesheetsApi.updateEntry(id, {
        projectId: merged.projectId,
        taskId: merged.taskId,
        date: merged.date,
        hours: merged.total ?? (Array.isArray(merged.hours) ? merged.hours[0] : merged.hours),
        description: merged.description,
        checkInTime: merged.checkInTime,
        checkOutTime: merged.checkOutTime,
        reason: merged.reason,
        workLocation: merged.workLocation,
      });
    }
    setData(prev => ({ ...prev, timesheets: prev.timesheets.map(t => t.id === id ? updated : t) }));
    return updated;
  }, [data.timesheets]);

  const timesheets = useMemo(() => {
    if (timesheetsSource !== 'live') return mockTimesheetsCrud;
    return {
      getAll: () => data.timesheets,
      getById: (id) => data.timesheets.find(t => t.id === id),
      create: async (form) => {
        const created = await timesheetsApi.createEntry(form);
        setData(prev => ({ ...prev, timesheets: [created, ...prev.timesheets] }));
        return created;
      },
      update: updateTimesheetLive,
      bulkUpdate: async (ids, updates) => {
        await Promise.all(ids.map(id => updateTimesheetLive(id, updates)));
      },
      remove: async (id) => {
        // Backend has no delete-entry endpoint; remove locally only.
        setData(prev => ({ ...prev, timesheets: prev.timesheets.filter(t => t.id !== id) }));
      },
      submit: async (ids) => {
        await timesheetsApi.submitEntries(ids);
        setData(prev => ({ ...prev, timesheets: prev.timesheets.map(t => ids.includes(t.id) ? { ...t, status: 'Submitted' } : t) }));
      },
    };
  }, [timesheetsSource, mockTimesheetsCrud, data.timesheets, updateTimesheetLive]);
  const mockTicketsCrud = useMemo(() => crud('tickets'), [crud]);

  const tickets = useMemo(() => {
    if (ticketsSource !== 'live') return mockTicketsCrud;
    return {
      getAll: () => data.tickets,
      getById: (id) => data.tickets.find(t => t.id === id),
      create: async (form) => {
        const created = await ticketsApi.raiseTicket(form);
        setData(prev => ({ ...prev, tickets: [created, ...prev.tickets] }));
        return created;
      },
      update: async (id, updates) => {
        let updated;
        if (updates.status) {
          updated = await ticketsApi.updateTicketStatus(id, updates.status, updates.resolution || updates.comments);
        } else if (updates.assignedToId) {
          updated = await ticketsApi.assignTicket(id, updates.assignedToId);
        } else {
          updated = { ...data.tickets.find(t => t.id === id), ...updates };
        }
        setData(prev => ({ ...prev, tickets: prev.tickets.map(t => t.id === id ? updated : t) }));
        return updated;
      },
      remove: async (id) => {
        // Backend has no delete-ticket endpoint; remove locally only.
        setData(prev => ({ ...prev, tickets: prev.tickets.filter(t => t.id !== id) }));
      },
      addComment: async (id, comment) => {
        const created = await ticketsApi.addTicketComment(id, comment);
        setData(prev => ({
          ...prev,
          tickets: prev.tickets.map(t => t.id === id ? { ...t, comments: (t.comments || 0) + 1, commentList: [...(t.commentList || []), created] } : t),
        }));
        return created;
      },
    };
  }, [ticketsSource, mockTicketsCrud, data.tickets]);
  const mockCandidatesCrud = useMemo(() => crud('candidates'), [crud]);

  const candidates = useMemo(() => {
    if (candidatesSource !== 'live') return mockCandidatesCrud;
    return {
      getAll: () => data.candidates,
      getById: (id) => data.candidates.find(c => c.id === id),
      create: async (form) => {
        const created = await recruitmentApi.createCandidate(form);
        setData(prev => ({ ...prev, candidates: [created, ...prev.candidates] }));
        return created;
      },
      update: async (id, updates) => {
        // Stage-only changes go through the dedicated status endpoint; otherwise do a full update.
        const existing = data.candidates.find(c => c.id === id);
        const merged = { ...existing, ...updates };
        let updated;
        if (updates.stage && Object.keys(updates).every(k => k === 'stage' || k === 'status')) {
          updated = await recruitmentApi.updateCandidateStatus(id, updates.stage);
        } else {
          updated = await recruitmentApi.updateCandidate(id, merged);
        }
        setData(prev => ({ ...prev, candidates: prev.candidates.map(c => c.id === id ? updated : c) }));
        return updated;
      },
      remove: async (id) => {
        await recruitmentApi.deleteCandidate(id);
        setData(prev => ({ ...prev, candidates: prev.candidates.filter(c => c.id !== id) }));
      },
      proposeSelection: async (id, offer) => {
        const updated = await recruitmentApi.proposeSelection(id, offer);
        setData(prev => ({ ...prev, candidates: prev.candidates.map(c => c.id === id ? updated : c) }));
        return updated;
      },
      approveSelection: async (id) => {
        const result = await recruitmentApi.approveSelection(id);
        const refreshed = await recruitmentApi.getCandidate(id);
        setData(prev => ({ ...prev, candidates: prev.candidates.map(c => c.id === id ? refreshed : c) }));
        return result;
      },
      requestRevision: async (id, remarks) => {
        const updated = await recruitmentApi.requestRevision(id, remarks);
        setData(prev => ({ ...prev, candidates: prev.candidates.map(c => c.id === id ? updated : c) }));
        return updated;
      },
      claim: async (id) => {
        const updated = await recruitmentApi.selfAssignCandidate(id);
        setData(prev => ({ ...prev, candidates: prev.candidates.map(c => c.id === id ? updated : c) }));
        return updated;
      },
    };
  }, [candidatesSource, mockCandidatesCrud, data.candidates]);
  const mockProjectsCrud = useMemo(() => crud('projects'), [crud]);

  const projects = useMemo(() => {
    if (projectsSource !== 'live') return mockProjectsCrud;
    return {
      getAll: () => data.projects,
      getById: (id) => data.projects.find(p => p.id === id),
      create: async (form) => {
        const created = await projectsApi.createProject(form);
        setData(prev => ({ ...prev, projects: [created, ...prev.projects] }));
        return created;
      },
      update: async (id, updates) => {
        const merged = { ...data.projects.find(p => p.id === id), ...updates };
        const updated = await projectsApi.updateProject(id, merged);
        setData(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? updated : p) }));
        return updated;
      },
      remove: async (id) => {
        await projectsApi.deleteProject(id);
        setData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
      },
    };
  }, [projectsSource, mockProjectsCrud, data.projects]);
  const mockAssetsCrud = useMemo(() => crud('assets'), [crud]);

  const assets = useMemo(() => {
    if (assetsSource !== 'live') return mockAssetsCrud;
    return {
      getAll: () => data.assets,
      getById: (id) => data.assets.find(a => a.id === id),
      create: async (form) => {
        const created = await assetsApi.createAsset(form);
        setData(prev => ({ ...prev, assets: [created, ...prev.assets] }));
        return created;
      },
      update: async (id, updates) => {
        const existing = data.assets.find(a => a.id === id);
        let updated;
        if (updates.status === 'Assigned' && updates.assignedToId) {
          await assetsApi.assignAsset(id, updates.assignedToId, updates.remarks);
          updated = { ...existing, ...updates };
        } else if (updates.status === 'Available' && existing?.status === 'Assigned') {
          await assetsApi.returnAsset(id, updates.condition || existing.condition, updates.remarks);
          updated = { ...existing, ...updates };
        } else {
          updated = await assetsApi.updateAsset(id, { ...existing, ...updates });
        }
        setData(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? updated : a) }));
        return updated;
      },
      remove: async (id) => {
        await assetsApi.deleteAsset(id);
        setData(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
      },
    };
  }, [assetsSource, mockAssetsCrud, data.assets]);
  const mockPayslipsCrud = useMemo(() => crud('payslips'), [crud]);

  const payslips = useMemo(() => {
    if (payslipsSource !== 'live') return mockPayslipsCrud;
    return {
      getAll: () => data.payslips,
      getById: (id) => data.payslips.find(p => p.id === id),
      create: async ({ month, year }) => {
        // "Run Payroll" maps to POST /payroll/run for the live module; refresh the payslip list after.
        const summary = await payrollApi.runPayroll(month, year);
        try {
          // Same admin-vs-self distinction as the initial load above - refreshing with
          // getMyPayslips after a bulk run overwrote the whole list with just the caller's own
          // one payslip, even though the backend had genuinely just created one per employee.
          const result = isPayrollAdmin ? await payrollApi.getAllPayslips({ size: 500 }) : await payrollApi.getMyPayslips({ size: 500 });
          setData(prev => ({ ...prev, payslips: result.items }));
        } catch {
          // ignore refresh failure; summary is still returned
        }
        return summary;
      },
      update: () => { throw new Error('Direct payslip edits are not supported; use approve/mark-paid actions'); },
      remove: () => { throw new Error('Payslips cannot be deleted'); },
    };
  }, [payslipsSource, mockPayslipsCrud, data.payslips, isPayrollAdmin]);
  const mockDocumentsCrud = useMemo(() => crud('documents'), [crud]);

  const documents = useMemo(() => {
    if (documentsSource !== 'live') return mockDocumentsCrud;
    return {
      getAll: () => data.documents,
      getById: (id) => data.documents.find(d => d.id === id),
      create: async (form) => {
        const created = await documentsApi.uploadDocument(form);
        setData(prev => ({ ...prev, documents: [created, ...prev.documents] }));
        return created;
      },
      update: async (id) => {
        const updated = await documentsApi.verifyDocument(id);
        setData(prev => ({ ...prev, documents: prev.documents.map(d => d.id === id ? updated : d) }));
        return updated;
      },
      remove: async (id) => {
        await documentsApi.deleteDocument(id);
        setData(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }));
      },
    };
  }, [documentsSource, mockDocumentsCrud, data.documents]);
  const mockAnnouncementsCrud = useMemo(() => crud('announcements'), [crud]);
  const announcements = useMemo(() => {
    if (announcementsSource !== 'live') return mockAnnouncementsCrud;
    return {
      getAll: () => data.announcements,
      getById: (id) => data.announcements.find(a => a.id === id),
      create: async (form) => {
        const created = await announcementsApi.createAnnouncement(form);
        setData(prev => ({ ...prev, announcements: [created, ...prev.announcements] }));
        return created;
      },
      update: async (id, form) => {
        const updated = await announcementsApi.updateAnnouncement(id, form);
        setData(prev => ({ ...prev, announcements: prev.announcements.map(a => a.id === id ? updated : a) }));
        return updated;
      },
      remove: async (id) => {
        await announcementsApi.deleteAnnouncement(id);
        setData(prev => ({ ...prev, announcements: prev.announcements.filter(a => a.id !== id) }));
      },
    };
  }, [announcementsSource, mockAnnouncementsCrud, data.announcements]);
  const mockNotificationsCrud = useMemo(() => crud('notifications'), [crud]);
  const mockHolidaysCrud = useMemo(() => crud('holidays'), [crud]);

  const notifications = useMemo(() => {
    if (notificationsSource !== 'live') return mockNotificationsCrud;
    return {
      getAll: () => data.notifications,
      getById: (id) => data.notifications.find(n => n.id === id),
      // Backend has no delete-notification endpoint; remove locally only.
      remove: async (id) => {
        setData(prev => ({ ...prev, notifications: prev.notifications.filter(n => n.id !== id) }));
      },
    };
  }, [notificationsSource, mockNotificationsCrud, data.notifications]);

  // Real CRUD for departments/designations/leave-type quotas (CEO/HR-managed org structure).
  // lookups.departments/designations are always live (independently fetched above), so these
  // simply call the backend then patch the lookups list locally - no mock fallback needed.
  const departmentsCrud = useMemo(() => ({
    create: async (form) => {
      const created = await createDepartment(form);
      setLookups(prev => ({ ...prev, departments: [...prev.departments, created] }));
      return created;
    },
    update: async (id, form) => {
      const updated = await updateDepartment(id, form);
      setLookups(prev => ({ ...prev, departments: prev.departments.map(d => d.id === id ? updated : d) }));
      return updated;
    },
    remove: async (id) => {
      await deleteDepartment(id);
      setLookups(prev => ({ ...prev, departments: prev.departments.filter(d => d.id !== id) }));
    },
  }), []);

  const designationsCrud = useMemo(() => ({
    create: async (form) => {
      const created = await createDesignation(form);
      setLookups(prev => ({ ...prev, designations: [...prev.designations, created] }));
      return created;
    },
    update: async (id, form) => {
      const updated = await updateDesignation(id, form);
      setLookups(prev => ({ ...prev, designations: prev.designations.map(d => d.id === id ? updated : d) }));
      return updated;
    },
    remove: async (id) => {
      await deleteDesignation(id);
      setLookups(prev => ({ ...prev, designations: prev.designations.filter(d => d.id !== id) }));
    },
  }), []);

  const leaveTypesCrud = useMemo(() => ({
    create: async (form) => {
      const created = await leaveApi.createLeaveType(form);
      setLeaveTypes(prev => [...prev, created]);
      return created;
    },
    update: async (id, form) => {
      const updated = await leaveApi.updateLeaveType(id, form);
      setLeaveTypes(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    },
    remove: async (id) => {
      await leaveApi.deleteLeaveType(id);
      setLeaveTypes(prev => prev.filter(t => t.id !== id));
    },
  }), []);

  const holidays = useMemo(() => {
    if (holidaysSource !== 'live') return mockHolidaysCrud;
    return {
      getAll: () => data.holidays,
      getById: (id) => data.holidays.find(h => h.id === id),
      create: async (form) => {
        const created = await settingsApi.createHoliday(form);
        setData(prev => ({ ...prev, holidays: [created, ...prev.holidays] }));
        return created;
      },
      update: async (id, form) => {
        const merged = { ...data.holidays.find(h => h.id === id), ...form };
        const updated = await settingsApi.updateHoliday(id, merged);
        setData(prev => ({ ...prev, holidays: prev.holidays.map(h => h.id === id ? updated : h) }));
        return updated;
      },
      remove: async (id) => {
        await settingsApi.deleteHoliday(id);
        setData(prev => ({ ...prev, holidays: prev.holidays.filter(h => h.id !== id) }));
      },
    };
  }, [holidaysSource, mockHolidaysCrud, data.holidays]);

  const attendanceCheckIn = useCallback(async (opts) => {
    const result = await attendanceApi.checkIn(opts);
    setTodayAttendance(result);
    return result;
  }, []);

  const attendanceCheckOut = useCallback(async (opts) => {
    const result = await attendanceApi.checkOut(opts);
    setTodayAttendance(result);
    return result;
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    if (notificationsSource === 'live') {
      try {
        await notificationsApi.markAsRead(id);
      } catch {
        // ignore - still reflect read state locally so the UI doesn't get stuck
      }
    }
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  }, [notificationsSource]);

  const markAllNotificationsRead = useCallback(async () => {
    if (notificationsSource === 'live') {
      try {
        await notificationsApi.markAllAsRead();
      } catch {
        // ignore - still reflect read state locally so the UI doesn't get stuck
      }
    }
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }));
  }, [notificationsSource]);

  const archiveNotification = useCallback(async (id) => {
    if (notificationsSource === 'live') {
      try {
        await notificationsApi.archiveNotification(id);
      } catch {
        // ignore - still reflect archived state locally so the UI doesn't get stuck
      }
    }
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, archived: true } : n),
    }));
  }, [notificationsSource]);

  const unarchiveNotification = useCallback(async (id) => {
    if (notificationsSource === 'live') {
      try {
        await notificationsApi.unarchiveNotification(id);
      } catch {
        // ignore - still reflect archived state locally so the UI doesn't get stuck
      }
    }
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, archived: false } : n),
    }));
  }, [notificationsSource]);

  const stats = useMemo(() => {
    const emps = data.employees;
    const active = emps.filter(e => e.status === 'Active').length;
    const onLeave = emps.filter(e => e.status === 'On Leave').length;
    const noticePeriod = emps.filter(e => e.status === 'Notice Period').length;
    const pendingLeaves = data.leaveRequests.filter(l => l.status === 'Pending').length;
    const pendingTimesheets = data.timesheets.filter(t => t.status === 'Pending' || t.status === 'Submitted').length;
    const openTickets = data.tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
    const activeProjects = data.projects.filter(p => p.status !== 'Completed' && p.status !== 'On Hold').length;
    const totalPayroll = data.payslips.reduce((s, p) => s + p.netPay, 0);
    const unreadNotifications = data.notifications.filter(n => !n.read).length;
    return { total: emps.length, active, onLeave, noticePeriod, pendingLeaves, pendingTimesheets, openTickets, activeProjects, totalPayroll, unreadNotifications, totalCandidates: data.candidates.length, totalAssets: data.assets.length };
  }, [data]);

  const value = useMemo(() => ({
    data, stats, employees, leaveRequests, timesheets, tickets, candidates, projects, assets, payslips, documents, announcements, notifications, holidays,
    markNotificationRead, markAllNotificationsRead, archiveNotification, unarchiveNotification,
    departments: data.departments, auditLogs: data.auditLogs,
    employeesSource, employeesLoading, lookups,
    leaveRequestsSource, leaveRequestsLoading, leaveTypes, leaveBalances,
    attendanceSource, attendanceLoading, todayAttendance, attendanceCheckIn, attendanceCheckOut,
    ticketsSource, ticketsLoading, assetsSource, assetsLoading, assetsError,
    payslipsSource, payslipsLoading,
    holidaysSource, holidaysLoading, announcementsSource, announcementsLoading, auditLogsSource, auditLogsLoading, auditLogsError, notificationsSource, notificationsLoading, unreadCount,
    projectsSource, projectsLoading, timesheetsSource, timesheetsLoading, timesheetsError,
    documentsSource, documentsLoading, documentsError,
    candidatesSource, candidatesLoading, jobPostings, visibleModules,
    departmentsCrud, designationsCrud, leaveTypesCrud,
    // Lazy-load API: pages call ensureLoad('assets'|'timesheets'|'documents'|'auditLogs') on mount
    // to trigger that domain's fetch, and retryLoad(domain) to re-run it after a failure.
    ensureLoad, retryLoad,
  }), [data, stats, employees, leaveRequests, timesheets, tickets, candidates, projects, assets, payslips, documents, announcements, notifications, holidays, markNotificationRead, markAllNotificationsRead, employeesSource, employeesLoading, lookups, leaveRequestsSource, leaveRequestsLoading, leaveTypes, leaveBalances, attendanceSource, attendanceLoading, todayAttendance, attendanceCheckIn, attendanceCheckOut, ticketsSource, ticketsLoading, assetsSource, assetsLoading, assetsError, payslipsSource, payslipsLoading, holidaysSource, holidaysLoading, announcementsSource, announcementsLoading, auditLogsSource, auditLogsLoading, auditLogsError, notificationsSource, notificationsLoading, unreadCount, projectsSource, projectsLoading, timesheetsSource, timesheetsLoading, timesheetsError, documentsSource, documentsLoading, documentsError, candidatesSource, candidatesLoading, jobPostings, departmentsCrud, designationsCrud, leaveTypesCrud, ensureLoad, retryLoad]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
