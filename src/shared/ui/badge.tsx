import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

const badgeVariants = cva(
  "inline-flex items-center font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "text-foreground border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        success:
          "border-transparent bg-success text-white hover:bg-success/90 shadow-sm",
        warning:
          "border-transparent bg-warning text-black hover:bg-warning/90 shadow-sm",
        competitive:
          "border-transparent bg-gradient-to-r from-primary to-primary-light text-primary-foreground font-competitive uppercase tracking-wider shadow-competitive hover:shadow-lg",
        victory:
          "border-transparent bg-success text-white font-bold uppercase tracking-wide shadow-victory animate-victory-pulse",
        defeat:
          "border-transparent bg-destructive text-white font-bold uppercase tracking-wide shadow-defeat",
        pending:
          "border-transparent bg-warning text-black font-semibold uppercase tracking-wide shadow-sm",
        live:
          "border-transparent bg-primary text-primary-foreground font-bold uppercase tracking-wide animate-competitive-glow",
      },
      size: {
        default: "rounded-md px-2.5 py-0.5 text-xs",
        sm: "rounded-md px-2 py-0.5 text-xs",
        lg: "rounded-md px-3 py-1 text-sm",
        xl: "rounded-lg px-4 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, pulse = false, ...props }, ref) => {
    const pulseClass = pulse ? "animate-pulse" : ""
    
    return (
      <div 
        ref={ref}
        className={cn(badgeVariants({ variant, size }), pulseClass, className)} 
        {...props} 
      />
    )
  }
)
Badge.displayName = "Badge"

// Specialized Badge Components
const StatusBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    status: "active" | "inactive" | "pending" | "completed" | "error"
    showIndicator?: boolean
  }
>(({ className, status, showIndicator = true, children, ...props }, ref) => {
  const statusVariants = {
    active: { variant: "success" as const, text: "Active" },
    inactive: { variant: "secondary" as const, text: "Inactive" },
    pending: { variant: "warning" as const, text: "Pending" },
    completed: { variant: "success" as const, text: "Completed" },
    error: { variant: "destructive" as const, text: "Error" }
  }
  
  const config = statusVariants[status]
  
  return (
    <Badge
      ref={ref}
      variant={config.variant}
      className={cn("gap-1", className)}
      {...props}
    >
      {showIndicator && (
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children || config.text}
    </Badge>
  )
})
StatusBadge.displayName = "StatusBadge"

const BattleBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    state: "victory" | "defeat" | "live" | "pending"
    animated?: boolean
  }
>(({ className, state, animated = true, children, ...props }, ref) => {
  const stateConfig = {
    victory: { variant: "victory" as const, text: "Victory", icon: "🏆" },
    defeat: { variant: "defeat" as const, text: "Defeat", icon: "💀" },
    live: { variant: "live" as const, text: "Live", icon: "🔴" },
    pending: { variant: "pending" as const, text: "Pending", icon: "⏳" }
  }
  
  const config = stateConfig[state]
  const animationClass = animated && state === "live" ? "animate-competitive-glow" : ""
  
  return (
    <Badge
      ref={ref}
      variant={config.variant}
      size="lg"
      className={cn("gap-1", animationClass, className)}
      {...props}
    >
      <span>{config.icon}</span>
      {children || config.text}
    </Badge>
  )
})
BattleBadge.displayName = "BattleBadge"

const CompetitiveBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    rank?: number
    level?: string
    glowing?: boolean
  }
>(({ className, rank, level, glowing = false, children, ...props }, ref) => {
  const glowClass = glowing ? "animate-competitive-glow" : ""
  
  return (
    <Badge
      ref={ref}
      variant="competitive"
      size="lg"
      className={cn("gap-1", glowClass, className)}
      {...props}
    >
      {rank && <span className="font-black">#{rank}</span>}
      {level && <span className="font-mono">{level}</span>}
      {children}
    </Badge>
  )
})
CompetitiveBadge.displayName = "CompetitiveBadge"

export { Badge, badgeVariants, StatusBadge, BattleBadge, CompetitiveBadge }
