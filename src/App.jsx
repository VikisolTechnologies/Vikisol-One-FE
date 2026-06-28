import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ApprovalProvider } from './context/ApprovalEngine';
import { PayrollProvider } from './context/PayrollEngine';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import DashboardRouter from './pages/dashboard/DashboardRouter';
import EmployeeDirectory from './pages/employees/EmployeeDirectory';
import LeaveManagement from './pages/leave/LeaveManagement';
import AttendancePage from './pages/attendance/AttendancePage';
import PayrollPage from './pages/payroll/PayrollPage';
import RecruitmentPage from './pages/recruitment/RecruitmentPage';
import TimesheetPage from './pages/timesheets/TimesheetPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import TicketsPage from './pages/tickets/TicketsPage';
import PerformancePage from './pages/performance/PerformancePage';
import DocumentsPage from './pages/documents/DocumentsPage';
import AssetsPage from './pages/assets/AssetsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import NotificationCenter from './pages/NotificationCenter';
import HelpCenter from './pages/HelpCenter';
import OrgChart from './pages/OrgChart';
import ResourceAllocation from './pages/ResourceAllocation';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <ConfirmProvider>
                <ApprovalProvider>
                  <PayrollProvider>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route element={<AppLayout />}>
                        <Route path="/" element={<DashboardRouter />} />
                        <Route path="/dashboard" element={<Navigate to="/" replace />} />
                        <Route path="/employees" element={<EmployeeDirectory />} />
                        <Route path="/leave" element={<LeaveManagement />} />
                        <Route path="/attendance" element={<AttendancePage />} />
                        <Route path="/payroll" element={<PayrollPage />} />
                        <Route path="/recruitment" element={<RecruitmentPage />} />
                        <Route path="/timesheets" element={<TimesheetPage />} />
                        <Route path="/projects" element={<ProjectsPage />} />
                        <Route path="/tickets" element={<TicketsPage />} />
                        <Route path="/performance" element={<PerformancePage />} />
                        <Route path="/documents" element={<DocumentsPage />} />
                        <Route path="/assets" element={<AssetsPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/notifications" element={<NotificationCenter />} />
                        <Route path="/help" element={<HelpCenter />} />
                        <Route path="/org-chart" element={<OrgChart />} />
                        <Route path="/resources" element={<ResourceAllocation />} />
                      </Route>
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </PayrollProvider>
                </ApprovalProvider>
              </ConfirmProvider>
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
