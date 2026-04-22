"use client";

import { LifeBuoy, MessageSquare, FileText, Send, Phone, ChevronDown } from "lucide-react";

export default function SupportPage() {
  return (
    <main className="min-h-dvh pb-24 md:pb-12 bg-surface">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ── Header ── */}
        <header className="mb-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-primary mb-3">
            <LifeBuoy className="w-6 h-6" />
            <span className="font-label font-bold tracking-widest uppercase text-sm">Help Center</span>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">
            How can we help?
          </h1>
          <p className="font-body text-base md:text-lg text-on-surface-variant mt-3 max-w-2xl">
            Browse our frequently asked questions, or contact HR directly if you have issues with your claims.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* ── Left / Top: FAQ Quick Links ── */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="font-headline font-bold text-xl text-on-surface mb-2">Quick Resources</h2>
            
            {[
              { title: "Claim Policy Guide", desc: "Understand what can be reimbursed.", icon: FileText },
              { title: "Uploading Receipts", desc: "Best practices for OCR extraction.", icon: FileText },
              { title: "Direct Deposit Setup", desc: "Learn how payouts are scheduled.", icon: FileText },
            ].map((faq, i) => (
              <div key={i} className="bg-surface-container-low border border-outline-variant/10 p-4 rounded-2xl hover:bg-surface-container cursor-pointer transition-colors group">
                <div className="flex items-start gap-3">
                  <faq.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-headline font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">{faq.title}</h3>
                    <p className="font-body text-xs text-on-surface-variant mt-1">{faq.desc}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-8 p-5 rounded-2xl bg-primary-container text-on-primary-container">
               <Phone className="w-6 h-6 mb-3" />
               <h3 className="font-headline font-bold text-base mb-1">Urgent Escalations</h3>
               <p className="font-body text-sm opacity-80 mb-4">Need immediate help with a rejected claim?</p>
               <button className="w-full py-2 bg-on-primary-container text-primary-container rounded-xl font-bold text-sm shadow-sm hover:scale-[0.98] transition-transform">
                 Call HR Desk
               </button>
            </div>
          </div>

          {/* ── Right / Main: Contact Form ── */}
          <div className="md:col-span-2">
            <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div>
                  <h2 className="font-headline font-bold text-xl text-on-surface mb-1">Submit a Ticket</h2>
                  <p className="font-body text-sm text-on-surface-variant">Send a direct message to support staff.</p>
                </div>
                <div className="p-3 bg-surface-variant rounded-xl text-on-surface-variant">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>

              <form className="p-6 space-y-5 flex-1" onSubmit={(e) => e.preventDefault()}>
                
                <div className="space-y-1.5">
                  <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Issue Type</label>
                  <div className="relative">
                    <select className="appearance-none w-full bg-surface-container text-on-surface px-4 py-3 rounded-xl border border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body text-sm cursor-pointer">
                      <option>Claim Rejected</option>
                      <option>Technical Issue (App Bug)</option>
                      <option>Payment Delayed</option>
                      <option>Update Banking Details</option>
                      <option>Other</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Subject</label>
                  <input type="text" placeholder="Brief description of the problem" className="w-full bg-surface-container text-on-surface px-4 py-3 rounded-xl border border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm placeholder:text-on-surface-variant/50" />
                </div>

                <div className="space-y-1.5 h-full">
                  <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Message Details</label>
                  <textarea 
                    rows={6}
                    placeholder="Include Claim IDs if relevant..." 
                    className="w-full bg-surface-container text-on-surface px-4 py-3 rounded-xl border border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm resize-none placeholder:text-on-surface-variant/50" 
                  />
                </div>

                <button className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-3.5 rounded-xl font-bold text-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all mt-4">
                  <Send className="w-4 h-4" />
                  Submit Request
                </button>
              </form>

            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
