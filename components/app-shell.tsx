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
      <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm supports-backdrop-filter:bg-card/80">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
        {/* Safe area for iOS devices */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  )
}
