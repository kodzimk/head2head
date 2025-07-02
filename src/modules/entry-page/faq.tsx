import React from 'react'
import { Card, CardContent } from "../../shared/ui/card"
import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"

export default function FAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)
  const { t } = useTranslation()

  const faqs = [
    {
      question: t('faq.whatIsHead2Head.question'),
      answer: t('faq.whatIsHead2Head.answer')
    },
    {
      question: t('faq.tournaments.question'),
      answer: t('faq.tournaments.answer')
    },
    {
      question: t('faq.isFree.question'),
      answer: t('faq.isFree.answer')
    },
    {
      question: t('faq.mobileApp.question'),
      answer: t('faq.mobileApp.answer')
    },
    {
      question: t('faq.contact.question'),
      answer: t('faq.contact.answer')
    }
  ]

  return (
    <section id="faq" className="w-full py-8 sm:py-12 md:py-16 lg:py-24 bg-gradient-to-br from-surface-1/60 via-primary/8 to-orange-500/10 scroll-mt-16">
      <div className="container responsive-padding">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12 animate-fade-in">
          <h2 className="text-responsive-lg font-bold text-foreground mb-2 sm:mb-4 tracking-tight">
            {t('faq.title')}
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-primary to-orange-500 mx-auto mb-3 sm:mb-4 rounded-full"></div>
          <p className="text-responsive-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('faq.subtitle')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <Card
              key={index}
              className="card-surface backdrop-blur-sm border-border hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/30"
            >
              <CardContent className="p-4 sm:p-6">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="py-2 w-full flex items-center justify-between text-left group"
                >
                  <h3 className="text-responsive-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground transition-all duration-300 group-hover:text-primary ${
                      openIndex === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`mt-3 sm:mt-4 text-muted-foreground overflow-hidden transition-all duration-500 ease-in-out ${
                    openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-responsive-sm leading-relaxed">{faq.answer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
} 