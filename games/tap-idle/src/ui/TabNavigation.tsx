export type TabId = 'upgrades' | 'assets' | 'missions' | 'prestige';

interface TabNavigationProps {
  active: TabId;
  onSelect: (id: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'upgrades', label: 'アップグレード' },
  { id: 'assets', label: '資産' },
  { id: 'missions', label: 'ミッション' },
  { id: 'prestige', label: 'プレステージ' },
];

export function TabNavigation({ active, onSelect }: TabNavigationProps) {
  return (
    <nav className="tab-nav">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`tab-nav-btn ${active === id ? 'active' : ''}`}
          onClick={() => onSelect(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
