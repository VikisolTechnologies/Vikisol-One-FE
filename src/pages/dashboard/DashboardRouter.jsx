import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyProfile } from '../../api/employees';
import { getProfileCompletion } from '../../api/onboarding';
import CEODashboard from './CEODashboard';
import EmployeeDashboard from './EmployeeDashboard';
import Loader from '../../components/ui/Loader';

// Employees with an incomplete profile land on the onboarding wizard instead of the dashboard -
// matches the "don't reach the dashboard until onboarded" requirement. Only applies to the
// EMPLOYEE role; managers/HR/CEO always see their dashboard regardless of their own profile state.
export default function DashboardRouter() {
  const { user } = useAuth();
  const isManagement = ['ceo', 'admin', 'hr_manager'].includes(user?.role);
  const [checking, setChecking] = useState(!isManagement);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (isManagement) return;
    getMyProfile()
      .then(profile => getProfileCompletion(profile.id))
      // Gating on a literal 100% here was too strict: sections like Employment History require
      // at least one prior job entry, which a fresh graduate can never have - that employee could
      // never reach the dashboard no matter what they filled in. Only the "personal" section is
      // treated as a hard requirement; everything else remains visible/completable from inside
      // the wizard later without blocking access to the rest of the app.
      .then(completion => {
        const personal = completion.sections?.find(s => s.key === 'personal');
        setNeedsOnboarding(personal ? !personal.done : completion.percent < 100);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [isManagement]);

  if (isManagement) return <CEODashboard />;
  if (checking) return <div className="flex items-center justify-center h-full min-h-[50vh]"><Loader /></div>;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <EmployeeDashboard />;
}
