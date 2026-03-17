import { HealthTracker } from '@/components/health-tracker'

export default function HealthPage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Progreso</h1>
        <p className="text-sm text-muted-foreground">Seguimiento de peso, IMC y salud</p>
      </div>
      
      <HealthTracker />
    </div>
  )
}
