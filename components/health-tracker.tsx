'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, ID, Query, type WeightLog } from '@/lib/appwrite'
import { toast } from 'sonner'
import { Scale, Activity, TrendingDown, TrendingUp } from 'lucide-react'

export function HealthTracker() {
  const { user, profile } = useAuth()
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('175') // DEFAULT HEIGHT in cm
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchWeightLogs = async () => {
    if (!user) return
    try {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.WEIGHT_LOGS,
        [
          Query.equal('userId', user.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(7)
        ]
      )
      setLogs(response.documents as unknown as WeightLog[])
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  useEffect(() => {
    fetchWeightLogs()
  }, [user])

  const calculateBMI = (w: number, h: number) => {
    const hMeter = h / 100
    return parseFloat((w / (hMeter * hMeter)).toFixed(2))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !weight) return

    setIsLoading(true)
    const weightNum = parseFloat(weight)
    const heightNum = parseFloat(height)
    const bmi = calculateBMI(weightNum, heightNum)

    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.WEIGHT_LOGS,
        ID.unique(),
        {
          userId: user.$id,
          weight: weightNum,
          bmi: bmi,
          date: new Date().toISOString().split('T')[0]
        }
      )
      toast.success('¡Progreso guardado!')
      setWeight('')
      fetchWeightLogs()
    } catch (error) {
      toast.error('Error al guardar: ' + (error as any).message)
    } finally {
      setIsLoading(false)
    }
  }

  const currentBMI = logs.length > 0 ? logs[0].bmi : 0
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Bajo peso', color: 'text-blue-500' }
    if (bmi < 25) return { label: 'Normal', color: 'text-green-500' }
    if (bmi < 30) return { label: 'Sobrepeso', color: 'text-yellow-500' }
    return { label: 'Obesidad', color: 'text-red-500' }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-emerald-500/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-emerald-400 flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Control de Peso e IMC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-slate-300">Peso (kg)</Label>
              <Input 
                id="weight"
                type="number" 
                step="0.1"
                placeholder="Ej: 85.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height" className="text-slate-300">Altura (cm)</Label>
              <Input 
                id="height"
                type="number" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white focus:border-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {isLoading ? 'Guardando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Tu IMC Actual</p>
                  <p className={`text-2xl font-bold ${getBMICategory(currentBMI).color}`}>
                    {currentBMI || '--'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-semibold">Estado</p>
                <p className="font-medium text-slate-200">{getBMICategory(currentBMI).label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                Historial Reciente
              </p>
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No hay registros aún.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.$id} className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-400">{log.date}</span>
                    <span className="text-sm font-bold text-slate-200">{log.weight} kg</span>
                    <span className="text-xs font-medium text-blue-400">IMC: {log.bmi}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
