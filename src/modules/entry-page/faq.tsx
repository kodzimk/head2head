import React from 'react'
import { Card, CardContent } from "../../shared/ui/card"
import { ChevronDown } from "lucide-react"

export default function FAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  const faqs = [
    {
      question: "What is Head2Head?",
      answer: "Head2Head is a real-time sports trivia platform where you can challenge friends and players worldwide to test your sports knowledge. Compete in various battle modes and climb the leaderboards!"
    },
    {
      question: "When are tournaments held?",
      answer: "Tournaments are held every week on Sunday at 10:00 AM UTC. You can check the tournament schedule on the website."
    },
    {
      question: "Is it free to play?",
      answer: "Yes, Head2Head is completely free to play! We offer various features and battle modes at no cost. Premium features may be added in the future."
    },
    {
      question: "Do you have a mobile app?",
      answer: "No, we don't have a mobile app yet. But we are working on it and it will be available soon."
    },
    {
      question: "Another type of question?",
      answer: "question@head2head.com"
    },
 
  ]

  return (
    <section id="faq" className="w-full py-16 md:py-24 bg-gradient-to-b from-gray-50 to-orange-50 scroll-mt-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about Head2Head
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <Card
              key={index}
              className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors duration-300 ">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-all duration-300 group-hover:text-orange-600 ${
                      openIndex === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`mt-4 text-gray-600 overflow-hidden transition-all duration-500 ease-in-out ${
                    openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="leading-relaxed">{faq.answer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
} 