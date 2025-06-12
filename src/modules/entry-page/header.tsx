import React from 'react'
import { MobileNav } from '../../shared/mobile-nav'
import { Button } from '../../shared/ui/button'

export default function Header() {
    return (
    <header className="px-4 lg:px-6 h-16 flex items-center justify-between bg-white/60 backdrop-blur border-b border-slate-200 fixed top-0 w-full z-50">
      <a href="#hero" className="flex items-center justify-center ml-10">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Head2Head Logo" width={32} height={32} />
          <span className="font-bold text-xl text-slate-900">Head2Head</span>
        </div>
      </a>
      <nav className="ml-auto hidden md:flex gap-6 items-center mr-10">
        <Button className="max-w-72 bg-blue-600 hover:bg-blue-700 text-white">Start Now!</Button>
      </nav>
      <div className="ml-auto md:hidden">
        <MobileNav />
      </div>
    </header>
    )
}