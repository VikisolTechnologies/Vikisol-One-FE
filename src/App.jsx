import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ApprovalProvider } from './context/ApprovalEngine';
import { PayrollProvider } from './context/PayrollEngine';
import AppLayout from './components/layout/AppLayout';
import Loader from './components/ui/Loader';
// Login loads eagerly - it's the first thing every unauthenticated visitor sees.
// Every other page is route-split so the initial bundle only contains what's needed to log in
// and render the shell; each page's code loads on first visit to that route.
import Login from './pages/Login';
import ActivateAccount from './pages/ActivateAccount';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';

const DashboardRouter = lazy(() => import('./pages/dashboard/DashboardRouter'));
const OnboardingWizard = lazy(() => import('./pages/onboarding/OnboardingWizard'));
const EmployeeDirectory = lazy(() => import('./pages/employees/EmployeeDirectory'));
const LeaveManagement = lazy(() => import('./pages/leave/LeaveManagement'));
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'));
const PayrollPage = lazy(() => import('./pages/payroll/PayrollPage'));
const RecruitmentPage = lazy(() => import('./pages/recruitment/RecruitmentPage'));
const AssessmentsPage = lazy(() => import('./pages/recruitment/AssessmentsPage'));
const NewHiresPage = lazy(() => import('./pages/recruitment/NewHiresPage'));
const BackgroundVerificationPage = lazy(() => import('./pages/bgv/BackgroundVerificationPage'));
const OffboardingPage = lazy(() => import('./pages/offboarding/OffboardingPage'));
const HrTaskCenterPage = lazy(() => import('./pages/hr-tasks/HrTaskCenterPage'));
const ExecutiveAnalyticsPage = lazy(() => import('./pages/analytics/ExecutiveAnalyticsPage'));
const TimesheetPage = lazy(() => import('./pages/timesheets/TimesheetPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const TicketsPage = lazy(() => import('./pages/tickets/TicketsPage'));
const PerformancePage = lazy(() => import('./pages/performance/PerformancePage'));
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage'));
const AssetsPage = lazy(() => import('./pages/assets/AssetsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const CommunicationCenterPage = lazy(() => import('./pages/communication/CommunicationCenterPage'));
const PoliciesPage = lazy(() => import('./pages/policies/PoliciesPage'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const OrgChart = lazy(() => import('./pages/OrgChart'));
const ResourceAllocation = lazy(() => import('./pages/ResourceAllocation'));
const CompanyBranding = lazy(() => import('./pages/admin/CompanyBranding'));
const CompanyIntegrations = lazy(() => import('./pages/admin/CompanyIntegrations'));
const DocumentStudio = lazy(() => import('./pages/admin/DocumentStudio'));

function PageFallback() {
  return <div className="flex items-center justify-center h-full min-h-[50vh]"><Loader /></div>;
}

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
                    <Suspense fallback={<PageFallback />}>
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/activate" element={<ActivateAccount />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/change-password" element={<ChangePassword />} />
                        <Route element={<AppLayout />}>
                          <Route path="/" element={<DashboardRouter />} />
                          <Route path="/onboarding" element={<OnboardingWizard />} />
                          <Route path="/dashboard" element={<Navigate to="/" replace />} />
                          <Route path="/employees" element={<EmployeeDirectory />} />
                          <Route path="/leave" element={<LeaveManagement />} />
                          <Route path="/attendance" element={<AttendancePage />} />
                          <Route path="/payroll" element={<PayrollPage />} />
                          <Route path="/recruitment" element={<RecruitmentPage />} />
                          <Route path="/assessments" element={<AssessmentsPage />} />
                          <Route path="/new-hires" element={<NewHiresPage />} />
                          <Route path="/background-verification" element={<BackgroundVerificationPage />} />
                          <Route path="/offboarding" element={<OffboardingPage />} />
                          <Route path="/hr-tasks" element={<HrTaskCenterPage />} />
                          <Route path="/analytics" element={<ExecutiveAnalyticsPage />} />
                          <Route path="/timesheets" element={<TimesheetPage />} />
                          <Route path="/projects" element={<ProjectsPage />} />
                          <Route path="/tickets" element={<TicketsPage />} />
                          <Route path="/performance" element={<PerformancePage />} />
                          <Route path="/documents" element={<DocumentsPage />} />
                          <Route path="/assets" element={<AssetsPage />} />
                          <Route path="/reports" element={<ReportsPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/notifications" element={<NotificationCenter />} />
                          <Route path="/communication" element={<CommunicationCenterPage />} />
                          <Route path="/policies" element={<PoliciesPage />} />
                          <Route path="/help" element={<HelpCenter />} />
                          <Route path="/org-chart" element={<OrgChart />} />
                          <Route path="/resources" element={<ResourceAllocation />} />
                          <Route path="/company-branding" element={<CompanyBranding />} />
                          <Route path="/company-integrations" element={<CompanyIntegrations />} />
                          <Route path="/document-studio" element={<DocumentStudio />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
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
