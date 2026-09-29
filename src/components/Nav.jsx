import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Map, Info, ScanSearch, BookOpen } from 'lucide-react'

const LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/map', label: 'Ward Map', icon: Map },
  { to: '/description', label: 'Description', icon: BookOpen },
  { to: '/about', label: 'About', icon: Info },
]

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white">
            <ScanSearch size={17} strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">Nagar Netra</div>
            <div className="hidden text-[11px] text-muted sm:block">Land Record Verification · Bhopal Municipal Corporation</div>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-canvas hover:text-ink'
                }`
              }
            >
              <Icon size={15} strokeWidth={2} />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
