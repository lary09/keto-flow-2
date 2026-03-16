'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Leaf, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{ text: string; details?: string; success?: boolean } | null>(null)

  const handleTestConnection = async () => {
    setConnectionStatus({ text: 'Probando conexión desde el servidor...' })
    try {
      const response = await fetch('/api/test-appwrite')
      const result = await response.json()
      
      if (result.overallSuccess) {
        setConnectionStatus({ 
          text: result.message, 
          details: `Endpoint: ${result.endpoint}`, 
          success: true 
        })
        toast.success('¡Conexión con Appwrite exitosa!')
      } else {
        setConnectionStatus({ 
          text: result.message || 'Connection failed', 
          details: JSON.stringify(result.tests, null, 2), 
          success: false 
        })
        toast.error(`Conexión fallida: ${result.message}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setConnectionStatus({ text: 'Prueba fallida', details: errorMessage, success: false })
      toast.error('Error al ejecutar la prueba de conexión')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Por favor, rellena todos los campos')
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      toast.success('¡Bienvenido de nuevo!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Email o contraseña incorrectos')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Leaf className="h-7 w-7 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold text-foreground">KetoFlow</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bienvenido de nuevo</CardTitle>
          <CardDescription>Inicia sesión para continuar tu viaje keto</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Correo Electrónico</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Introduce tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Spinner className="mr-2" /> : null}
              Iniciar Sesión
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {"¿No tienes una cuenta?"}{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Regístrate
              </Link>
            </p>
            <div className="w-full border-t pt-4">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="w-full text-xs" 
                onClick={handleTestConnection}
              >
                Probar conexión con Appwrite
              </Button>
              {connectionStatus && (
                <div className="mt-2 space-y-1">
                  <p className={`text-center text-xs font-medium ${connectionStatus.success ? 'text-primary' : connectionStatus.success === false ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {connectionStatus.text}
                  </p>
                  {connectionStatus.details && (
                    <p className="text-center text-xs text-muted-foreground">
                      {connectionStatus.details}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
