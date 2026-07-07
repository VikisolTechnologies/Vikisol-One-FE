import { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Copy, CheckCircle, Archive, RotateCcw, Eye, Trash2, Layers, ChevronLeft, History } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import Breadcrumb from '../../components/ui/Breadcrumb';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/ui/Loader';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { DOCUMENT_TYPES } from '../../api/documentEngine';
import {
  listTemplatesByType, createDraft, publishTemplate, rollbackTemplate,
  archiveTemplate, duplicateTemplate, previewDocument,
  seedDefaultTemplates, seedOfferLetterTemplate,
  listVersions, createNewVersion, listVariables,
} from '../../api/documentStudio';
import { getAllEmployees } from '../../api/employees';

const STATUS_VARIANT = { PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'default' };

const BLOCK_TYPES = [
  { value: 'heading', label: 'Heading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'table', label: 'Table' },
  { value: 'list', label: 'List' },
  { value: 'signatureBlock', label: 'Signature Block' },
  { value: 'sealBlock', label: 'Company Seal' },
  { value: 'pageBreak', label: 'Page Break' },
  { value: 'spacer', label: 'Spacer' },
];

const SIGNATURE_ROLES = [
  { value: '', label: 'None (text only)' },
  { value: 'CEO', label: 'CEO' },
  { value: 'HR', label: 'HR' },
  { value: 'FINANCE', label: 'Finance / Authorized Signatory' },
];

function emptyBlock(type) {
  switch (type) {
    case 'heading': return { type, text: '' };
    case 'paragraph': return { type, text: '' };
    case 'table': return { type, title: '', rows: [['', '']] };
    case 'list': return { type, items: [''] };
    case 'signatureBlock': return { type, leftLabel: '', leftName: '', rightLabel: '', rightName: '', leftSignatureRole: '', rightSignatureRole: '' };
    case 'sealBlock': return { type };
    case 'pageBreak': return { type };
    default: return { type: 'spacer' };
  }
}

// Structured block editor - not a freeform drag-and-drop canvas (that's Phase 3), but a real,
// working editor against the same block schema BlockRenderer consumes on the backend, so a
// future visual designer can plug into this same data model without a backend redesign.
function BlockEditor({ blocks, onChange }) {
  const update = (i, patch) => onChange(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i) => onChange(blocks.filter((_, idx) => idx !== i));
  const add = (type) => onChange([...blocks, emptyBlock(type)]);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className="border border-border rounded-lg p-3 bg-surface-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary uppercase">{block.type}</span>
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} className="p-1 text-text-secondary hover:text-text" title="Move up">↑</button>
              <button onClick={() => move(i, 1)} className="p-1 text-text-secondary hover:text-text" title="Move down">↓</button>
              <button onClick={() => remove(i)} className="p-1 text-danger hover:text-danger/80" title="Remove"><Trash2 size={14} /></button>
            </div>
          </div>

          {(block.type === 'heading' || block.type === 'paragraph') && (
            <Input value={block.text || ''} onChange={e => update(i, { text: e.target.value })} placeholder="Text - use {{Placeholder}} tokens" />
          )}

          {block.type === 'table' && (
            <div className="space-y-2">
              <Input value={block.title || ''} onChange={e => update(i, { title: e.target.value })} placeholder="Table title (optional)" />
              {(block.rows || []).map((row, r) => (
                <div key={r} className="flex gap-2">
                  <Input value={row[0] || ''} onChange={e => { const rows = [...block.rows]; rows[r] = [e.target.value, rows[r][1]]; update(i, { rows }); }} placeholder="Label" />
                  <Input value={row[1] || ''} onChange={e => { const rows = [...block.rows]; rows[r] = [rows[r][0], e.target.value]; update(i, { rows }); }} placeholder="Value - {{Placeholder}}" />
                  <button onClick={() => update(i, { rows: block.rows.filter((_, idx) => idx !== r) })} className="text-danger"><Trash2 size={14} /></button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => update(i, { rows: [...(block.rows || []), ['', '']] })}>Add Row</Button>
            </div>
          )}

          {block.type === 'list' && (
            <div className="space-y-2">
              {(block.items || []).map((item, r) => (
                <div key={r} className="flex gap-2">
                  <Input value={item} onChange={e => { const items = [...block.items]; items[r] = e.target.value; update(i, { items }); }} placeholder="List item" />
                  <button onClick={() => update(i, { items: block.items.filter((_, idx) => idx !== r) })} className="text-danger"><Trash2 size={14} /></button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => update(i, { items: [...(block.items || []), ''] })}>Add Item</Button>
            </div>
          )}

          {block.type === 'signatureBlock' && (
            <div className="grid grid-cols-2 gap-2">
              <Input value={block.leftLabel || ''} onChange={e => update(i, { leftLabel: e.target.value })} placeholder="Left label (e.g. For {{CompanyName}})" />
              <Input value={block.leftName || ''} onChange={e => update(i, { leftName: e.target.value })} placeholder="Left name" />
              <Select value={block.leftSignatureRole || ''} onChange={e => update(i, { leftSignatureRole: e.target.value })} options={SIGNATURE_ROLES} />
              <div />
              <Input value={block.rightLabel || ''} onChange={e => update(i, { rightLabel: e.target.value })} placeholder="Right label" />
              <Input value={block.rightName || ''} onChange={e => update(i, { rightName: e.target.value })} placeholder="Right name" />
              <Select value={block.rightSignatureRole || ''} onChange={e => update(i, { rightSignatureRole: e.target.value })} options={SIGNATURE_ROLES} />
              <div />
            </div>
          )}

          {block.type === 'sealBlock' && <p className="text-xs text-text-secondary">Renders the Company Seal image from Company Branding settings, if one is configured - no fields needed here.</p>}

          {block.type === 'pageBreak' && <p className="text-xs text-text-secondary">Forces a new PDF page before the next block - no fields needed.</p>}

          {block.type === 'spacer' && <p className="text-xs text-text-secondary">Blank vertical space - no fields needed.</p>}
        </div>
      ))}

      <Select value="" onChange={e => e.target.value && add(e.target.value)} placeholder="+ Add block..." options={BLOCK_TYPES} />
    </div>
  );
}

export default function DocumentStudio() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const canManage = ['ceo', 'hr_manager', 'admin'].includes((user?.role || '').toLowerCase());

  const [selectedType, setSelectedType] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [showEditor, setShowEditor] = useState(false);
  const [editorName, setEditorName] = useState('');
  const [editorBlocks, setEditorBlocks] = useState([]);
  const [editorVersionGroupId, setEditorVersionGroupId] = useState(null); // set = "create new version of this group" instead of a brand-new draft

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sampleEmployeeId, setSampleEmployeeId] = useState(null);

  const [historyFor, setHistoryFor] = useState(null); // template whose version history is open
  const [historyVersions, setHistoryVersions] = useState(null);

  const [variables, setVariables] = useState([]);

  useEffect(() => {
    getAllEmployees({ size: 1 }).then(r => setSampleEmployeeId(r.items?.[0]?.id)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedType) return;
    listVariables(selectedType).then(setVariables).catch(() => setVariables([]));
  }, [selectedType]);

  const loadTemplates = (type) => {
    setTemplatesLoading(true);
    listTemplatesByType(type).then(setTemplates).catch(() => toast.error('Failed to load templates')).finally(() => setTemplatesLoading(false));
  };

  const openType = (type) => { setSelectedType(type); loadTemplates(type); };

  // "Use Default Template" - a one-click, production-safe alternative to the manual
  // POST /document-templates/seed-* calls, so nobody administering this app in prod ever needs
  // to reach for curl/Postman. No-op if a template for this type already exists.
  const handleUseDefault = async (type) => {
    setBusy(true);
    try {
      if (type === 'OFFER_LETTER') await seedOfferLetterTemplate();
      else await seedDefaultTemplates();
      toast.success('Default template ready');
      loadTemplates(type);
    } catch (err) {
      toast.error(err.message || 'Failed to create default template');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!editorName.trim()) { toast.error('Template name is required'); return; }
    setBusy(true);
    try {
      if (editorVersionGroupId) {
        await createNewVersion(editorVersionGroupId, { documentType: selectedType, name: editorName, contentBlocksJson: JSON.stringify(editorBlocks) });
        toast.success('New version created');
      } else {
        await createDraft({ documentType: selectedType, name: editorName, contentBlocksJson: JSON.stringify(editorBlocks) });
        toast.success('Draft created');
      }
      setShowEditor(false);
      setEditorName('');
      setEditorBlocks([]);
      setEditorVersionGroupId(null);
      loadTemplates(selectedType);
    } catch (err) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setBusy(false);
    }
  };

  const openHistory = (template) => {
    setHistoryFor(template);
    setHistoryVersions(null);
    listVersions(template.templateGroupId).then(setHistoryVersions).catch(() => { toast.error('Failed to load version history'); setHistoryVersions([]); });
  };

  // Opens the block editor pre-filled with an existing version's content, saving as a new version
  // of the same templateGroupId instead of an unrelated brand-new template.
  const handleCreateNewVersionFrom = (template) => {
    setEditorVersionGroupId(template.templateGroupId);
    setEditorName(template.name);
    setEditorBlocks(template.contentBlocksJson ? JSON.parse(template.contentBlocksJson) : []);
    setHistoryFor(null);
    setShowEditor(true);
  };

  const handleAction = async (action, template, label) => {
    if (label === 'archive') {
      const ok = await confirm({ title: 'Archive Template?', message: `Archive "${template.name}" v${template.version}?`, type: 'warning', confirmText: 'Archive' });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await action(template.id);
      toast.success(`Template ${label}ed`);
      loadTemplates(selectedType);
    } catch (err) {
      toast.error(err.message || `Failed to ${label} template`);
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = async (template) => {
    if (!sampleEmployeeId) { toast.error('No employee available to preview with'); return; }
    setPreviewing(true);
    try {
      const blob = await previewDocument({ documentType: selectedType, employeeId: sampleEmployeeId, templateId: template.id, fields: {} });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err.message || 'Preview failed - the template may reference fields this sample employee lacks');
    } finally {
      setPreviewing(false);
    }
  };

  if (!canManage) {
    return (
      <div className="space-y-5">
        <Breadcrumb items={[{ label: 'Document Studio' }]} />
        <Card><p className="text-sm text-text-secondary">Only the CEO, HR Manager, or Admin can manage document templates.</p></Card>
      </div>
    );
  }

  if (selectedType) {
    const typeConfig = DOCUMENT_TYPES.find(t => t.value === selectedType);
    return (
      <div className="space-y-5">
        <Breadcrumb items={[{ label: 'Document Studio', onClick: () => setSelectedType(null) }, { label: typeConfig?.label || selectedType }]} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedType(null)} className="p-2 rounded-lg hover:bg-surface-3 text-text-secondary"><ChevronLeft size={18} /></button>
            <h1 className="text-xl font-bold text-text">{typeConfig?.label}</h1>
          </div>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <Button icon={CheckCircle} variant="secondary" disabled={busy} onClick={() => handleUseDefault(selectedType)}>Use Default Template</Button>
            )}
            <Button icon={Plus} onClick={() => { setEditorVersionGroupId(null); setEditorName(''); setEditorBlocks([]); setShowEditor(true); }}>New Template</Button>
          </div>
        </div>

        {templatesLoading ? (
          <Loader fullPage />
        ) : templates.length === 0 ? (
          <Card>
            <EmptyState icon={FileText} title="No templates yet" description="Start from the built-in default (recommended), or create a blank template from scratch." action={() => setShowEditor(true)} actionLabel="Create Blank Template" />
            <div className="flex justify-center -mt-2 pb-4">
              <Button icon={CheckCircle} variant="secondary" disabled={busy} onClick={() => handleUseDefault(selectedType)}>Use Default Template</Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <Card key={t.id} className="flex items-center justify-between !flex-row">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Layers size={18} className="text-primary" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold text-text truncate">{t.name} <span className="text-text-secondary font-normal">v{t.version}</span></p>
                    <p className="text-xs text-text-secondary">{t.createdByEmail} · {new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="secondary" icon={Eye} disabled={previewing} onClick={() => handlePreview(t)}>Preview</Button>
                  <Button size="sm" variant="secondary" icon={History} onClick={() => openHistory(t)}>History</Button>
                  <Button size="sm" variant="secondary" icon={Copy} disabled={busy} onClick={() => handleAction((id) => duplicateTemplate(id), t, 'duplicate')}>Duplicate</Button>
                  {t.status !== 'PUBLISHED' && (
                    <Button size="sm" icon={t.status === 'ARCHIVED' ? RotateCcw : CheckCircle} disabled={busy}
                      onClick={() => handleAction((id) => (t.status === 'ARCHIVED' ? rollbackTemplate(id) : publishTemplate(id)), t, t.status === 'ARCHIVED' ? 'rollback' : 'publish')}>
                      {t.status === 'ARCHIVED' ? 'Rollback' : 'Publish'}
                    </Button>
                  )}
                  {t.status !== 'ARCHIVED' && (
                    <Button size="sm" variant="ghost" icon={Archive} disabled={busy} onClick={() => handleAction((id) => archiveTemplate(id), t, 'archive')}>Archive</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* New Template / New Version Editor */}
        <Modal open={showEditor} onClose={() => setShowEditor(false)} title={editorVersionGroupId ? `New Version - ${typeConfig?.label}` : `New Template - ${typeConfig?.label}`} size="xl">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <Input label="Template Name" value={editorName} onChange={e => setEditorName(e.target.value)} placeholder="e.g. Corporate Offer Letter" />
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Content Blocks</label>
                <BlockEditor blocks={editorBlocks} onChange={setEditorBlocks} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
                <Button disabled={busy} onClick={handleCreateDraft}>{busy ? 'Saving...' : editorVersionGroupId ? 'Create New Version' : 'Create Draft'}</Button>
              </div>
            </div>
            <div className="col-span-1">
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Available Placeholders</label>
              <div className="border border-border rounded-lg p-2 max-h-[60vh] overflow-y-auto space-y-1">
                {variables.length === 0 && <p className="text-xs text-text-secondary p-2">No placeholders registered for this document type yet.</p>}
                {variables.map(v => (
                  <button key={v.key} type="button"
                    onClick={() => { navigator.clipboard?.writeText(`{{${v.key}}}`); toast.info(`Copied {{${v.key}}}`); }}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-surface-3 transition-colors group">
                    <p className="text-xs font-mono text-primary">{'{{' + v.key + '}}'}</p>
                    <p className="text-[11px] text-text-secondary">{v.label}</p>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-secondary mt-2">Click a placeholder to copy it, then paste into any text/table/signature field above.</p>
            </div>
          </div>
        </Modal>

        {/* Version History */}
        <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} title={`Version History - ${historyFor?.name || ''}`} size="lg">
          {historyVersions === null ? (
            <p className="text-sm text-text-secondary">Loading...</p>
          ) : historyVersions.length === 0 ? (
            <p className="text-sm text-text-secondary">No version history found.</p>
          ) : (
            <div className="space-y-2">
              {historyVersions.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-text">v{v.version} <Badge variant={STATUS_VARIANT[v.status]} className="ml-1">{v.status}</Badge></p>
                    <p className="text-xs text-text-secondary">{v.createdByEmail} &middot; {new Date(v.createdAt).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleCreateNewVersionFrom(v)}>Use as Base for New Version</Button>
                </div>
              ))}
            </div>
          )}
        </Modal>

        {/* PDF Preview */}
        <Modal open={!!previewUrl} onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} title="Document Preview" size="xl">
          {previewUrl && <iframe src={previewUrl} title="Document preview" className="w-full h-[70vh] rounded-lg border border-border" />}
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Document Studio' }]} />
      <div>
        <h1 className="text-xl font-bold text-text">Document Studio</h1>
        <p className="text-sm text-text-secondary">Manage templates for every HR document type - create, publish, version, and preview</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {DOCUMENT_TYPES.map(dt => (
          <Card key={dt.value} hoverable onClick={() => openType(dt.value)} className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><FileText size={18} className="text-primary" /></div>
              <div className="min-w-0"><p className="font-semibold text-text text-sm truncate">{dt.label}</p><p className="text-xs text-text-secondary">Manage templates</p></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
