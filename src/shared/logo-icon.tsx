import React from 'react'

export function LogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img src = '/logo.png' className={className} />
  )
}
