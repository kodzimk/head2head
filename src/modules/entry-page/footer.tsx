export default function Footer() {
    return (
        <footer className="bg-white border-t border-slate-200 py-6 md:py-8">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 md:ml-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500">
            <p className="font-bold text-white">h2h</p>
          </div>
          <span className="font-bold text-xl text-slate-900">head2head</span>
        </div>
            <nav className="flex flex-wrap justify-center gap-4 md:gap-6">
              <a href="https://www.instagram.com/head2head.app" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Instagram
              </a>
              <a href="https://www.linkedin.com/company/head2head-dev" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                LinkedIn
              </a>
            </nav>
            <p className="text-xs md:text-sm text-slate-500">
              © {new Date().getFullYear()} head2head. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    )
}
