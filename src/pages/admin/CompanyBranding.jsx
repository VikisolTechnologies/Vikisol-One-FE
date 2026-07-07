import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, Trash2, Building2, Image as ImageIcon, PenTool, Palette, FileText, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getBranding, updateBranding, uploadBrandingAsset } from '../../api/branding';
import { listTemplatesByType, seedOfferLetterTemplate, seedDefaultTemplates } from '../../api/documentStudio';
import Loader from '../../components/ui/Loader';

// Offer Letter and Payslip are the two templates every company needs before recruitment/payroll
// can generate documents - surfaced here (in addition to the full editor in Document Studio) so
// CEO/HR can get a working default in one click without leaving the branding setup flow.
const TEMPLATE_SETUP_TYPES = [
  { type: 'OFFER_LETTER', label: 'Offer Letter' },
  { type: 'PAYSLIP', label: 'Payslip' },
];

// Every generated HR document (offer letters, payslips, certificates...) reads these settings
// automatically via the backend's BrandingService - changing something here takes effect on the
// next document generated, no code change or redeploy needed.
const COMPANY_FIELDS = [
  { key: 'COMPANY_NAME', label: 'Company Name' },
  { key: 'LEGAL_NAME', label: 'Legal Name' },
  { key: 'WEBSITE', label: 'Website' },
  { key: 'EMAIL', label: 'Email' },
  { key: 'PHONE', label: 'Phone' },
  { key: 'GST', label: 'GST Number' },
  { key: 'PAN', label: 'PAN Number' },
  { key: 'CIN', label: 'CIN Number' },
  { key: 'COMPANY_ADDRESS', label: 'Address', full: true },
];

// Company-wide values that used to be hardcoded per-caller (e.g. RecruitmentService's Offer
// Letter builder) - now read from BrandingService at render time, so CEO/HR can change them here
// without a code change/redeploy.
const DOCUMENT_DEFAULT_FIELDS = [
  { key: 'CEO_NAME', label: 'CEO Name' },
  { key: 'HR_NAME', label: 'HR Team Name' },
  { key: 'TAGLINE', label: 'Header Tagline' },
  { key: 'OFFICE_LOCATION', label: 'Office Location' },
  { key: 'WORK_START_TIME', label: 'Work Start Time' },
  { key: 'WORK_END_TIME', label: 'Work End Time' },
  { key: 'WORK_DAYS', label: 'Work Days' },
  { key: 'ORIENTATION_CONTACT', label: 'Orientation Contact' },
  { key: 'FOOTER_TEXT', label: 'Footer Text', full: true },
];

const ASSET_FIELDS = [
  { key: 'LOGO_URL', assetType: 'logo', label: 'Primary Logo' },
  { key: 'DARK_LOGO_URL', assetType: 'dark-logo', label: 'Dark Logo' },
  { key: 'LIGHT_LOGO_URL', assetType: 'light-logo', label: 'Light Logo' },
  { key: 'LETTERHEAD_URL', assetType: 'letterhead', label: 'Letterhead' },
  { key: 'WATERMARK_URL', assetType: 'watermark', label: 'Watermark' },
  { key: 'COMPANY_SEAL_URL', assetType: 'company-seal', label: 'Company Seal' },
];

const SIGNATURE_FIELDS = [
  { key: 'CEO_SIGNATURE_URL', assetType: 'ceo-signature', label: 'CEO Signature' },
  { key: 'HR_SIGNATURE_URL', assetType: 'hr-signature', label: 'HR Signature' },
  { key: 'AUTHORIZED_SIGNATORY_URL', assetType: 'authorized-signatory', label: 'Authorized Signatory' },
];

function fieldValue(branding, key) {
  const camelKey = key.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return branding?.[camelKey] ?? '';
}

function AssetUploadTile({ label, url, onUpload, onRemove, busy }) {
  const fileInputRef = useRef(null);
  return (
    <div className="border border-border rounded-xl p-3 bg-surface-3">
      <p className="text-xs font-semibold text-text-secondary mb-2">{label}</p>
      <div className="h-20 rounded-lg bg-surface-2 border border-border flex items-center justify-center overflow-hidden mb-2">
        {url ? <img src={url} alt={label} className="max-h-full max-w-full object-contain" /> : <ImageIcon size={20} className="text-text-secondary/40" />}
      </div>
      <div className="flex gap-1.5">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
        <Button size="sm" variant="secondary" icon={Upload} disabled={busy} onClick={() => fileInputRef.current?.click()} className="flex-1">
          {url ? 'Replace' : 'Upload'}
        </Button>
        {url && <Button size="sm" variant="ghost" icon={Trash2} disabled={busy} onClick={onRemove} />}
      </div>
    </div>
  );
}

export default function CompanyBranding() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const canManage = ['ceo', 'hr_manager', 'admin'].includes((user?.role || '').toLowerCase());

  const [branding, setBranding] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [templateStatus, setTemplateStatus] = useState(null); // { OFFER_LETTER: bool, PAYSLIP: bool }
  const [settingUpType, setSettingUpType] = useState(null);

  useEffect(() => {
    getBranding()
      .then(b => { setBranding(b); setForm(b); })
      .catch(() => toast.error('Failed to load branding settings'))
      .finally(() => setLoading(false));
  }, []);

  const loadTemplateStatus = () => {
    Promise.all(TEMPLATE_SETUP_TYPES.map(t => listTemplatesByType(t.type).catch(() => [])))
      .then(results => {
        const status = {};
        TEMPLATE_SETUP_TYPES.forEach((t, i) => { status[t.type] = (results[i] || []).some(tpl => tpl.status === 'PUBLISHED'); });
        setTemplateStatus(status);
      });
  };
  useEffect(() => { loadTemplateStatus(); }, []);

  const handleSetupDefault = async (type) => {
    setSettingUpType(type);
    try {
      if (type === 'OFFER_LETTER') await seedOfferLetterTemplate();
      else await seedDefaultTemplates();
      toast.success(`Default ${TEMPLATE_SETUP_TYPES.find(t => t.type === type)?.label} template published`);
      loadTemplateStatus();
    } catch (err) {
      toast.error(err.message || 'Failed to set up default template');
    } finally {
      setSettingUpType(null);
    }
  };

  const setField = (key, value) => setForm(prev => ({ ...prev, [key.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Diff against loaded branding so only changed fields are sent - PUT /branding accepts a
      // partial map of BRANDING_<KEY> -> value.
      const changes = {};
      [...COMPANY_FIELDS, ...DOCUMENT_DEFAULT_FIELDS, ...ASSET_FIELDS, ...SIGNATURE_FIELDS].forEach(({ key }) => {
        const current = fieldValue(form, key);
        const original = fieldValue(branding, key);
        if (current !== original) changes[key] = current;
      });
      if (Object.keys(changes).length === 0) { toast.info('No changes to save'); setSaving(false); return; }
      const updated = await updateBranding(changes);
      setBranding(updated);
      setForm(updated);
      toast.success('Branding updated - takes effect on the next document generated');
    } catch (err) {
      toast.error(err.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (field, file) => {
    setUploadingKey(field.key);
    try {
      const url = await uploadBrandingAsset(file, field.assetType);
      const updated = await updateBranding({ [field.key]: url });
      setBranding(updated);
      setForm(updated);
      toast.success(`${field.label} updated`);
    } catch (err) {
      toast.error(err.message || `Failed to upload ${field.label}`);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleAssetRemove = async (field) => {
    setUploadingKey(field.key);
    try {
      const updated = await updateBranding({ [field.key]: '' });
      setBranding(updated);
      setForm(updated);
    } catch (err) {
      toast.error(err.message || `Failed to remove ${field.label}`);
    } finally {
      setUploadingKey(null);
    }
  };

  if (!canManage) {
    return (
      <div className="space-y-5">
        <Breadcrumb items={[{ label: 'Company Branding' }]} />
        <Card><p className="text-sm text-text-secondary">Only the CEO, HR Manager, or Admin can manage company branding.</p></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Breadcrumb items={[{ label: 'Company Branding' }]} />
        <Loader fullPage />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Company Branding' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Company Branding</h1>
          <p className="text-sm text-text-secondary">Every generated document automatically uses these settings</p>
        </div>
        <Button icon={Save} disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>

      <Card title="Company Information" action={<Building2 size={16} className="text-text-secondary" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {COMPANY_FIELDS.map(f => (
            <div key={f.key} className={f.full ? 'col-span-2 md:col-span-3' : ''}>
              <Input label={f.label} value={fieldValue(form, f.key)} onChange={e => setField(f.key, e.target.value)} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Document Defaults" subtitle="Used on Offer/Appointment/Joining letters instead of hardcoded values" action={<Building2 size={16} className="text-text-secondary" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {DOCUMENT_DEFAULT_FIELDS.map(f => (
            <div key={f.key} className={f.full ? 'col-span-2 md:col-span-3' : ''}>
              <Input label={f.label} value={fieldValue(form, f.key)} onChange={e => setField(f.key, e.target.value)} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Logos & Documents" subtitle="Logo, letterhead, watermark, and company seal" action={<ImageIcon size={16} className="text-text-secondary" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ASSET_FIELDS.map(f => (
            <AssetUploadTile key={f.key} label={f.label} url={fieldValue(form, f.key)}
              busy={uploadingKey === f.key}
              onUpload={file => handleAssetUpload(f, file)}
              onRemove={() => handleAssetRemove(f)} />
          ))}
        </div>
      </Card>

      <Card title="Signatures" subtitle="Applied to offer letters, hike letters, and other formal documents" action={<PenTool size={16} className="text-text-secondary" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SIGNATURE_FIELDS.map(f => (
            <AssetUploadTile key={f.key} label={f.label} url={fieldValue(form, f.key)}
              busy={uploadingKey === f.key}
              onUpload={file => handleAssetUpload(f, file)}
              onRemove={() => handleAssetRemove(f)} />
          ))}
        </div>
      </Card>

      <Card title="Brand Theme" subtitle="Applied to the header/footer chrome of every generated PDF" action={<Palette size={16} className="text-text-secondary" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={fieldValue(form, 'PRIMARY_COLOR') || '#FF6B35'} onChange={e => setField('PRIMARY_COLOR', e.target.value)} className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
              <Input value={fieldValue(form, 'PRIMARY_COLOR')} onChange={e => setField('PRIMARY_COLOR', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={fieldValue(form, 'SECONDARY_COLOR') || '#0a0a0a'} onChange={e => setField('SECONDARY_COLOR', e.target.value)} className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
              <Input value={fieldValue(form, 'SECONDARY_COLOR')} onChange={e => setField('SECONDARY_COLOR', e.target.value)} />
            </div>
          </div>
          <Input label="Default Font" value={fieldValue(form, 'FONT_FAMILY')} onChange={e => setField('FONT_FAMILY', e.target.value)} placeholder="Helvetica, Arial, sans-serif" />
          <Input label="Default Margin" value={fieldValue(form, 'DEFAULT_MARGIN')} onChange={e => setField('DEFAULT_MARGIN', e.target.value)} placeholder="36px 40px" />
        </div>
      </Card>

      <Card title="Offer Letter & Payslip Templates" subtitle="Every hire/payroll run needs a published template of each - set up the built-in default here, or fully customize in Document Studio" action={<FileText size={16} className="text-text-secondary" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATE_SETUP_TYPES.map(t => {
            const published = templateStatus?.[t.type];
            return (
              <div key={t.type} className="border border-border rounded-xl p-4 bg-surface-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">{t.label}</p>
                  {templateStatus === null ? (
                    <p className="text-xs text-text-secondary mt-1">Checking...</p>
                  ) : published ? (
                    <Badge variant="success"><span className="flex items-center gap-1"><CheckCircle2 size={12} /> Published</span></Badge>
                  ) : (
                    <Badge variant="danger"><span className="flex items-center gap-1"><AlertCircle size={12} /> Not set up</span></Badge>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  {!published && (
                    <Button size="sm" disabled={settingUpType === t.type} onClick={() => handleSetupDefault(t.type)}>
                      {settingUpType === t.type ? 'Setting up...' : 'Use Default Template'}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" icon={ExternalLink} onClick={() => navigate('/document-studio')}>
                    {published ? 'Edit in Document Studio' : 'Customize instead'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
