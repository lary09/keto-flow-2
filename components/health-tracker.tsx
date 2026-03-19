'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, ID, Query, type WeightLog } from '@/lib/appwrite'
import { toast } from 'sonner'
import { 
  Scale, 
  Activity, 
  TrendingDown, 
  TrendingUp, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  ChevronRight,
  Plus,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const KG_TO_LBS = 2.20462
const LBS_TO_KG = 0.453592
const CM_TO_FT = 0.0328084
const FT_TO_CM = 30.48
const IN_TO_CM = 2.54

type WeightUnit = 'kg' | 'lbs'
type HeightUnit = 'cm' | 'ft'

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

  const getHeightCm = (): number => {
    if (heightUnit === 'cm') return parseFloat(height) || 175
    const ft = parseFloat(heightFt) || 5
    const inch = parseFloat(heightIn) || 9
    return ft * FT_TO_CM + inch * IN_TO_CM
  }

  const getWeightKg = (): number => {
    const w = parseFloat(weight) || 0
    return weightUnit === 'kg' ? w : w * LBS_TO_KG
  }

  const calculateBMI = (wKg: number, hCm: number) => {
    const hMeter = hCm / 100
    return parseFloat((wKg / (hMeter * hMeter)).toFixed(1))
  }

  const handleSave = async () => {
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
      toast.success('¡Progreso guardado con éxito!')
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
    if (bmi === 0) return { label: 'Sin datos', color: 'text-muted-foreground', bg: 'bg-muted', advice: '', theme: 'sky' }
    if (bmi < 18.5) return {
      label: 'Bajo peso',
      color: 'text-sky-500',
      bg: 'bg-sky-500/10 border-sky-500/20',
      advice: 'Tu IMC indica bajo peso. Prioriza grasas saludables y proteínas para ganar masa muscular limpia.',
      theme: 'sky'
    }
    if (bmi < 25) return {
      label: 'Saludable',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      advice: '¡Excelente! Estás en el rango óptimo. Mantén tu equilibrio keto y sigue con tu actividad física.',
      theme: 'emerald'
    }
    if (bmi < 30) return {
      label: 'Sobrepeso',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/20',
      advice: 'Tu IMC indica sobrepeso. Un ligero déficit calórico y control estricto de carbohidratos te ayudará.',
      theme: 'amber'
    }
    return {
      label: 'Obesidad',
      color: 'text-red-500',
      bg: 'bg-red-500/10 border-red-500/20',
      advice: 'Es recomendable consultar con un profesional. Keto estricto y ejercicio regular son tus mejores aliados.',
      theme: 'red'
    }
  }

  const bmiInfo = getBMICategory(currentBMI)

  const bmiPercentage = useMemo(() => {
    if (currentBMI === 0) return 0
    // Visual mapping from 15 to 35 BMI range
    const min = 15
    const max = 35
    const percent = ((currentBMI - min) / (max - min)) * 100
    return Math.min(Math.max(percent, 0), 100)
  }, [currentBMI])

  const formatWeightDisplay = (kg: number) => {
    if (weightUnit === 'lbs') return `${Math.round(kg * KG_TO_LBS * 10) / 10}`
    return `${kg}`
  }

  return (
    <div className="flex flex-col gap-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      
      {/* ── BENTO DASHBOARD ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* BMI Card */}
        <Card className="bg-card/40 backdrop-blur-xl border-border/50 rounded-4xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", bmiInfo.bg)}>
                <Activity className={cn("w-6 h-6", bmiInfo.color)} />
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">IMC Actual</p>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-4xl font-black tracking-tighter transition-all", bmiInfo.color)}>
                    {currentBMI || '0.0'}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className={cn("w-fit font-bold rounded-full py-1", bmiInfo.bg, bmiInfo.color)}>
                {bmiInfo.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Weight Card */}
        <Card className="bg-card/40 backdrop-blur-xl border-border/50 rounded-4xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                <Scale className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Peso ({weightUnit})</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-foreground tracking-tighter">
                    {currentWeight ? formatWeightDisplay(currentWeight) : '0.0'}
                  </span>
                </div>
              </div>
              {weightDiff !== 0 && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "w-fit font-bold rounded-full py-1",
                    weightDiff < 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                  )}
                >
                  {weightDiff < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                  {Math.abs(weightUnit === 'lbs' ? Math.round(weightDiff * KG_TO_LBS * 10) / 10 : weightDiff)} {weightUnit}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── IMMERSIVE BMI SLIDER ── */}
      {currentBMI > 0 && (
        <Card className="bg-card/40 backdrop-blur-xl border-border/50 rounded-4xl overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Monitor de Estado</h3>
              {currentBMI < 25 && currentBMI >= 18.5 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className={cn("w-5 h-5", bmiInfo.color)} />
              )}
            </div>

            <div className="relative pt-6 pb-2">
              {/* Slider Track */}
              <div className="h-4 w-full rounded-full bg-linear-to-r from-sky-400 via-emerald-400 via-50% via-amber-400 to-red-400 opacity-80" />
              
              {/* Animated Pointer */}
              <div 
                className="absolute top-0 transition-all duration-1000 ease-out"
                style={{ left: `${bmiPercentage}%`, transform: 'translateX(-50%)' }}
              >
                <div className="relative flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-foreground border-4 border-background shadow-xl flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-background animate-pulse" />
                  </div>
                  <div className="w-0.5 h-4 bg-foreground mt-1" />
                </div>
              </div>

              {/* Labels */}
              <div className="flex justify-between mt-4 text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                <span className="flex-1 text-left">Bajo</span>
                <span className="flex-1 text-center">Saludable</span>
                <span className="flex-1 text-center">Riesgo</span>
                <span className="flex-1 text-right">Crítico</span>
              </div>
            </div>

            <div className={cn("p-4 rounded-3xl border text-xs font-medium leading-relaxed", bmiInfo.bg)}>
              <div className="flex gap-3">
                <Info className={cn("w-5 h-5 shrink-0", bmiInfo.color)} />
                <p className="text-muted-foreground">{bmiInfo.advice}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── NUMPAD INPUT SECTION ── */}
      <Card className="bg-card/40 backdrop-blur-xl border-border/50 rounded-4xl overflow-hidden">
        <CardContent className="p-6 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Nuevas Medidas</h3>
            <div className="flex bg-muted/50 p-1 rounded-xl">
              <button 
                onClick={() => setWeightUnit('kg')}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", weightUnit === 'kg' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
              >
                kg
              </button>
              <button 
                onClick={() => setWeightUnit('lbs')}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", weightUnit === 'lbs' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
              >
                lbs
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Peso Actual</p>
            <div className="relative group">
              <Input
                type="number"
                step="0.1"
                placeholder="00.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-48 h-24 text-6xl font-black text-center bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted/20 selection:bg-primary/20"
              />
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-linear-to-r from-transparent via-primary/30 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
            </div>
            <p className="text-xl font-black text-primary/40 uppercase">{weightUnit}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Altura</span>
                <button 
                  onClick={() => handleHeightUnitChange(heightUnit === 'cm' ? 'ft' : 'cm')}
                  className="text-[10px] font-bold text-primary underline underline-offset-4"
                >
                  {heightUnit === 'cm' ? 'A ft/in' : 'A cm'}
                </button>
              </div>
              
              {heightUnit === 'cm' ? (
                <div className="bg-muted/30 rounded-3xl p-4 flex flex-col items-center justify-center border border-border/30">
                  <Input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="h-10 text-2xl font-black text-center bg-transparent border-0 focus-visible:ring-0"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground">CM</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted/30 rounded-3xl p-4 flex flex-col items-center justify-center border border-border/30">
                    <Input
                      type="number"
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      className="h-10 text-2xl font-black text-center bg-transparent border-0 focus-visible:ring-0"
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">FT</span>
                  </div>
                  <div className="flex-1 bg-muted/30 rounded-3xl p-4 flex flex-col items-center justify-center border border-border/30">
                    <Input
                      type="number"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      className="h-10 text-2xl font-black text-center bg-transparent border-0 focus-visible:ring-0"
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">IN</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-end pb-1">
              <Button 
                onClick={handleSave}
                disabled={isLoading || !weight}
                className="w-full h-20 rounded-3xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all group"
              >
                {isLoading ? (
                  <Activity className="animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Plus className="w-6 h-6" />
                    <span className="text-[10px] uppercase">Registrar</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── RECENT HISTORY ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Historial de Medidas
          </h3>
          <Badge variant="outline" className="text-[10px] font-bold border-border/50">
            {logs.length} entradas
          </Badge>
        </div>

        <Card className="bg-card/40 backdrop-blur-xl border-border/50 rounded-4xl overflow-hidden p-2">
          {logs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
              <Activity className="w-12 h-12 mb-4 text-muted-foreground" />
              <p className="text-sm font-bold">Sin datos históricos</p>
              <p className="text-[10px] max-w-[150px] mt-1 uppercase">Empieza a registrar tu progreso hoy mismo.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => {
                const prev = logs[index + 1]
                const diff = prev ? Math.round((log.weight - prev.weight) * 10) / 10 : 0
                const logBmiInfo = getBMICategory(log.bmi)
                
                return (
                  <div 
                    key={log.$id}
                    className="flex items-center justify-between p-4 rounded-3xl hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner", logBmiInfo.bg)}>
                        <Scale className={cn("w-5 h-5", logBmiInfo.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">
                          {formatWeightDisplay(log.weight)} <span className="text-[10px] text-muted-foreground">{weightUnit}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                          {new Date(log.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {diff !== 0 && (
                        <div className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1",
                          diff < 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {diff > 0 ? '+' : ''}{weightUnit === 'lbs' ? Math.round(diff * KG_TO_LBS * 10) / 10 : diff}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase">IMC</span>
                        <span className={cn("text-sm font-black", logBmiInfo.color)}>{log.bmi}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </section>

    </div>
  )
}
