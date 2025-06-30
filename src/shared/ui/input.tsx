import * as React from "react"

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "competitive" | "battle"
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "default", error = false, type, ...props }, ref) => {
    const variants = {
      default: "input-competitive rounded-md border-border focus-visible:border-primary focus-visible:ring-primary",
      competitive: "input-competitive rounded-md border-border focus-visible:border-primary focus-visible:ring-primary font-competitive text-sm uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal",
      battle: "input-competitive rounded-md border-primary/30 focus-visible:border-primary focus-visible:ring-primary bg-background/50 backdrop-blur-sm"
    }
    
    const errorClass = error ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive" : ""
    
    return (
      <input
        type={type}
        className={cn(
          variants[variant],
          errorClass,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Specialized Input Components
const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          type="search"
          className={cn("pl-10", className)}
          {...props}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

const CompetitiveInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        variant="competitive"
        className={cn("h-11 text-base", className)}
        {...props}
      />
    )
  }
)
CompetitiveInput.displayName = "CompetitiveInput"

const BattleInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        variant="battle"
        className={cn("h-12 text-lg font-semibold", className)}
        {...props}
      />
    )
  }
)
BattleInput.displayName = "BattleInput"

export { Input, SearchInput, CompetitiveInput, BattleInput }
