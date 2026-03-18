'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, ID, Query, type WeightLog } from '@/lib/appwrite'
import { toast } from 'sonner'
import { Scale, Activity, TrendingDown, TrendingUp, History, AlertTriangle, CheckCircle2, Info, HeartPulse } from 'lucide-react'

type WeightUnit = 'kg' | 'lbs'
type HeightUnit = 'cm' | 'ft'

const KG_TO_LBS = 2.20462
const LBS_TO_KG = 0.453592
const CM_TO_FT = 0.0328084
const FT_TO_CM = 30.48
const IN_TO_CM = 2.54

export function HealthTracker() {
  const { user } = useAuth()
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('175')
  const [heightFt, setHeightFt] = useState('5')
  const [heightIn, setHeightIn] = useState('9')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm')
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
          Query.limit(10)
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

  // Sync height units
  const handleHeightUnitChange = (unit: HeightUnit) => {
    if (unit === heightUnit) return
    if (unit === 'ft') {
      const cm = parseFloat(height) || 175
      const totalInches = cm / IN_TO_CM
      setHeightFt(String(Math.floor(totalInches / 12)))
      setHeightIn(String(Math.round(totalInches % 12)))
    } else {
      const ft = parseFloat(heightFt) || 5
      const inch = parseFloat(heightIn) || 9
      const cm = Math.round(ft * FT_TO_CM + inch * IN_TO_CM)
      setHeight(String(cm))
    }
    setHeightUnit(unit)
  }

  // Get height in cm for calculation
  const getHeightCm = (): number => {
    if (heightUnit === 'cm') return parseFloat(height) || 175
    const ft = parseFloat(heightFt) || 5
    const inch = parseFloat(heightIn) || 9
    return ft * FT_TO_CM + inch * IN_TO_CM
  }

  // Get weight in kg for calculation
  const getWeightKg = (): number => {
    const w = parseFloat(weight) || 0
    return weightUnit === 'kg' ? w : w * LBS_TO_KG
  }

  const calculateBMI = (wKg: number, hCm: number) => {
    const hMeter = hCm / 100
    return parseFloat((wKg / (hMeter * hMeter)).toFixed(1))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !weight) return

    setIsLoading(true)
    const weightKg = getWeightKg()
    const heightCm = getHeightCm()
    const bmi = calculateBMI(weightKg, heightCm)

    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.WEIGHT_LOGS,
        ID.unique(),
        {
          userId: user.$id,
          weight: Math.round(weightKg * 10) / 10,
          bmi,
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
  const currentWeight = logs.length > 0 ? logs[0].weight : 0
  const previousWeight = logs.length > 1 ? logs[1].weight : 0
  const weightDiff = currentWeight && previousWeight ? Math.round((currentWeight - previousWeight) * 10) / 10 : 0

  const getBMICategory = (bmi: number) => {
    if (bmi === 0) return { label: 'Sin datos', color: 'text-muted-foreground', bg: 'bg-muted', advice: '' }
    if (bmi < 18.5) return {
      label: 'Bajo peso',
      color: 'text-sky-500',
      bg: 'bg-sky-500/10 border-sky-500/20',
      advice: '⚠️ Tu IMC indica bajo peso. En una dieta keto es importante consumir suficientes grasas saludables y proteínas para mantener masa muscular. Considera aumentar tu ingesta calórica con aguacate, nueces y aceite de oliva.'
    }
    if (bmi < 25) return {
      label: 'Normal',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      advice: '✅ ¡Excelente! Tu peso está en rango saludable. Mantén tu dieta keto equilibrada con buenas grasas, proteínas moderadas y carbohidratos bajos. ¡Sigue así!'
    }
    if (bmi < 30) return {
      label: 'Sobrepeso',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/20',
      advice: '📋 Tu IMC indica sobrepeso. La dieta keto puede ayudarte a reducirlo. Enfócate en deficit calórico moderado, prioriza proteínas magras: pollo, pescado, huevos. Reduce los snacks y mantén tus carbohidratos bajo 25g/día.'
    }
    return {
      label: 'Obesidad',
      color: 'text-red-500',
      bg: 'bg-red-500/10 border-red-500/20',
      advice: '🚨 Tu IMC indica obesidad. Te recomendamos consultar a un profesional de salud. La dieta keto estricta puede ayudar significativamente, pero es importante hacerlo bajo supervisión médica. Elimina azúcares, reduce porciones y prioriza alimentos enteros.'
    }
  }

  const bmiInfo = getBMICategory(currentBMI)

  // BMI scale percentage (for visual bar)
  const bmiPercentage = useMemo(() => {
    if (currentBMI === 0) return 0
    return Math.min(Math.max((currentBMI / 40) * 100, 5), 95)
  }, [currentBMI])

  const formatWeightDisplay = (kg: number) => {
    if (weightUnit === 'lbs') return `${Math.round(kg * KG_TO_LBS * 10) / 10} lbs`
    return `${kg} kg`
  }

  return (
    <div className="space-y-5">
      {/* Weight & Height Input Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-primary flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Registrar Medidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Weight Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-sm">Peso</Label>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setWeightUnit('kg')}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${
                    weightUnit === 'kg'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  kg
                </button>
                <button
                  type="button"
                  onClick={() => setWeightUnit('lbs')}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${
                    weightUnit === 'lbs'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  lbs
                </button>
              </div>
            </div>
            <Input
              type="number"
              step="0.1"
              placeholder={weightUnit === 'kg' ? 'Ej: 85.5' : 'Ej: 188.5'}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          {/* Height Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-sm">Altura</Label>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleHeightUnitChange('cm')}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${
                    heightUnit === 'cm'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  cm
                </button>
                <button
                  type="button"
                  onClick={() => handleHeightUnitChange('ft')}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${
                    heightUnit === 'ft'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  ft/in
                </button>
              </div>
            </div>
            {heightUnit === 'cm' ? (
              <Input
                type="number"
                placeholder="Ej: 175"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    placeholder="5"
                    value={heightFt}
                    onChange={(e) => setHeightFt(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ft</span>
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    placeholder="9"
                    value={heightIn}
                    onChange={(e) => setHeightIn(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={isLoading || !weight}
            className="w-full font-bold"
          >
            {isLoading ? 'Guardando...' : '💪 Registrar Progreso'}
          </Button>
        </CardContent>
      </Card>

      {/* BMI Dashboard */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current BMI */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-full">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">IMC</p>
                <p className={`text-2xl font-black ${bmiInfo.color}`}>
                  {currentBMI || '--'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={`mt-2 text-[10px] ${bmiInfo.color}`}>
              {bmiInfo.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Current Weight + Trend */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-full">
                <Scale className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Peso Actual</p>
                <p className="text-2xl font-black text-foreground">
                  {currentWeight ? formatWeightDisplay(currentWeight) : '--'}
                </p>
              </div>
            </div>
            {weightDiff !== 0 && (
              <Badge
                variant="outline"
                className={`mt-2 text-[10px] ${
                  weightDiff < 0 ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500 border-red-500/30'
                }`}
              >
                {weightDiff < 0 ? (
                  <TrendingDown className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingUp className="w-3 h-3 mr-1" />
                )}
                {weightDiff > 0 ? '+' : ''}{weightUnit === 'lbs' ? Math.round(weightDiff * KG_TO_LBS * 10) / 10 : weightDiff}
                {weightUnit === 'lbs' ? ' lbs' : ' kg'}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BMI Scale Bar */}
      {currentBMI > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Escala de IMC</p>
            <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-400 to-red-400">
              <div
                className="absolute top-0 h-full w-1 bg-foreground rounded-full shadow-lg shadow-foreground/30 transition-all duration-700"
                style={{ left: `${bmiPercentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground font-medium">
              <span>Bajo</span>
              <span>Normal</span>
              <span>Sobrepeso</span>
              <span>Obesidad</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BMI Advice Card */}
      {currentBMI > 0 && bmiInfo.advice && (
        <Card className={`border ${bmiInfo.bg}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex gap-3">
              <div className={`p-2 rounded-full shrink-0 h-fit ${bmiInfo.bg}`}>
                {currentBMI < 25 && currentBMI >= 18.5 ? (
                  <CheckCircle2 className={`w-5 h-5 ${bmiInfo.color}`} />
                ) : currentBMI >= 30 ? (
                  <AlertTriangle className={`w-5 h-5 ${bmiInfo.color}`} />
                ) : (
                  <Info className={`w-5 h-5 ${bmiInfo.color}`} />
                )}
              </div>
              <div>
                <p className={`text-sm font-bold ${bmiInfo.color}`}>
                  Consejo para tu IMC: {bmiInfo.label}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {bmiInfo.advice}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weight History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Historial Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="py-8 text-center border rounded-lg border-dashed">
                <HeartPulse className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No hay registros aún</p>
                <p className="text-xs text-muted-foreground">Registra tu peso para empezar a ver tu progreso</p>
              </div>
            ) : (
              logs.map((log, index) => {
                const prev = logs[index + 1]
                const diff = prev ? Math.round((log.weight - prev.weight) * 10) / 10 : 0
                return (
                  <div
                    key={log.$id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{log.date}</span>
                      <span className="text-sm font-bold text-foreground">{formatWeightDisplay(log.weight)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {diff !== 0 && (
                        <span className={`text-[10px] font-medium ${diff < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {diff > 0 ? '+' : ''}{weightUnit === 'lbs' ? Math.round(diff * KG_TO_LBS * 10) / 10 : diff}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        IMC: {log.bmi}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
