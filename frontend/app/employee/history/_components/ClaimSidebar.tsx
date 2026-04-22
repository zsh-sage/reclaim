"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, CheckCircle2, Clock, AlertCircle, FileText, Download } from "lucide-react";
import { Claim } from "./mockData";

interface ClaimSidebarProps {
  claim: Claim | null;
  onClose: () => void;
}

export default function ClaimSidebar({ claim, onClose }: ClaimSidebarProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Handle slide animation
  useEffect(() => {
    if (claim) {
      setIsVisible(true);
      document.body.style.overflow = "hidden"; // Prevent background scrolling on mobile
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [claim]);

  if (!claim && !isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-surface/40 backdrop-blur-sm z-60 transition-opacity duration-300 ${
          claim ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-dvh w-full sm:w-[400px] bg-surface z-70 shadow-[-8px_0_40px_rgba(0,0,0,0.08)] transform transition-transform duration-300 ease-in-out flex flex-col ${
          claim ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/10">
          <div>
            <h2 className="font-headline font-bold text-lg text-on-surface">
              Claim Details
            </h2>
            <p className="font-body text-xs text-on-surface-variant">
              {claim?.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-surface-container rounded-full text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        {claim && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Amount Status Card */}
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              <span className="font-headline font-extrabold text-3xl text-on-surface mb-1">
                {claim.amount}
              </span>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                claim.status === "Approved" ? "bg-primary/10 text-primary" :
                claim.status === "Pending" ? "bg-secondary-container/50 text-on-secondary-container" :
                claim.status === "Rejected" ? "bg-error/10 text-error" :
                "bg-tertiary/10 text-tertiary"
              }`}>
                {claim.status}
              </span>
            </div>

            {/* Merchant & Category */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-surface-variant rounded-xl text-on-surface-variant">
                <claim.categoryIcon className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-headline font-bold text-base text-on-surface">
                  {claim.merchant}
                </h3>
                <p className="font-body text-sm text-on-surface-variant">
                  {claim.category} • {claim.subCategory}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="font-headline font-semibold text-sm text-on-surface mb-4">
                Timeline
              </h4>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-outline-variant/20 before:to-transparent">
                
                {/* Step 1: Uploaded */}
                <div className="relative flex items-start gap-4 group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-primary/10 text-primary shadow shrink-0 z-10">
                    <CheckCircle2 className="w-4 h-4 fill-primary text-surface" />
                  </div>
                  <div className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-sm text-on-surface">Submitted</div>
                      <time className="font-mono text-xs text-on-surface-variant">{claim.date}</time>
                    </div>
                    <div className="text-sm text-on-surface-variant">Via Employee App</div>
                  </div>
                </div>

                {/* Step 2: AI Review */}
                <div className="relative flex items-start gap-4 group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-primary/10 text-primary shadow shrink-0 z-10">
                    {claim.status === "Pending" ? (
                      <Clock className="w-4 h-4 text-primary" />
                    ) : (
                       <CheckCircle2 className="w-4 h-4 fill-primary text-surface" />
                    )}
                  </div>
                  <div className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-sm text-on-surface">AI Validation</div>
                      {claim.status !== "Pending" && <time className="font-mono text-xs text-on-surface-variant">{claim.date}</time>}
                    </div>
                    <div className="text-sm text-on-surface-variant">
                      {claim.status === "Pending" ? "Processing receipt..." : "Policy check passed."}
                    </div>
                  </div>
                </div>

                {/* Step 3: HR Approval */}
                {(claim.status === "Approved" || claim.status === "Rejected") && (
                 <div className="relative flex items-start gap-4 group is-active">
                   <div className="flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-surface text-on-surface shadow shrink-0 z-10">
                     {claim.status === "Approved" ? (
                       <CheckCircle2 className="w-4 h-4 fill-primary text-surface" />
                     ) : (
                       <AlertCircle className="w-4 h-4 fill-error text-surface" />
                     )}
                   </div>
                   <div className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                     <div className="flex items-center justify-between mb-1">
                       <div className="font-bold text-sm text-on-surface">
                         {claim.status === "Approved" ? "HR Approved" : "HR Rejected"}
                       </div>
                       <time className="font-mono text-xs text-on-surface-variant">{claim.date}</time>
                     </div>
                     <div className="text-sm text-on-surface-variant">
                        {claim.status === "Approved" ? "Funds queued for processing." : "Out of policy guidelines."}
                     </div>
                   </div>
                 </div>
                )}
              </div>
            </div>

            {/* Receipt Thumbnail */}
            <div>
               <div className="flex items-center justify-between mb-3">
                 <h4 className="font-headline font-semibold text-sm text-on-surface">
                   Attached Receipt
                 </h4>
                 <button className="flex items-center gap-1 text-primary text-xs font-bold hover:underline">
                   <Download className="w-3 h-3" />
                   Download
                 </button>
               </div>
               
               <div className="bg-surface-container-low rounded-2xl p-2 border border-outline-variant/10 flex items-center justify-center aspect-4/3 relative overflow-hidden group cursor-pointer">
                  {/* Fake Image Placeholder since we don't have real S3 images yet */}
                  <div className="absolute inset-0 bg-linear-to-br from-surface-variant to-surface-container opacity-50" />
                  <FileText className="w-12 h-12 text-on-surface-variant/40" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-bold bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">View Full Screen</span>
                  </div>
               </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
