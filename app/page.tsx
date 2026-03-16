'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Leaf, TrendingUp, Calendar, ShoppingCart, Utensils } from 'lucide-react'

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">KetoFlow</span>
        </div>
      </div>
    )
  }

  const features = [
    {
      icon: TrendingUp,
      title: 'Seguimiento de Macros',
      description: 'Monitoriza tu ingesta diaria de grasas, proteínas y carbs con hermosos anillos de progreso',
    },
    {
      icon: Calendar,
      title: 'Planifica Comidas',
      description: 'Programa tus comidas keto de la semana con nuestro planificador intuitivo',
    },
    {
      icon: Utensils,
      title: 'Descubre Recetas',
      description: 'Explora miles de deliciosas recetas keto-friendly',
    },
    {
      icon: ShoppingCart,
      title: 'Listas de Compras',
      description: 'Genera y gestiona listas de compras a partir de tus planes de comidas',
    },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Hero Section */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">KetoFlow</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Inicia Sesión</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Comienza Ahora</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Tu Compañero Completo para la Dieta Keto
            </h1>
            <p className="mt-4 text-pretty text-lg text-muted-foreground sm:text-xl">
              Sigue tus macros, planifica comidas, descubre recetas y mantente al día con tu estilo de vida keto con KetoFlow.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">Empieza Gratis Hoy</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Ya tengo una cuenta</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-card px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              Todo lo que necesitas para el éxito en keto
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-foreground">¿Listo para comenzar tu viaje keto?</h2>
          <p className="mt-2 text-muted-foreground">Únete a miles de personas que logran sus objetivos de salud con KetoFlow.</p>
          <Button className="mt-6" size="lg" asChild>
            <Link href="/register">Crea una Cuenta Gratis</Link>
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
        <p>KetoFlow - Tu seguidor de dieta keto</p>
      </footer>
    </div>
  )
}
