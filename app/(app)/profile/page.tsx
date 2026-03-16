'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Leaf, LogOut, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const router = useRouter()
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

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-sm text-muted-foreground">Gestiona tu cuenta y objetivos</p>
      </div>

      {/* User Info */}
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-lg font-semibold text-foreground">{user?.name || 'Usuario'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Daily Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Leaf className="h-5 w-5 text-primary" />
            Objetivos de Macros Diarios
          </CardTitle>
          <CardDescription>
            Configura tus objetivos diarios para la dieta keto. El estándar keto es ~70% grasas, ~20% proteína, ~5-10% carbs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="calories">Calorías Diarias (kcal)</FieldLabel>
              <Input
                id="calories"
                type="number"
                value={dailyCalorieGoal}
                onChange={(e) => setDailyCalorieGoal(e.target.value)}
                placeholder="2000"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="fat">Grasas (g)</FieldLabel>
                <Input
                  id="fat"
                  type="number"
                  value={dailyFatGoal}
                  onChange={(e) => setDailyFatGoal(e.target.value)}
                  placeholder="155"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="protein">Proteína (g)</FieldLabel>
                <Input
                  id="protein"
                  type="number"
                  value={dailyProteinGoal}
                  onChange={(e) => setDailyProteinGoal(e.target.value)}
                  placeholder="100"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="carbs">Carbs (g)</FieldLabel>
                <Input
                  id="carbs"
                  type="number"
                  value={dailyCarbGoal}
                  onChange={(e) => setDailyCarbGoal(e.target.value)}
                  placeholder="25"
                />
              </Field>
            </div>
          </FieldGroup>
          <Button className="mt-4 w-full" onClick={handleSaveGoals} disabled={isSaving}>
            {isSaving ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Objetivos
          </Button>
        </CardContent>
      </Card>

      {/* Macro Ratio Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu Ratio de Macros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Grasas', value: parseInt(dailyFatGoal) || 0, color: 'bg-keto-fat' },
              { label: 'Proteína', value: parseInt(dailyProteinGoal) || 0, color: 'bg-keto-protein' },
              { label: 'Carbs', value: parseInt(dailyCarbGoal) || 0, color: 'bg-keto-carbs' },
            ].map((macro) => {
              const totalGrams = (parseInt(dailyFatGoal) || 0) + (parseInt(dailyProteinGoal) || 0) + (parseInt(dailyCarbGoal) || 0)
              const percentage = totalGrams > 0 ? Math.round((macro.value / totalGrams) * 100) : 0
              return (
                <div key={macro.label} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-muted-foreground">{macro.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${macro.color} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-foreground">{percentage}%</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? <Spinner className="mr-2" /> : <LogOut className="mr-2 h-4 w-4" />}
        Cerrar Sesión
      </Button>

      {/* App Info */}
      <div className="py-4 text-center text-xs text-muted-foreground">
        <p>KetoFlow v1.0.0</p>
        <p className="mt-1">Tu compañero de dieta keto</p>
      </div>
    </div>
  )
}
