"use client";

import { ChevronLeft, UserCheck, Loader2 } from "lucide-react";
import { useState } from "react";

interface HrEscalationScreenProps {
  onBack: () => void;
  onSubmit: () => void;
}

export function HrEscalationScreen({ onBack, onSubmit }: HrEscalationScreenProps) {
  const [clientName, setClientName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = clientName.trim().length > 0 && purpose.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);

    // TODO: Connect to HR submission API
    // await submitToHR({ clientName, purpose, uploads, mainCategory, subCategory });
    await new Promise(r => setTimeout(r, 1000)); // mock delay

    setIsSubmitting(false);
    onSubmit();
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 shadow-[0_8px_40px_-8px_rgba(44,47,49,0.1)] overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-outline-variant/10">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface text-sm font-medium font-body mb-6 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            Back
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface tracking-tight mb-1">
                Request HR Review
              </h2>
              <p className="text-sm text-on-surface-variant font-body leading-relaxed">
                Our HR team will verify this claim manually. Please provide a brief context to help them process it quickly.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-6 flex flex-col gap-5">
          <div>
            <label htmlFor="hr-client-name" className="block text-sm font-medium text-on-surface font-body mb-2">
              Client Name <span className="text-error">*</span>
            </label>
            <input
              id="hr-client-name"
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm rounded-xl px-4 py-3 font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-on-surface-variant/50"
            />
          </div>

          <div>
            <label htmlFor="hr-purpose" className="block text-sm font-medium text-on-surface font-body mb-2">
              Purpose of Expense <span className="text-error">*</span>
            </label>
            <textarea
              id="hr-purpose"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="Briefly describe the business purpose and why the receipt may be unclear..."
              rows={4}
              className="w-full bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm rounded-xl px-4 py-3 font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none placeholder:text-on-surface-variant/50"
            />
          </div>

          <p className="text-xs text-on-surface-variant font-body leading-relaxed bg-surface-container-low rounded-2xl p-4 border border-outline-variant/10">
            📎 Your uploaded documents will be automatically included with this request for HR to review.
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-end gap-3">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm font-body text-on-surface-variant bg-surface-container hover:bg-surface-container-high active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm font-body transition-all duration-200 ${
              canSubmit && !isSubmitting
                ? "bg-primary text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.3)] hover:bg-primary-dim hover:shadow-[0_6px_24px_rgba(70,71,211,0.4)] hover:scale-[1.02] active:scale-[0.97]"
                : "bg-primary/25 text-on-primary/50 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                Submitting…
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" strokeWidth={2} />
                Submit to HR
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
