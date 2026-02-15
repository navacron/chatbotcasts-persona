import Header from "@/components/header"
import Footer from "@/components/footer"
import { Mail, MessageSquare, Clock } from "lucide-react"

export default function ContactPage() {

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="space-y-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">Get in Touch</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions or feedback? We'd love to hear from you.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-16">
        <div className="space-y-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Information</h2>
            <p className="text-muted-foreground">
              Have questions or feedback? Reach out to us and we'll get back to you soon.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 border border-border rounded-lg p-6 text-center">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Email</h3>
              <a
                href="mailto:contact@scandification.com"
                className="text-sm text-primary hover:underline break-all"
              >
                contact@scandification.com
              </a>
            </div>

            <div className="bg-gray-50 border border-border rounded-lg p-6 text-center">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Response Time</h3>
              <p className="text-sm text-muted-foreground">
                We typically respond within 1-2 business days
              </p>
            </div>

            <div className="bg-gray-50 border border-border rounded-lg p-6 text-center">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Support</h3>
              <p className="text-sm text-muted-foreground">
                For questions, feedback, or assistance
              </p>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  )
}
