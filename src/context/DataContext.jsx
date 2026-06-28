import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { generateEmployees, generateLeaveRequests, generateTimesheets, generateTickets, generateCandidates, generateProjects, generateAssets, generatePayslips, generateDocuments, generateAnnouncements, generateNotifications, generateHolidays } from '../data/generator';

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

  const employees = useMemo(() => crud('employees'), [crud]);
  const leaveRequests = useMemo(() => crud('leaveRequests'), [crud]);
  const timesheets = useMemo(() => crud('timesheets'), [crud]);
  const tickets = useMemo(() => crud('tickets'), [crud]);
  const candidates = useMemo(() => crud('candidates'), [crud]);
  const projects = useMemo(() => crud('projects'), [crud]);
  const assets = useMemo(() => crud('assets'), [crud]);
  const payslips = useMemo(() => crud('payslips'), [crud]);
  const documents = useMemo(() => crud('documents'), [crud]);
  const announcements = useMemo(() => crud('announcements'), [crud]);
  const notifications = useMemo(() => crud('notifications'), [crud]);
  const holidays = useMemo(() => crud('holidays'), [crud]);

  const markNotificationRead = useCallback((id) => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }));
  }, []);

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
    markNotificationRead, markAllNotificationsRead,
    departments: data.departments, auditLogs: data.auditLogs,
  }), [data, stats, employees, leaveRequests, timesheets, tickets, candidates, projects, assets, payslips, documents, announcements, notifications, holidays, markNotificationRead, markAllNotificationsRead]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
