import { useState } from 'react';
import { HelpCircle, MessageSquare, BookOpen, Video, Bug, Lightbulb, Download, Shield, Info, ChevronDown, ChevronRight, Search, Headphones, Send } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Breadcrumb from '../components/ui/Breadcrumb';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';

const faqs = [
  { q: 'How do I apply for leave?', a: 'Navigate to Leave Management from the sidebar, click "Apply Leave", fill in the form and submit.' },
  { q: 'How do I submit my timesheet?', a: 'Go to Timesheets, fill in your daily hours for each project, then click "Submit for Approval".' },
  { q: 'Where can I download my payslip?', a: 'Go to Payroll, find your payslip in the list, and click the download icon or "Download PDF".' },
  { q: 'How do I raise a support ticket?', a: 'Navigate to Tickets from the sidebar, click "Raise Ticket", fill in the details and submit.' },
  { q: 'How do I update my personal information?', a: 'Go to your Employee Profile (click your avatar in the topbar), then edit your personal details.' },
  { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page, or contact your IT Admin for a password reset.' },
  { q: 'How do I check my attendance?', a: 'Navigate to Attendance from the sidebar to view your punch-in/out records and monthly summary.' },
  { q: 'How do I view my performance goals?', a: 'Go to Performance from the sidebar to see your goals, ratings, and review history.' },
];

export default function HelpCenter() {
  const toast = useToast();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showBugReport, setShowBugReport] = useState(false);
  const [showFeatureReq, setShowFeatureReq] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ from: 'bot', text: 'Hi! I\'m the Vikisol HRMS Assistant. How can I help you today?' }]);
  const [chatInput, setChatInput] = useState('');
  const [faqSearch, setFaqSearch] = useState('');

  const filteredFaqs = faqSearch ? faqs.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase())) : faqs;

  const handleChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { from: 'user', text: chatInput }]);
    setTimeout(() => {
      const responses = [
        'I can help you with that! Please navigate to the relevant module from the sidebar.',
        'For this request, please contact your HR Manager or raise a support ticket.',
        'You can find this in the Settings page under the relevant tab.',
        'Great question! Check the FAQ section for detailed instructions.',
        'I\'ve noted your query. A support representative will get back to you shortly.',
      ];
      setChatMessages(prev => [...prev, { from: 'bot', text: responses[Math.floor(Math.random() * responses.length)] }]);
    }, 800);
    setChatInput('');
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Help & Support' }]} />
      <h1 className="text-xl font-bold text-text">Help & Support</h1>

      <Tabs tabs={[
        { id: 'faq', label: 'FAQ', content: (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={faqSearch} onChange={e => setFaqSearch(e.target.value)} placeholder="Search FAQs..." className="w-full bg-surface-3 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary placeholder-text-secondary/50" />
            </div>
            <div className="space-y-2">
              {filteredFaqs.map((f, i) => (
                <div key={i} className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-3 transition-colors">
                    <span className="text-sm font-medium text-text">{f.q}</span>
                    {expandedFaq === i ? <ChevronDown size={16} className="text-text-secondary" /> : <ChevronRight size={16} className="text-text-secondary" />}
                  </button>
                  {expandedFaq === i && <div className="px-4 pb-4 text-sm text-text-secondary">{f.a}</div>}
                </div>
              ))}
            </div>
          </div>
        )},
        { id: 'chat', label: 'Live Chat', content: (
          <Card className="max-w-2xl">
            <div className="h-80 overflow-y-auto space-y-3 mb-4">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${m.from === 'user' ? 'bg-primary text-white rounded-br-md' : 'bg-surface-3 text-text rounded-bl-md'}`}>{m.text}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Type your message..." className="flex-1 bg-surface-3 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary placeholder-text-secondary/50" />
              <Button icon={Send} onClick={handleChat}>Send</Button>
            </div>
          </Card>
        )},
        { id: 'guides', label: 'User Guide', content: (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: BookOpen, title: 'Getting Started', desc: 'Learn the basics of Vikisol HRMS' },
              { icon: HelpCircle, title: 'Employee Self Service', desc: 'How to use ESS features' },
              { icon: Shield, title: 'Admin Guide', desc: 'System administration and configuration' },
              { icon: Video, title: 'Video Tutorials', desc: 'Watch step-by-step tutorials' },
              { icon: Headphones, title: 'Contact Support', desc: 'Reach our support team' },
              { icon: Info, title: 'Release Notes', desc: 'Latest updates and changes' },
            ].map(g => (
              <Card key={g.title} hoverable>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><g.icon size={18} className="text-primary" /></div>
                  <div><h3 className="text-sm font-semibold text-text">{g.title}</h3><p className="text-xs text-text-secondary mt-0.5">{g.desc}</p></div>
                </div>
              </Card>
            ))}
          </div>
        )},
        { id: 'report', label: 'Report', content: (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Card hoverable>
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => setShowBugReport(true)}>
                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center"><Bug size={18} className="text-danger" /></div>
                <div><h3 className="text-sm font-semibold text-text">Report Bug</h3><p className="text-xs text-text-secondary">Found something broken? Let us know.</p></div>
              </div>
            </Card>
            <Card hoverable>
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => setShowFeatureReq(true)}>
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><Lightbulb size={18} className="text-success" /></div>
                <div><h3 className="text-sm font-semibold text-text">Feature Request</h3><p className="text-xs text-text-secondary">Suggest a new feature or improvement.</p></div>
              </div>
            </Card>
          </div>
        )},
        { id: 'about', label: 'About', content: (
          <Card className="max-w-md">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-white text-2xl font-bold">V</span></div>
              <h2 className="text-lg font-bold text-text tracking-[0.2em]">VIKISOL ONE</h2>
              <p className="text-xs text-text-secondary mt-1">Enterprise HRMS Platform</p>
              <p className="text-xs text-text-secondary mt-4">Version 1.0.0</p>
              <p className="text-xs text-text-secondary">&copy; 2024 Vikisol Technologies</p>
              <p className="text-xs text-text-secondary mt-1">Technology &bull; Talent &bull; Transformation</p>
              <div className="mt-6 space-y-2 text-xs text-text-secondary text-left">
                <div className="flex justify-between p-2 bg-surface-3 rounded-lg"><span>React</span><span>v19.x</span></div>
                <div className="flex justify-between p-2 bg-surface-3 rounded-lg"><span>Vite</span><span>v8.x</span></div>
                <div className="flex justify-between p-2 bg-surface-3 rounded-lg"><span>Tailwind CSS</span><span>v4.x</span></div>
              </div>
            </div>
          </Card>
        )},
      ]} />

      <Modal open={showBugReport} onClose={() => setShowBugReport(false)} title="Report Bug">
        <div className="space-y-4">
          <Input label="Title *" placeholder="Brief description of the bug" />
          <Textarea label="Steps to Reproduce" placeholder="1. Go to...\n2. Click on...\n3. See error" />
          <Textarea label="Expected Behavior" placeholder="What should have happened?" />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowBugReport(false)}>Cancel</Button><Button onClick={() => { toast.success('Bug report submitted'); setShowBugReport(false); }}>Submit</Button></div>
        </div>
      </Modal>

      <Modal open={showFeatureReq} onClose={() => setShowFeatureReq(false)} title="Feature Request">
        <div className="space-y-4">
          <Input label="Feature Title *" placeholder="What feature would you like?" />
          <Textarea label="Description" placeholder="Describe the feature and why it's needed..." />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowFeatureReq(false)}>Cancel</Button><Button onClick={() => { toast.success('Feature request submitted'); setShowFeatureReq(false); }}>Submit</Button></div>
        </div>
      </Modal>
    </div>
  );
}
