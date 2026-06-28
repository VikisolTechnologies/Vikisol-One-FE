import { useAuth } from '../../context/AuthContext';
import CEODashboard from './CEODashboard';
import EmployeeDashboard from './EmployeeDashboard';

export default function DashboardRouter() {
  const { user } = useAuth();
  if (['ceo', 'admin', 'hr_manager'].includes(user?.role)) return <CEODashboard />;
  return <EmployeeDashboard />;
}
