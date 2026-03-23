'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Calendar, Search, Refrigerator, User, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/meal-planner', icon: Calendar, label: 'Plan' },
  { href: '/pantry', icon: Refrigerator, label: 'Despensa' },
  { href: '/recipes', icon: Search, label: 'Recetas' },
  { href: '/health', icon: Activity, label: 'Salud' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Main content area with bottom padding for nav */}
      <main className="flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="mx-auto max-w-xl rounded-[1.75rem] border border-border/70 bg-card/92 px-2 py-2 shadow-lg backdrop-blur-xl supports-backdrop-filter:bg-card/80">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-all',
                  isActive
                    ? 'bg-primary/12 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px]', isActive && 'stroke-[2.4px]')} />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
          </div>
        </div>
      </nav>
    </div>
  )
}
