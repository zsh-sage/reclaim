"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  AlertCircle,
  Trash2,
  ArrowRight,
  FileText,
  Loader2,
  Inbox,
} from "lucide-react";
import { listDrafts, deleteDraft } from "@/lib/actions/claims";
import type { DraftSummary } from "@/lib/api/types";

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listDrafts().then((d) => {
      setDrafts(d);
      setLoading(false);
    });
  }, []);

  async function handleDelete(draftId: string) {
    setDeletingId(draftId);
    const result = await deleteDraft(draftId);
    if (!result.error) {
      setDrafts((prev) => prev.filter((d) => d.draft_id !== draftId));
    }
    setDeletingId(null);
  }

  function handleResume(draftId: string) {
    router.push(`/employee/claims?draft_id=${draftId}`);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full px-4 lg:px-0 pt-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface font-headline tracking-tight">
            Saved Drafts
          </h2>
          <p className="text-sm text-on-surface-variant font-body">
            Resume incomplete claim submissions.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" strokeWidth={2} />
        </div>
      )}

      {/* Empty state */}
      {!loading && drafts.length === 0 && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-[0_4px_20px_-4px_rgba(44,47,49,0.06)] flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-5">
            <Inbox className="w-7 h-7 text-outline-variant" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-on-surface font-headline mb-1.5">
            No drafts yet
          </h3>
          <p className="text-sm text-on-surface-variant font-body max-w-xs leading-relaxed mb-5">
            When you save an incomplete claim, it will appear here so you can
            resume it later.
          </p>
          <button
            onClick={() => router.push("/employee/claims")}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold font-body shadow-[0_4px_16px_rgba(70,71,211,0.25)] hover:shadow-[0_6px_24px_rgba(70,71,211,0.35)] hover:scale-[1.02] active:scale-[0.97] transition-all"
          >
            Upload New Claim
          </button>
        </div>
      )}

      {/* Draft list */}
      {!loading && drafts.length > 0 && (
        <div className="flex flex-col gap-3">
          {drafts.map((draft) => {
            const isDeleting = deletingId === draft.draft_id;
            const hasFailed = draft.failed_receipt_count > 0;

            return (
              <div
                key={draft.draft_id}
                className={`bg-surface-container-lowest rounded-2xl border shadow-[0_4px_20px_-4px_rgba(44,47,49,0.06)] overflow-hidden transition-all duration-200 hover:shadow-[0_8px_32px_-8px_rgba(44,47,49,0.1)] ${
                  hasFailed
                    ? "border-amber-200/60"
                    : "border-outline-variant/15"
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      hasFailed
                        ? "bg-amber-100/80 text-amber-600"
                        : "bg-primary/8 text-primary"
                    }`}
                  >
                    <FileText className="w-5 h-5" strokeWidth={1.75} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-on-surface font-headline truncate">
                        {draft.title || "Untitled Draft"}
                      </p>
                      {hasFailed && (
                        <span className="shrink-0 text-[10px] font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-label flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {draft.failed_receipt_count} failed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-on-surface-variant font-body w-full">
                      {draft.main_category && (
                        <span className="bg-surface-container px-2 py-0.5 rounded-md font-medium truncate min-w-0 mr-3">
                          {draft.main_category}
                        </span>
                      )}
                      <div className="flex items-center shrink-0">
                        <span className="whitespace-nowrap">
                          {draft.receipt_count} receipt
                          {draft.receipt_count !== 1 ? "s" : ""}
                        </span>
                        <span className="mx-2">&bull;</span>
                        <span className="whitespace-nowrap">{formatDate(draft.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDelete(draft.draft_id)}
                      disabled={isDeleting}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error active:scale-90 transition-all"
                      aria-label="Delete draft"
                    >
                      {isDeleting ? (
                        <Loader2
                          className="w-4 h-4 animate-spin"
                          strokeWidth={2}
                        />
                      ) : (
                        <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                      )}
                    </button>
                    <button
                      onClick={() => handleResume(draft.draft_id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold font-body shadow-[0_2px_8px_rgba(70,71,211,0.2)] hover:shadow-[0_4px_16px_rgba(70,71,211,0.3)] hover:scale-[1.02] active:scale-[0.97] transition-all"
                    >
                      Resume
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
