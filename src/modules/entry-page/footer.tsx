import { useTranslation } from "react-i18next";

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="bg-card border-t border-border py-6 md:py-8">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 md:ml-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500">
            <p className="font-bold text-white">{t('footer.shortLogo')}</p>
          </div>
          <span className="font-bold text-xl text-white">{t('footer.fullLogo')}</span>
        </div>
            <nav className="flex flex-wrap justify-center gap-4 md:gap-6">
              <a href="https://www.instagram.com/head2head.app" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                {t('footer.instagram')}
              </a>
                <a href="https://www.linkedin.com/company/head2head-dev" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  {t('footer.linkedin')}
                </a>
                <a href="#" className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  {t('footer.support')}
                </a>           
            </nav>
            <p className="text-xs md:text-sm text-slate-500">
              © {new Date().getFullYear()} {t('footer.fullLogo')}. {t('footer.allRightsReserved')}
            </p>
          </div>
        </div>
      </footer>
    )
}
