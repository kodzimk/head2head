import * as React from "react"

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "competitive" | "battle" | "stats" | "minimal"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "card-competitive bg-card text-card-foreground rounded-lg border shadow-sm",
    competitive: "card-competitive bg-card text-card-foreground rounded-lg border shadow-competitive hover:shadow-lg",
    battle: "card-battle bg-card text-card-foreground rounded-lg border p-6",
    stats: "card-stats bg-card text-card-foreground rounded-lg",
    minimal: "bg-card text-card-foreground rounded-lg border border-border p-4 transition-all duration-300"
  }
  
  return (
    <div
      ref={ref}
      className={cn(variants[variant], className)}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    variant?: "default" | "competitive" | "large" | "small"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "text-2xl font-semibold leading-none tracking-tight",
    competitive: "text-2xl font-bold leading-none tracking-wide uppercase font-competitive",
    large: "text-3xl font-bold leading-none tracking-tight",
    small: "text-lg font-semibold leading-none tracking-tight"
  }
  
  return (
    <h3
      ref={ref}
      className={cn(variants[variant], className)}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    variant?: "default" | "muted" | "bright"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "text-sm text-muted-foreground",
    muted: "text-xs text-muted-foreground/80",
    bright: "text-sm text-foreground"
  }
  
  return (
    <p
      ref={ref}
      className={cn(variants[variant], className)}
      {...props}
    />
  )
})
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Specialized Card Components for Competitive Theme
const CompetitiveCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    glowEffect?: boolean
    battleState?: "active" | "victory" | "defeat" | "pending"
  }
>(({ className, glowEffect = false, battleState, children, ...props }, ref) => {
  const stateClasses = {
    active: "border-primary/50 shadow-competitive",
    victory: "border-success/50 shadow-victory",
    defeat: "border-destructive/50 shadow-defeat",
    pending: "border-warning/50 shadow-md"
  }
  
  const stateClass = battleState ? stateClasses[battleState] : ""
  const glowClass = glowEffect ? "animate-competitive-glow" : ""
  
  return (
    <Card
      ref={ref}
      variant="competitive"
      className={cn(stateClass, glowClass, className)}
      {...props}
    >
      {children}
    </Card>
  )
})
CompetitiveCard.displayName = "CompetitiveCard"

const StatsCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string | number
    label: string
    trend?: "up" | "down" | "neutral"
    icon?: React.ReactNode
  }
>(({ className, value, label, trend, icon, ...props }, ref) => {
  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground"
  }
  
  const trendColor = trend ? trendColors[trend] : "text-foreground"
  
  return (
    <Card
      ref={ref}
      variant="stats"
      className={cn("text-center", className)}
      {...props}
    >
      <CardContent className="p-4">
        {icon && (
          <div className="flex justify-center mb-2 text-primary">
            {icon}
          </div>
        )}
        <div className={cn("text-2xl font-bold", trendColor)}>
          {value}
        </div>
        <div className="text-sm text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
      </CardContent>
    </Card>
  )
})
StatsCard.displayName = "StatsCard"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CompetitiveCard,
  StatsCard
}
