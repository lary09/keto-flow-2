'use client'

import { cn } from '@/lib/utils'

interface MacroRingProps {
  value: number
  max: number
  label: string
  unit?: string
  color: 'fat' | 'protein' | 'carbs' | 'calories'
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
}

const colorClasses = {
  fat: 'stroke-keto-fat',
  protein: 'stroke-keto-protein',
  carbs: 'stroke-keto-carbs',
  calories: 'stroke-keto-calories',
}

const sizeConfig = {
  sm: { size: 64, strokeWidth: 6, fontSize: 'text-xs', labelSize: 'text-[10px]' },
  md: { size: 80, strokeWidth: 7, fontSize: 'text-sm', labelSize: 'text-xs' },
  lg: { size: 120, strokeWidth: 10, fontSize: 'text-xl', labelSize: 'text-sm' },
}

export function MacroRing({
  value,
  max,
  label,
  unit = 'g',
  color,
  size = 'md',
  showPercentage = false,
}: MacroRingProps) {
  const config = sizeConfig[size]
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const radius = (config.size - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: config.size, height: config.size }}>
        <svg
          className="-rotate-90 transform"
          width={config.size}
          height={config.size}
          viewBox={`0 0 ${config.size} ${config.size}`}
        >
          {/* Background circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            className={cn(colorClasses[color], 'transition-all duration-500 ease-out')}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-semibold text-foreground', config.fontSize)}>
            {showPercentage ? `${Math.round(percentage)}%` : Math.round(value)}
          </span>
          {!showPercentage && (
            <span className={cn('text-muted-foreground', config.labelSize)}>{unit}</span>
          )}
        </div>
      </div>
      <span className={cn('font-medium text-foreground', config.labelSize)}>{label}</span>
      {!showPercentage && (
        <span className={cn('text-muted-foreground', config.labelSize)}>
          / {max}{unit}
        </span>
      )}
    </div>
  )
}
