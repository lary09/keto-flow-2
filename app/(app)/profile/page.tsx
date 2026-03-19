'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, Save, Sun, Moon, Monitor, ChevronRight, Activity, Flame, Beef } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, profile, logout, updateProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(String(profile?.dailyCalorieGoal || 2000))
  const [dailyFatGoal, setDailyFatGoal] = useState(String(profile?.dailyFatGoal || 155))
  const [dailyProteinGoal, setDailyProteinGoal] = useState(String(profile?.dailyProteinGoal || 100))
  const [dailyCarbGoal, setDailyCarbGoal] = useState(String(profile?.dailyCarbGoal || 25))

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await logout()
      router.push('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveGoals = async () => {
    setIsSaving(true)
    try {
      await updateProfile({
        dailyCalorieGoal: parseInt(dailyCalorieGoal) || 2000,
        dailyFatGoal: parseInt(dailyFatGoal) || 155,
        dailyProteinGoal: parseInt(dailyProteinGoal) || 100,
        dailyCarbGoal: parseInt(dailyCarbGoal) || 25,
      })
      toast.success('¡Objetivos actualizados!')
    } catch {
      toast.error('Error al actualizar objetivos')
    } finally {
      setIsSaving(false)
    }
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  // Calculate percentages for Macro Ratio
  const fGoal = parseInt(dailyFatGoal) || 0
  const pGoal = parseInt(dailyProteinGoal) || 0
  const cGoal = parseInt(dailyCarbGoal) || 0
  const totalGrams = fGoal + pGoal + cGoal
  const fatPct = totalGrams > 0 ? Math.round((fGoal / totalGrams) * 100) : 0
  const protPct = totalGrams > 0 ? Math.round((pGoal / totalGrams) * 100) : 0
  const carbPct = totalGrams > 0 ? Math.round((cGoal / totalGrams) * 100) : 0

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 pb-24 max-w-2xl mx-auto w-full">
      
      {/* ─── HEADER ─── */}
      <header className="pt-2 pb-4">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Ajustes</h1>
      </header>

      {/* ─── USER PROFILE (APPLE ID STYLE) ─── */}
      <section className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-5 flex items-center gap-5 shadow-sm">
        <Avatar className="h-20 w-20 shadow-md ring-4 ring-background">
          <AvatarFallback className="bg-linear-to-br from-primary to-emerald-700 text-2xl font-bold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-foreground truncate">{user?.name || 'Usuario'}</p>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Keto Pro Activo
          </div>
        </div>
      </section>

      {/* ─── NUTRITIONAL GOALS (IOS LIST STYLE) ─── */}
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">Metas Diarias</h2>
        
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm">
          {/* Calories */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 group transition-colors focus-within:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/10 p-2 rounded-xl">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <span className="font-semibold text-foreground">Calorías Totales</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={dailyCalorieGoal}
                onChange={(e) => setDailyCalorieGoal(e.target.value)}
                className="w-24 text-right font-bold h-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
              <span className="text-muted-foreground text-sm font-medium">kcal</span>
            </div>
          </div>

          {/* Fat */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 group transition-colors focus-within:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="bg-keto-fat/10 p-2 rounded-xl">
                <div className="h-5 w-5 rounded-full bg-keto-fat border-2 border-background shadow-sm" />
              </div>
              <span className="font-semibold text-foreground">Grasas</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={dailyFatGoal}
                onChange={(e) => setDailyFatGoal(e.target.value)}
                className="w-20 text-right font-bold h-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
              <span className="text-muted-foreground text-sm font-medium">g</span>
            </div>
          </div>

          {/* Protein */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 group transition-colors focus-within:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="bg-keto-protein/10 p-2 rounded-xl">
                <Beef className="h-5 w-5 text-keto-protein" />
              </div>
              <span className="font-semibold text-foreground">Proteína</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={dailyProteinGoal}
                onChange={(e) => setDailyProteinGoal(e.target.value)}
                className="w-20 text-right font-bold h-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
              <span className="text-muted-foreground text-sm font-medium">g</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="flex items-center justify-between p-4 group transition-colors focus-within:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="bg-keto-carbs/10 p-2 rounded-xl">
                <Activity className="h-5 w-5 text-keto-carbs" />
              </div>
              <span className="font-semibold text-foreground">Carbohidratos</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={dailyCarbGoal}
                onChange={(e) => setDailyCarbGoal(e.target.value)}
                className="w-20 text-right font-bold h-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
              <span className="text-muted-foreground text-sm font-medium">g</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-4 px-2">
          <Button 
            className="w-full h-14 rounded-2xl font-black text-base shadow-sm active:scale-[0.98] transition-all" 
            onClick={handleSaveGoals} 
            disabled={isSaving}
          >
            {isSaving ? <Spinner className="mr-2" /> : <Save className="mr-2 h-5 w-5" />}
            Aplicar Cambios
          </Button>
        </div>
      </section>

      {/* ─── MACRO RATIO VISUALIZER ─── */}
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">Ratio Estimado</h2>
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="h-4 flex rounded-full overflow-hidden shadow-inner bg-muted">
            <div className="bg-keto-fat transition-all duration-1000" style={{ width: `${fatPct}%` }} />
            <div className="bg-keto-protein transition-all duration-1000" style={{ width: `${protPct}%` }} />
            <div className="bg-keto-carbs transition-all duration-1000" style={{ width: `${carbPct}%` }} />
          </div>
          <div className="flex justify-between text-xs font-bold text-muted-foreground px-1">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-keto-fat"/> {fatPct}%</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-keto-protein"/> {protPct}%</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-keto-carbs"/> {carbPct}%</div>
          </div>
        </div>
      </section>

      {/* ─── APPEARANCE ─── */}
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">Apariencia</h2>
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-2 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'light', icon: Sun, label: 'Claro' },
              { value: 'dark', icon: Moon, label: 'Oscuro' },
              { value: 'system', icon: Monitor, label: 'Auto' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-2xl p-4 transition-all active:scale-95 duration-200',
                  theme === option.value
                    ? 'bg-primary text-primary-foreground shadow-md font-black'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/50 font-semibold'
                )}
              >
                <option.icon className="h-6 w-6" />
                <span className="text-xs">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ACCOUNT ACTIONS ─── */}
      <section className="mt-4">
        <Button
          variant="outline"
          className="w-full h-14 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive border-border/50 font-bold active:scale-[0.98] transition-all bg-card/50 backdrop-blur-xl"
          onClick={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? <Spinner className="mr-2" /> : <LogOut className="mr-2 h-5 w-5" />}
          Cerrar Sesión
        </Button>
      </section>

      {/* ─── APP INFO ─── */}
      <div className="py-8 text-center text-xs font-semibold text-muted-foreground/50">
        <p>KetoFlow PRO OS v1.0.0</p>
        <p className="mt-0.5">Diseñado para la Inmersión</p>
      </div>
    </div>
  )
}
