import { HealthTracker } from '@/components/health-tracker'

export default function HealthPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="pt-2">
        <h1 className="text-3xl font-black text-foreground">Mi Progreso</h1>
        <p className="text-sm font-semibold text-muted-foreground mt-1">Seguimiento de peso, IMC y salud asimétrica</p>
      </header>
      
      <HealthTracker />
    </div>
  )
}
