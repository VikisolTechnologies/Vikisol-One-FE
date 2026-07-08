import { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import { getIntegrations, saveIntegration, testIntegrationConnection } from '../../api/integrations';
import Loader from '../../components/ui/Loader';

// Each provider's config fields - only Microsoft 365 is actually wired to a real implementation
// today (Microsoft Graph). The rest are intentionally "Coming soon" placeholders per the request
// to have one central page rather than hardcoding integration logic into individual modules -
// when a provider is implemented, it slots into this same table without a page redesign.
const PROVIDERS = [
  {
    type: 'MICROSOFT_365', label: 'Microsoft 365', subtitle: 'Outlook Calendar, Teams Meetings, Mail - via Microsoft Graph',
    implemented: true,
    fields: [
      { key: 'tenantId', label: 'Tenant ID (Directory ID)' },
      { key: 'clientId', label: 'Application (Client) ID' },
      { key: 'clientSecret', label: 'Client Secret', secret: true },
    ],
  },
  { type: 'GOOGLE_WORKSPACE', label: 'Google Workspace', subtitle: 'Gmail, Google Calendar, Google Meet', implemented: false, fields: [] },
  { type: 'SMTP', label: 'SMTP', subtitle: 'Fallback custom mail server', implemented: false, fields: [] },
  { type: 'SLACK', label: 'Slack', subtitle: 'Team notifications', implemented: false, fields: [] },
  { type: 'ZOOM', label: 'Zoom', subtitle: 'Zoom meeting scheduling', implemented: false, fields: [] },
  { type: 'DOCUSIGN', label: 'DocuSign', subtitle: 'Offer letter e-signatures', implemented: false, fields: [] },
  { type: 'WHATSAPP', label: 'WhatsApp Business', subtitle: 'Candidate/employee messaging', implemented: false, fields: [] },
];

const STATUS_META = {
  CONNECTED: { icon: CheckCircle2, variant: 'success', label: 'Connected' },
  ERROR: { icon: XCircle, variant: 'danger', label: 'Connection Error' },
  NOT_CONFIGURED: { icon: AlertCircle, variant: 'default', label: 'Not Configured' },
};

export default function CompanyIntegrations() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [forms, setForms] = useState({});
  const [savingType, setSavingType] = useState(null);
  const [testingType, setTestingType] = useState(null);

  const load = () => {
    getIntegrations().then(list => {
      const byType = Object.fromEntries(list.map(s => [s.type, s]));
      setSettings(byType);
      setForms(prev => {
        const next = { ...prev };
        list.forEach(s => { next[s.type] = { enabled: s.enabled, config: { ...s.config } }; });
        return next;
      });
    }).catch(() => toast.error('Failed to load integrations')).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setField = (type, key, value) => {
    setForms(prev => ({ ...prev, [type]: { ...prev[type], config: { ...prev[type]?.config, [key]: value } } }));
  };

  const setEnabled = (type, enabled) => {
    setForms(prev => ({ ...prev, [type]: { ...prev[type], enabled } }));
  };

  const handleSave = async (provider) => {
    setSavingType(provider.type);
    try {
      const form = forms[provider.type] || { enabled: false, config: {} };
      // Unmasked secret fields (still showing dots) are sent as "UNCHANGED" so the backend keeps
      // the existing encrypted value instead of overwriting it with literal bullet characters.
      const config = { ...form.config };
      provider.fields.filter(f => f.secret).forEach(f => {
        if (config[f.key] === '••••••••') config[f.key] = 'UNCHANGED';
      });
      await saveIntegration({ type: provider.type, enabled: form.enabled, config });
      toast.success(`${provider.label} settings saved`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save integration');
    } finally {
      setSavingType(null);
    }
  };

  const handleTest = async (provider) => {
    setTestingType(provider.type);
    try {
      const result = await testIntegrationConnection(provider.type);
      setSettings(prev => ({ ...prev, [provider.type]: result }));
      if (result.status === 'CONNECTED') toast.success(`${provider.label} connected successfully`);
      else toast.error(result.lastError || 'Connection failed');
    } catch (err) {
      toast.error(err.message || 'Failed to test connection');
    } finally {
      setTestingType(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full min-h-[50vh]"><Loader /></div>;

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Company Integrations' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">Company Integrations</h1>
        <p className="text-sm text-text-secondary">Connect Vikisol One to your organization's real mail, calendar, and meeting systems - once configured here, every module (Recruitment, Onboarding, Payroll) uses it automatically instead of ad hoc emails or manually-pasted meeting links.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PROVIDERS.map(provider => {
          const setting = settings[provider.type];
          const form = forms[provider.type] || { enabled: false, config: {} };
          const meta = STATUS_META[setting?.status] || STATUS_META.NOT_CONFIGURED;

          return (
            <Card key={provider.type}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Cloud size={18} className="text-primary" /></div>
                  <div>
                    <p className="font-semibold text-text">{provider.label}</p>
                    <p className="text-xs text-text-secondary">{provider.subtitle}</p>
                  </div>
                </div>
                {provider.implemented ? (
                  <Badge variant={meta.variant} dot>{meta.label}</Badge>
                ) : (
                  <Badge variant="default">Coming Soon</Badge>
                )}
              </div>

              {!provider.implemented ? (
                <p className="text-xs text-text-secondary py-4">This provider isn't wired up yet - the abstraction layer (CalendarProvider/MeetingProvider/MailProvider) is ready for it, but no implementation exists.</p>
              ) : (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                    <input type="checkbox" checked={!!form.enabled} onChange={e => setEnabled(provider.type, e.target.checked)} className="w-4 h-4 accent-primary" />
                    Enabled
                  </label>
                  {provider.fields.map(f => (
                    <Input key={f.key} label={f.label} type={f.secret ? 'password' : 'text'} autoComplete={f.secret ? 'off' : undefined}
                      value={form.config?.[f.key] || ''} onChange={e => setField(provider.type, f.key, e.target.value)} />
                  ))}
                  {setting?.lastError && <p className="text-xs text-danger">{setting.lastError}</p>}
                  {setting?.lastTestedAt && <p className="text-[11px] text-text-secondary">Last tested {new Date(setting.lastTestedAt).toLocaleString()}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleSave(provider)} disabled={savingType === provider.type}>{savingType === provider.type ? 'Saving...' : 'Save'}</Button>
                    <Button size="sm" variant="secondary" icon={testingType === provider.type ? Loader2 : undefined} onClick={() => handleTest(provider)} disabled={testingType === provider.type}>
                      {testingType === provider.type ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
