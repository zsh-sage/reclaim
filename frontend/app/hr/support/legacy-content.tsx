"use client";

import { LifeBuoy, MessageSquare, FileText, Send, Phone, ChevronDown } from "lucide-react";

export default function SupportLegacyContent() {
  return (
    <div className="relative min-h-full p-6 md:p-10 lg:p-12">
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full bg-primary opacity-[0.07] blur-[80px]" />
        <div className="absolute top-32 right-40 w-[320px] h-[320px] rounded-full bg-tertiary opacity-[0.06] blur-[64px]" />
        <div className="absolute -top-8 right-[15%] w-[200px] h-[200px] rounded-full bg-primary-container opacity-[0.12] blur-[48px]" />
      </div>

      <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            
            <h2
              className="font-headline font-extrabold text-on-background mb-2 tracking-tight"
              style={{ fontSize: "2.5rem", letterSpacing: "-0.02em" }}
            >
              How can we help?
            </h2>
            <p className="text-on-surface-variant text-lg font-body">
              Browse our frequently asked questions, or contact HR directly if you have issues with your claims.
            </p>
          </div>
        </div>

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

                <div className="space-y-1.5">
                  <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Message Details</label>
                  <textarea
                    rows={6}
                    placeholder="Include Claim IDs if relevant..."
                    className="w-full bg-surface-container text-on-surface px-4 py-3 rounded-xl border border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm resize-none placeholder:text-on-surface-variant/50"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-4 rounded-xl font-bold text-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    Submit Request
                  </button>
                </div>
              </form>

            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
