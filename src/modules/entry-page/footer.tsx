import React from 'react'

export default function Footer() {
    return (
        <footer className="bg-white border-t border-slate-200 py-6 md:py-8">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2 ml-10">
              <img src="/logo.png" alt="Head2Head Logo" width={24} height={24} />
              <span className="font-semibold text-slate-900">Head2Head</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-4 md:gap-6">
              <a href="#" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Support
              </a>
              <a href="#" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Discord
              </a>
              <a href="#" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                LinkedIn
              </a>
            </nav>
            <p className="text-xs md:text-sm text-slate-500">
              © {new Date().getFullYear()} Head2Head. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    )
}
