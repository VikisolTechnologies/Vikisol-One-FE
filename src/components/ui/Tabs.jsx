import { useState } from 'react';

export default function Tabs({ tabs, defaultTab, active: controlledActive, onChange }) {
  const [internalActive, setInternalActive] = useState(defaultTab || tabs[0]?.id);
  const active = controlledActive ?? internalActive;
  const setActive = onChange ?? setInternalActive;
  const current = tabs.find(t => t.id === active);

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              active === tab.id ? 'text-primary' : 'text-text-secondary hover:text-text'
            }`}
          >
            {tab.label}
            {active === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
          </button>
        ))}
      </div>
      {current?.content}
    </div>
  );
}
