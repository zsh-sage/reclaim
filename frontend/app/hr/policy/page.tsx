"use client";

import React, { JSX, useRef, useState, useEffect } from 'react';
import { Plus, Search, ChevronUp, ChevronDown, ChevronRight, FileText, Shield, Archive, Pencil, Trash2, ArrowLeft, X, SlidersHorizontal, Upload, Settings, CheckCircle2, ScanLine, Sparkles, History, Clock, User, PlusCircle, AlertCircle, ShieldCheck, Users, Calendar, BarChart3, Banknote } from 'lucide-react';
import { MOCK_POLICIES, POLICY_STATUS_STYLE, Policy, PolicyStatus } from '../hr_components/mockData';
import { uploadPolicy } from '@/lib/actions/hr';
import { getPolicies, deletePolicy, updatePolicyCategories } from '@/lib/actions/policies';

const SAVE_STEPS = [
  { id: "upload", label: "Uploading documents...", subtitle: "Securely storing policy files." },
  { id: "analyze", label: "Analyzing policy...", subtitle: "Extracting summary and conditions." },
  { id: "save", label: "Saving changes...", subtitle: "Updating policy database." },
];

export function HrProcessingScreen({ currentStep, onBack }: { currentStep: number, onBack: () => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-center my-12">
      <div className="relative rounded-3xl overflow-hidden shadow-[0_24px_80px_-16px_rgba(44,47,49,0.18)] flex flex-col sm:flex-row min-h-[460px] w-full">
        <div
          className="sm:w-[42%] p-8 flex flex-col justify-between relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #4647d3 0%, #9396ff 50%, #9e00b4 100%)" }}
        >
          <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-900/20 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4 pointer-events-none" />

          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6">
              <ScanLine className="w-6 h-6 text-white" strokeWidth={1.75} />
            </div>
            <h2 className="font-headline text-2xl font-bold text-white tracking-tight leading-snug">
              Saving<br />Changes
            </h2>
          </div>

          <div className="relative z-10 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            <p className="text-[10px] text-white/70 font-label font-semibold uppercase tracking-widest mb-1">
              System Status
            </p>
            <p className="text-white text-sm font-semibold font-body">Reclaim AI Active</p>
          </div>
        </div>

        <div className="flex-1 bg-surface-container-lowest p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-10">
            <div
              className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center shrink-0"
              style={{ animation: "spin 3s linear infinite" }}
            >
              <Settings className="w-5 h-5 text-primary" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-headline text-lg font-semibold text-on-surface leading-tight">
                Processing Data
              </h3>
              <p className="text-on-surface-variant text-sm font-body mt-0.5">
                Please do not close this window.
              </p>
            </div>
          </div>

          <div className="relative ml-3">
            <div className="absolute top-3 bottom-3 left-[11px] w-0.5 bg-surface-container-high rounded-full" />
            <div
              className="absolute top-3 left-[11px] w-0.5 bg-primary rounded-full transition-all duration-700 ease-in-out"
              style={{
                height:
                  currentStep === 0 ? "0%" :
                    currentStep === 1 ? "40%" :
                      "80%",
              }}
            />

            <div className="flex flex-col gap-8">
              {SAVE_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isActive = idx === currentStep;
                const isPending = idx > currentStep;

                return (
                  <div key={step.id} className="flex items-start gap-5 relative">
                    {isCompleted && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 shadow-[0_4px_12px_rgba(70,71,211,0.35)] z-10">
                        <CheckCircle2 className="w-3.5 h-3.5 text-on-primary" strokeWidth={2.5} />
                      </div>
                    )}
                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-primary border-[3px] border-surface-container-lowest flex items-center justify-center shrink-0 mt-0.5 relative z-10 shadow-[0_0_0_2px_#4647d3]">
                        <div className="absolute inset-[-4px] rounded-full border-2 border-primary/50 animate-ping" />
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                    {isPending && (
                      <div className="w-6 h-6 rounded-full bg-surface-container border border-outline-variant/30 shrink-0 mt-0.5 z-10" />
                    )}

                    <div>
                      <p className={`font-semibold text-sm leading-tight font-headline ${isActive ? "text-primary" :
                        isCompleted ? "text-on-surface" :
                          "text-on-surface-variant/40"
                        }`}>
                        {step.label}
                      </p>
                      {(isCompleted || isActive) && (
                        <p className="text-on-surface-variant text-xs mt-1 font-body leading-relaxed">
                          {step.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <button
              onClick={onBack}
              className="px-6 py-2 border border-outline-variant/30 text-on-surface-variant text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              Abort and Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PolicyStudio() {
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PolicyStatus>("Active");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // File upload state
  const [mainPolicyFile, setMainPolicyFile] = useState<File | null>(null);
  const [appendixFiles, setAppendixFiles] = useState<File[]>([]);
  const mainPolicyInputRef = useRef<HTMLInputElement>(null);
  const appendixInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (mainPolicyFile && mainPolicyFile.type === "application/pdf") {
      const url = URL.createObjectURL(mainPolicyFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [mainPolicyFile]);

  // Form state
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [savingStep, setSavingStep] = useState(0);
  const [policyFileError, setPolicyFileError] = useState<string | null>(null);
  const POLICY_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const [conditionsModalOpen, setConditionsModalOpen] = useState(false);
  const [editConditions, setEditConditions] = useState<Record<string, any> | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editOverviewSummary, setEditOverviewSummary] = useState<string>("");
  const [editHistory, setEditHistory] = useState<{ user: string, action: string, date: string, details?: string }[]>([]);

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingPolicyId, setDeletingPolicyId] = useState<string | null>(null);
  const [deletingPolicyName, setDeletingPolicyName] = useState<string>("");

  // Existing files state (for edit view)
  const [existingMainPolicyDeleted, setExistingMainPolicyDeleted] = useState(false);
  const [existingAppendix, setExistingAppendix] = useState<{ name: string, size: string }[]>([
    { name: "W10_Requirements_Review.pdf", size: "1.2 MB" },
    { name: "Ergonomic_Guidelines_2023.pdf", size: "845 KB" }
  ]);

  // Sync scroll refs
  const editContainerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const [rightOffset, setRightOffset] = useState(0);
  const [leftOffset, setLeftOffset] = useState(0);

  useEffect(() => {
    const container = editContainerRef.current;
    if (!container || !editingPolicy) return;

    const handleScroll = () => {
      const left = leftColRef.current;
      const right = rightColRef.current;
      if (!left || !right) return;

      const leftH = left.scrollHeight;
      const rightH = right.scrollHeight;
      const containerH = container.clientHeight;
      const scrollT = container.scrollTop;
      const maxScroll = container.scrollHeight - containerH;

      if (maxScroll <= 0) return;

      const ratio = Math.min(Math.max(scrollT / maxScroll, 0), 1);

      if (leftH > rightH) {
        // Left is longer, move Right down so they finish together
        const diff = leftH - rightH;
        setRightOffset(diff * ratio);
        setLeftOffset(0);
      } else if (rightH > leftH) {
        // Right is longer, move Left down
        const diff = rightH - leftH;
        setLeftOffset(diff * ratio);
        setRightOffset(0);
      } else {
        setLeftOffset(0);
        setRightOffset(0);
      }
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    // Use ResizeObserver to handle content changes (like adding appendix files)
    const observer = new ResizeObserver(handleScroll);
    if (leftColRef.current) observer.observe(leftColRef.current);
    if (rightColRef.current) observer.observe(rightColRef.current);

    // Initial calculation
    setTimeout(handleScroll, 100);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, [editingPolicy, editConditions, appendixFiles, existingAppendix, existingMainPolicyDeleted, editName, editDepartment]);

  useEffect(() => {
    if (editingPolicy) {
      setIsLoadingDetails(true);
      const timer = setTimeout(() => setIsLoadingDetails(false), 600);
      return () => clearTimeout(timer);
    }
  }, [editingPolicy]);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function parseMandatoryConditions(raw: string | Record<string, any> | undefined | null): Record<string, any> | null {
    if (!raw) return null;
    if (typeof raw === 'object') return raw as Record<string, any>;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {
      // Not valid JSON — ignore
    }
    return null;
  }

  const [policies, setPolicies] = useState<Policy[]>(MOCK_POLICIES);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Persistence: Load deleted IDs and Local Edits
  useEffect(() => {
    const deletedIds = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('deleted_policy_ids') || '[]') : [];
    const localEdits = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('local_policy_edits') || '{}') : {};

    const applyEdits = (list: Policy[]) => {
      return list
        .filter(p => !deletedIds.includes(p.id))
        .map(p => {
          if (localEdits[p.id]) {
            // Apply saved edits (ignoring the icon as it's a React component)
            const { icon, ...editedData } = localEdits[p.id];
            return { ...p, ...editedData };
          }
          return p;
        });
    };

    // 1. Initial filter for mock policies
    setPolicies(applyEdits(MOCK_POLICIES));

    // 2. Load from backend
    getPolicies().then((backendPolicies) => {
      if (backendPolicies.length === 0) return;
      // Map backend Policy type (from types.ts) → local Policy shape (mockData.ts)
      const mapped: Policy[] = backendPolicies.map((p) => ({
        id: p.policy_id,
        name: p.title,
        version: "V1.0",
        department: "General",
        lastModified: p.effective_date
          ? new Date(p.effective_date).toLocaleDateString("en-MY", { month: "short", day: "numeric", year: "numeric" })
          : "",
        status: (p.status === "ACTIVE" ? "Active" : p.status === "DEPRECATED" ? "Expired" : "Impending") as PolicyStatus,
        icon: FileText,
        overview_summary: p.overview_summary,
        aiConditions: parseMandatoryConditions(p.mandatory_conditions) ?? undefined,
        history: [],
      }));
      // Merge: prepend real policies, keep mocks as fallback examples
      setPolicies([...mapped, ...MOCK_POLICIES]);
    }).catch(() => {
      // Keep mock data on error
    });
  }, []);

  // Status dropdown & edit states
  const [editStatus, setEditStatus] = useState<PolicyStatus>("Active");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  useEffect(() => {
    if (editingPolicy && editingPolicy !== "new") {
      const p = policies.find(x => x.id === editingPolicy);
      if (p) {
        setEditStatus(p.status);
        setEditName(p.name);
        setEditDepartment(p.department);
        setEditVersion(p.version);
        setEditDate("2023-10-12");
        setExistingMainPolicyDeleted(false);
        setEditOverviewSummary(p.overview_summary || "");
        setEditConditions(p.aiConditions || null);
        setEditingPolicyId(p.id || null);

        // Initialize budgets from policy data (or from categories)
        const budgets: Record<string, string> = {};
        if (p.reimbursable_categories_with_budgets) {
          p.reimbursable_categories_with_budgets.forEach((cat: any) => {
            budgets[cat.category] = cat.auto_approval_budget?.toString() ?? "";
          });
        } else if (p.aiConditions) {
          // Fallback: initialize empty budgets for each category
          Object.keys(p.aiConditions).forEach(cat => {
            budgets[cat] = "";
          });
        }
        setCategoryBudgets(budgets);

        setEditHistory(p.history || [
          { user: "Sarah Miller", action: "Policy Created", date: "Oct 12, 2023", details: "Initial draft uploaded" },
          { user: "James Wilson", action: "Updated Appendix", date: "Jan 15, 2024", details: "Added W10 Requirements Review" }
        ]);
        if (p.existingAppendix) {
          setExistingAppendix(p.existingAppendix);
        } else {
          setExistingAppendix([
            { name: "W10_Requirements_Review.pdf", size: "1.2 MB" },
            { name: "Ergonomic_Guidelines_2023.pdf", size: "845 KB" }
          ]);
        }
        setAppendixFiles(p.appendixFiles || []);
        setMainPolicyFile(p.mainFile || null);
      }
    } else if (editingPolicy === "new") {
      setEditStatus("Active");
      setEditName("");
      setEditDepartment("");
      setEditVersion("");
      setEditDate("");
      setEditOverviewSummary("");
      setEditConditions(null);
      setEditingPolicyId(null);
      setCategoryBudgets({});
      setMainPolicyFile(null);
      setAppendixFiles([]);
    }
    setStatusDropdownOpen(false);
  }, [editingPolicy, policies]);

  const StatusDropdown = () => (
    <div className="relative">
      <button
        onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
        className={`flex items-center justify-between gap-2 rounded-full px-4 py-2 text-sm font-body font-medium transition-all w-[140px] cursor-pointer ${statusDropdownOpen ? 'bg-surface-container-low ring-2 ring-primary/20' : 'bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low'
          }`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${editStatus === 'Active' ? 'bg-[#137333]' : editStatus === 'Impending' ? 'bg-[#b06000]' : 'bg-outline-variant'}`} />
          <span className="text-on-surface">{editStatus}</span>
        </div>
        <ChevronDown className={`text-on-surface-variant transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} size={16} />
      </button>

      {statusDropdownOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl shadow-[0_8px_30px_rgba(44,47,49,0.1)] py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {(["Active", "Impending", "Expired"] as PolicyStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                setEditStatus(s);
                setStatusDropdownOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm font-body text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${s === 'Active' ? 'bg-[#137333]' : s === 'Impending' ? 'bg-[#b06000]' : 'bg-outline-variant'}`} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const handleSave = async () => {
    if (!editingPolicy) return;
    setSaveError(null);
    setIsSaving(true);
    setSavingStep(0);

    // ── New policy: upload to backend ──────────────────────────────────────
    if (editingPolicy === "new" && mainPolicyFile) {
      const form = new FormData();
      form.append("files", mainPolicyFile);
      form.append("alias", editName || "New Policy");
      // Append appendix files too
      appendixFiles.forEach((f) => form.append("files", f));

      setSavingStep(1);
      const result = await uploadPolicy(form);
      setSavingStep(2);
      await new Promise((r) => setTimeout(r, 800)); // brief delay for UI

      if (!result.ok) {
        setSaveError(result.error ?? "Upload failed. Please try again.");
        setIsSaving(false);
        return;
      }

      // Refresh policy list from backend
      try {
        const updated = await getPolicies();
        if (updated.length > 0) {
          const mapped: Policy[] = updated.map((p) => ({
            id: p.policy_id,
            name: p.title,
            version: "V1.0",
            department: "General",
            lastModified: p.effective_date
              ? new Date(p.effective_date).toLocaleDateString("en-MY", { month: "short", day: "numeric", year: "numeric" })
              : "",
            status: (p.status === "ACTIVE" ? "Active" : p.status === "DEPRECATED" ? "Expired" : "Impending") as PolicyStatus,
            icon: FileText,
            overview_summary: p.overview_summary,
            aiConditions: parseMandatoryConditions(p.mandatory_conditions) ?? undefined,
          }));
          setPolicies([...mapped, ...MOCK_POLICIES]);
        }
      } catch { /* keep existing list */ }

      setIsSaving(false);
      setEditingPolicy(null);
      return;
    }

    // ── Edit existing (local-only for now) ────────────────────────────────
    await new Promise(r => setTimeout(r, 1000));
    setSavingStep(1);
    await new Promise(r => setTimeout(r, 1000));
    setSavingStep(2);
    await new Promise(r => setTimeout(r, 800));

    // Record History
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newHistoryEntry = {
      user: "HR Admin",
      action: editingPolicy === "new" ? "Policy Created" : "Policy Updated",
      date: formattedDate,
      details: editingPolicy === "new" ? `Initial policy creation: ${editName}` : `Modified policy: ${editName}`
    };
    const updatedHistory = [newHistoryEntry, ...editHistory];

    if (editingPolicy === "new") {
      const newPolicy: Policy = {
        id: "pol-" + Math.random().toString(36).substr(2, 9),
        name: editName || "New Policy",
        version: editVersion || "V1.0",
        department: editDepartment || "General",
        lastModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: editStatus,
        icon: FileText,
        mainFile: mainPolicyFile,
        appendixFiles: appendixFiles,
        existingAppendix: existingAppendix,
        aiConditions: editConditions || undefined,
        history: updatedHistory
      };
      setPolicies([newPolicy, ...policies]);
    } else {
      const updatedPolicyData = {
        status: editStatus,
        name: editName,
        department: editDepartment,
        version: editVersion,
        existingAppendix: existingAppendix,
        aiConditions: editConditions || undefined,
        history: updatedHistory
      };

      // Persist edit to LocalStorage
      const localEdits = JSON.parse(localStorage.getItem('local_policy_edits') || '{}');
      localEdits[editingPolicy] = updatedPolicyData;
      localStorage.setItem('local_policy_edits', JSON.stringify(localEdits));

      setPolicies(policies.map(p => p.id === editingPolicy ? {
        ...p,
        ...updatedPolicyData,
        mainFile: mainPolicyFile,
        appendixFiles: appendixFiles,
      } : p));
    }

    setIsSaving(false);
    setEditingPolicy(null);
  };

  async function handleConfirmDelete() {
    if (!deletingPolicyId) return;
    setIsDeleting(true);
    setDeleteError(null);
    
    const result = await deletePolicy(deletingPolicyId);
    
    if (!result.ok) {
      setDeleteError(result.error ?? "Failed to delete policy");
      setIsDeleting(false);
      return;
    }
    
    // Remove from local state
    setPolicies(prev => prev.filter(p => p.id !== deletingPolicyId));
    
    // Persist deletion in LocalStorage (like the edit-view delete does)
    const deletedIds = JSON.parse(localStorage.getItem('deleted_policy_ids') || '[]');
    if (!deletedIds.includes(deletingPolicyId)) {
      deletedIds.push(deletingPolicyId);
      localStorage.setItem('deleted_policy_ids', JSON.stringify(deletedIds));
    }
    
    setIsDeleting(false);
    setDeleteModalOpen(false);
    if (editingPolicy === deletingPolicyId) {
      setEditingPolicy(null);
    }
    setDeletingPolicyId(null);
    setDeletingPolicyName("");
  }

  if (editingPolicy) {
    const isNew = editingPolicy === "new";

    if (isSaving) {
      return (
        <div className="flex-1 flex flex-col relative w-full h-full bg-surface text-on-surface overflow-hidden p-6 animate-in fade-in duration-500">
          <style>{`
             @keyframes pulse-scan {
               0% { transform: translateY(-100%); opacity: 0; }
               50% { opacity: 1; }
               100% { transform: translateY(400px); opacity: 0; }
             }
             .animate-pulse-scan {
               animation: pulse-scan 3s linear infinite;
             }
           `}</style>
          <HrProcessingScreen currentStep={savingStep} onBack={() => setIsSaving(false)} />
        </div>
      );
    }

    if (isLoadingDetails) {
      return (
        <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full h-full bg-surface">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-8 w-48 bg-surface-container animate-pulse rounded-lg" />
          </div>
          <div className="grid grid-cols-12 gap-8 h-full">
            <div className="col-span-7 flex flex-col gap-8">
              <div className="h-64 bg-surface-container animate-pulse rounded-2xl" />
              <div className="h-96 bg-surface-container animate-pulse rounded-2xl" />
            </div>
            <div className="col-span-5 flex flex-col gap-8">
              <div className="h-48 bg-surface-container animate-pulse rounded-2xl" />
              <div className="h-64 bg-surface-container animate-pulse rounded-2xl" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col relative overflow-hidden w-full h-full bg-surface text-on-surface">
        <div
          ref={editContainerRef}
          className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full min-h-0 overflow-y-auto scroll-smooth"
        >
          <div className="mb-6 flex flex-wrap items-center gap-4 shrink-0">
            <button onClick={() => setEditingPolicy(null)} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer group" aria-label="Back to Policy Studio">
              <ArrowLeft size={20} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold font-body text-sm">Back to Policy Studio</span>
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <h2 className="font-headline text-[2rem] leading-tight font-bold text-on-surface tracking-[-0.02em]">
              {isNew ? "Create New Policy" : `${editName || "Edit Policy"}`}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 items-start">
            {/* Left Column: Policy Details (if edit), Main Policy & Appendix */}
            <div
              ref={leftColRef}
              className="lg:col-span-7 flex flex-col gap-8 pr-2 pb-4 h-fit transition-transform duration-75 ease-out will-change-transform"
              style={{ transform: `translateY(${leftOffset}px)` }}
            >

              {/* Form Details (Only shown here in Edit View) */}
              {!isNew && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_40px_rgba(44,47,49,0.06)] border border-outline-variant/10 shrink-0">
                  <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Policy Details</h3>
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">Policy Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Remote Work Policy"
                        className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">Department</label>
                      <input
                        type="text"
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                        placeholder="e.g. Human Resources"
                        className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">Version</label>
                      <input
                        type="text"
                        value={editVersion}
                        onChange={(e) => setEditVersion(e.target.value)}
                        placeholder="e.g. v1.0"
                        className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">Effective Date</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {policyFileError && (
                <div className="flex items-start gap-3 bg-error/10 border border-error/30 text-error rounded-xl px-4 py-3 text-sm font-body">
                  <span className="shrink-0 font-bold">✕</span>
                  <span className="flex-1">{policyFileError}</span>
                  <button onClick={() => setPolicyFileError(null)} className="shrink-0 font-bold hover:opacity-70">✕</button>
                </div>
              )}

              {/* Main Policy */}
              <div className="flex flex-col gap-4">
                <h3 className="font-headline text-xl font-semibold text-on-surface shrink-0">Main Policy</h3>
                <input
                  ref={mainPolicyInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type !== "application/pdf") {
                        setPolicyFileError("Invalid file type. Only PDF files are accepted for policy documents.");
                        e.target.value = '';
                        return;
                      }
                      if (file.size > POLICY_MAX_SIZE) {
                        setPolicyFileError(`File too large. Maximum 10 MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`);
                        e.target.value = '';
                        return;
                      }
                      setPolicyFileError(null);
                      setMainPolicyFile(file);
                    }
                    e.target.value = '';
                  }}
                />

                {mainPolicyFile ? (
                  <div className="flex flex-col gap-4 border border-outline-variant/30 rounded-2xl overflow-hidden bg-surface-container-lowest">
                    {mainPolicyFile.type === "application/pdf" && previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[400px] border-b border-outline-variant/20"
                      />
                    ) : (
                      <div className="w-full h-[400px] border-b border-outline-variant/20 bg-surface-container-low flex flex-col items-center justify-center">
                        <FileText className="text-primary mb-3" size={48} />
                        <p className="font-body text-base font-medium text-on-surface">{mainPolicyFile.name}</p>
                        <p className="font-body text-xs text-on-surface-variant">Preview not available</p>
                      </div>
                    )}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="font-body text-sm font-medium text-on-surface truncate">{mainPolicyFile.name}</p>
                        <p className="font-body text-xs text-on-surface-variant">{formatFileSize(mainPolicyFile.size)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => mainPolicyInputRef.current?.click()} className="px-4 py-1.5 border border-outline text-on-surface rounded-full font-body text-xs font-medium hover:bg-surface-container-low transition-colors cursor-pointer">
                          Replace
                        </button>
                        <button onClick={() => setMainPolicyFile(null)} className="px-4 py-1.5 text-error font-body text-xs font-medium hover:bg-error-container/10 rounded-full transition-colors cursor-pointer">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !isNew && !existingMainPolicyDeleted ? (
                  <div className="flex flex-col gap-4 border border-outline-variant/30 rounded-2xl overflow-hidden bg-surface-container-lowest">
                    {/* Mock PDF Viewer for existing file */}
                    <div className="w-full h-[400px] border-b border-outline-variant/20 bg-surface-container-lowest flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-primary/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                      <FileText className="text-primary/60 mb-4" size={56} strokeWidth={1} />
                      <p className="font-headline text-lg font-medium text-on-surface mb-2">Remote_Work_Policy_v2.4_FINAL.pdf</p>
                      <p className="font-body text-sm text-on-surface-variant mb-6">Existing Document • 2.4 MB</p>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="font-body text-sm font-medium text-on-surface truncate">Remote_Work_Policy_v2.4_FINAL.pdf</p>
                        <p className="font-body text-xs text-on-surface-variant">Uploaded on Oct 12, 2023</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => mainPolicyInputRef.current?.click()} className="px-4 py-1.5 border border-outline text-on-surface rounded-full font-body text-xs font-medium hover:bg-surface-container-low transition-colors cursor-pointer">
                          Replace
                        </button>
                        <button onClick={() => setExistingMainPolicyDeleted(true)} className="px-4 py-1.5 text-error font-body text-xs font-medium hover:bg-error-container/10 rounded-full transition-colors cursor-pointer">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => mainPolicyInputRef.current?.click()}
                    className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_8px_40px_rgba(44,47,49,0.06)] flex flex-col items-center justify-center border-2 border-dashed border-outline-variant hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer group min-h-[240px]"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Upload className="text-primary" size={28} />
                    </div>
                    <p className="font-body text-base font-medium text-on-surface mb-1">Upload Policy Document</p>
                    <p className="font-body text-xs text-on-surface-variant mb-4">Drag and drop or click to browse</p>
                    <p className="font-body text-[11px] text-outline-variant">Supports PDF • Max 10 MB</p>
                  </div>
                )}
              </div>

              {/* Appendix */}
              <div className="flex flex-col gap-4">
                <h3 className="font-headline text-xl font-semibold text-on-surface shrink-0">Appendix (Optional)</h3>
                <input
                  ref={appendixInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const invalid = files.find(f => f.type !== "application/pdf");
                    if (invalid) {
                      setPolicyFileError(`Invalid file type "${invalid.name}". Only PDF files are accepted.`);
                      e.target.value = '';
                      return;
                    }
                    const oversized = files.find(f => f.size > POLICY_MAX_SIZE);
                    if (oversized) {
                      setPolicyFileError(`File "${oversized.name}" exceeds the 10 MB limit.`);
                      e.target.value = '';
                      return;
                    }
                    setPolicyFileError(null);
                    if (files.length) setAppendixFiles(prev => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
                <div className="flex flex-col gap-3">
                  {/* Upload button for Appendix */}
                  <button
                    onClick={() => appendixInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-outline-variant bg-surface-container-low/50 hover:bg-surface-container-low rounded-xl p-4 flex flex-col items-center justify-center transition-all group shrink-0 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Plus className="text-primary" size={20} />
                    </div>
                    <p className="font-body font-medium text-on-surface text-sm">Add Source</p>
                    <p className="font-body text-xs text-on-surface-variant mt-1">Drag and drop or click to upload</p>
                  </button>

                  {/* Existing Appendix Items */}
                  {!isNew && existingAppendix.map((item, idx) => (
                    <div key={`existing-${idx}`} className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/20 shadow-sm flex items-center justify-between group hover:bg-surface-container-highest transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="text-on-surface-variant shrink-0" size={18} />
                        <div className="min-w-0">
                          <span className="font-body text-sm font-medium text-on-surface truncate block">{item.name}</span>
                          <span className="font-body text-[11px] text-on-surface-variant">{item.size}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setExistingAppendix(prev => prev.filter((_, i) => i !== idx))}
                        className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  {/* Newly uploaded appendix files */}
                  {appendixFiles.map((file, idx) => (
                    <div key={`edit-${file.name}-${idx}`} className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/20 shadow-sm flex items-center justify-between group hover:bg-surface-container-highest transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="text-primary shrink-0" size={18} />
                        <div className="min-w-0">
                          <span className="font-body text-sm font-medium text-on-surface truncate block">{file.name}</span>
                          <span className="font-body text-[11px] text-on-surface-variant">{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setAppendixFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change History Panel (Moved to Bottom Left) */}

              {/* ── Danger Zone ─────────────────────────────────────────────── */}
              {!isNew && (
                <div className="rounded-2xl border border-[#dc2626]/20 bg-[#dc2626]/[0.03] overflow-hidden shrink-0">
                  <div className="px-6 py-4 border-b border-[#dc2626]/15 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#dc2626]/10 flex items-center justify-center">
                      <Trash2 size={15} className="text-[#dc2626]" />
                    </div>
                    <h3 className="font-headline text-sm font-bold text-[#dc2626] uppercase tracking-wider">Danger Zone</h3>
                  </div>
                  <div className="px-6 py-5 flex items-center justify-between gap-6">
                    <div>
                      <p className="font-body text-sm font-semibold text-on-surface">Delete this policy</p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5">This action is permanent and cannot be undone.</p>
                    </div>
                    <button
                      onClick={() => { setDeleteError(null); setDeletingPolicyId(editingPolicy); setDeletingPolicyName(editName); setDeleteModalOpen(true); }}
                      className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-[#dc2626]/30 text-[#dc2626] text-sm font-bold font-body hover:bg-[#dc2626]/10 active:scale-95 transition-all cursor-pointer"
                    >
                      <Trash2 size={15} />
                      Delete Policy
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Policy Details (if new) & AI Overview (if edit) */}
            <div
              ref={rightColRef}
              className="lg:col-span-5 flex flex-col gap-6 pr-2 pb-4 h-fit transition-transform duration-75 ease-out will-change-transform"
              style={{ transform: `translateY(${rightOffset}px)` }}
            >

              {/* Form Details (Only shown here in New/Upload View) */}
              {isNew && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_40px_rgba(44,47,49,0.06)] border border-outline-variant/10 shrink-0">
                  <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Policy Details</h3>
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">Policy Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Remote Work Policy"
                        className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">Department</label>
                      <input
                        type="text"
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                        placeholder="e.g. Human Resources"
                        className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">Version</label>
                      <input
                        type="text"
                        value={editVersion}
                        onChange={(e) => setEditVersion(e.target.value)}
                        placeholder="e.g. v1.0"
                        className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">Effective Date</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* AI Overview Summary (Beautified) */}
              {!isNew && (
                <div className="bg-surface-container-lowest rounded-3xl shadow-[0_20px_50px_rgba(44,47,49,0.08)] border border-primary/20 overflow-hidden flex flex-col shrink-0 animate-in fade-in slide-in-from-right-4 duration-700">
                  <div className="p-5 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                        <Sparkles className="text-primary w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-primary tracking-tight">AI Policy Insights</h3>
                        <p className="text-[10px] text-primary/60 font-bold uppercase tracking-widest">Auto-generated Analysis</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 flex flex-col gap-8">
                    {editOverviewSummary && (() => {
                      const { intro, bullets } = parseBulletPoints(editOverviewSummary);
                      return (
                        <div className="flex flex-col gap-6">
                          {intro && (
                            <p className="font-body text-[15px] text-on-surface leading-relaxed text-pretty">
                              {intro}
                            </p>
                          )}
                          {bullets.length > 0 && (
                            <div className="bg-primary/[0.03] rounded-2xl p-5 border border-primary/5">
                              <h4 className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-4">Key Takeaways</h4>
                              <PremiumBulletList items={bullets} />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <>
                      <div className="h-px bg-gradient-to-r from-transparent via-outline-variant/20 to-transparent w-full" />

                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <h4 className="font-headline text-sm font-bold text-on-surface uppercase tracking-wider">Mandatory Conditions</h4>
                          <div className="px-2 py-0.5 bg-surface-container-high rounded-full text-[10px] font-bold text-on-surface-variant uppercase">
                            Review Required
                          </div>
                        </div>

                        <div className="flex flex-col gap-4">
                          {editConditions && Object.entries(editConditions).length > 0 ? (
                            <>
                              {Object.entries(editConditions).slice(0, 3).map(([category, details]: [string, any]) => (
                                <div key={category} className="bg-surface-container-low/40 rounded-2xl p-5 border border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
                                  <h1 className="font-headline font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                    {category}
                                  </h1>
                                  <PremiumBulletList items={details.condition ?? []} />
                                </div>
                              ))}
                              {Object.entries(editConditions).length > 3 && (
                                <button
                                  onClick={() => setConditionsModalOpen(true)}
                                  className="w-full mt-2 py-4 rounded-2xl text-sm text-primary font-bold bg-primary/[0.04] hover:bg-primary/[0.08] border border-primary/10 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                                >
                                  <span>View & Edit All {Object.entries(editConditions).length} Categories</span>
                                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-on-surface-variant/60 italic font-body">
                              No mandatory conditions have been extracted for this policy.
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>

        {/* Mandatory Conditions Modal */}
        {editConditions && (
          <ConditionsModal
            isOpen={conditionsModalOpen}
            onClose={() => setConditionsModalOpen(false)}
            conditions={editConditions}
            categoryBudgets={categoryBudgets}
            policyId={editingPolicyId}
            onSave={(newConditions) => {
              setEditConditions(newConditions);
              setConditionsModalOpen(false);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setDeleteModalOpen(false);
              setDeletingPolicyId(null);
              setDeletingPolicyName("");
            }
          }}
          policyName={deletingPolicyName}
          isDeleting={isDeleting}
          deleteError={deleteError}
          onConfirm={handleConfirmDelete}
        />
        
        {/* Bottom Action Bar */}
        <div className="shrink-0 bg-surface-bright/80 backdrop-blur-xl border-t border-surface-container-low p-4 z-40">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-6 px-8">
            <button onClick={() => setEditingPolicy(null)} className="px-6 py-3 border border-outline-variant text-on-surface rounded-xl font-body font-medium hover:bg-surface-container-low transition-colors active:scale-95 cursor-pointer">
              Cancel
            </button>
            <div className="flex items-center gap-6">
              {saveError && (
                <p className="text-xs text-error font-body max-w-xs text-right">{saveError}</p>
              )}
              <div className="flex items-center gap-3">
                <span className="font-body text-sm text-on-surface-variant hidden sm:block">Policy Status:</span>
                <StatusDropdown />
              </div>
              <button onClick={handleSave} className="bg-gradient-to-r from-primary to-primary-dim text-white rounded-xl px-8 py-3 font-body font-medium shadow-[0_0_20px_rgba(70,71,211,0.25)] hover:shadow-[0_0_30px_rgba(147,150,255,0.4)] active:scale-95 transition-all cursor-pointer">
                {isNew ? "Create Policy" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredPolicies = policies.filter(p => {
    const matchesStatus = p.status === activeFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="relative min-h-full p-6 md:p-10 lg:p-12 font-body antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* ── Multi-orb gradient anchor ────────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full bg-primary opacity-[0.07] blur-[80px]" />
        <div className="absolute top-32 right-40 w-[320px] h-[320px] rounded-full bg-tertiary opacity-[0.06] blur-[64px]" />
        <div className="absolute -top-8 right-[15%] w-[200px] h-[200px] rounded-full bg-primary-container opacity-[0.12] blur-[48px]" />
      </div>

      <div className="layout-container flex h-full grow flex-col relative z-10">
        <div className="flex flex-1 justify-center">
          <div className="layout-content-container flex flex-col w-full flex-1">
            <main className="flex-1 flex flex-col gap-8 max-w-[1440px] mx-auto w-full">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
                <div className="max-w-2xl">
                  <h2
                    className="font-headline font-extrabold text-on-background mb-2 tracking-tight"
                    style={{ fontSize: "2.5rem", letterSpacing: "-0.02em" }}
                  >
                    Policy Studio
                  </h2>
                  <p className="text-on-surface-variant text-lg font-body">
                    Manage, review, and distribute company guidelines.
                  </p>
                </div>
                <button
                  onClick={() => setEditingPolicy("new")}
                  className="flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-gradient-to-r from-primary to-primary-dim text-on-primary font-body text-base font-semibold transition-all hover:shadow-[0_8px_30px_rgba(70,71,211,0.4)] hover:scale-[0.98] active:scale-95 cursor-pointer"
                >
                  <Plus size={20} />
                  <span>Create New Policy</span>
                </button>
              </div>

              {/* Main Content Canvas (Glassmorphic Container) */}
              <div className="bg-surface-container-lowest/60 backdrop-blur-xl rounded-[2rem] p-8 flex flex-col gap-8 shadow-[0_12px_60px_rgba(44,47,49,0.06)] overflow-hidden">
                {/* Toolbar Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  {/* Search */}
                  <div className="flex items-center w-full lg:w-96 group bg-surface-container-low rounded-xl px-4 transition-colors focus-within:shadow-[0_0_0_4px_rgba(70,71,211,0.1)] focus-within:bg-surface-container-lowest">
                    <Search size={20} className="text-outline group-focus-within:text-primary transition-colors" />
                    <input
                      className="block w-full px-3 py-3 bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-outline-variant font-body transition-all"
                      placeholder="Search policies..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center bg-surface-container-low rounded-xl p-1 gap-1">
                    {(["Active", "Impending", "Expired"] as PolicyStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => setActiveFilter(status)}
                        className={`px-6 py-2 rounded-lg transition-all font-medium text-sm cursor-pointer ${activeFilter === status
                          ? "bg-surface-container-lowest shadow-[0_4px_20px_rgba(44,47,49,0.04)] text-primary"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50"
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-container-highest">
                        <th className="py-3.5 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">Name</th>
                        <th className="py-3.5 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider cursor-pointer group">
                          <div className="flex items-center gap-1">
                            Last Modified
                            <div className="flex flex-col -space-y-2 opacity-50 group-hover:opacity-100 transition-opacity">
                              <ChevronUp size={14} className="mb-[-2px]" />
                              <ChevronDown size={14} className="text-primary" />
                            </div>
                          </div>
                        </th>
                        <th className="py-3.5 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">Status</th>
                        <th className="py-3.5 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="font-body text-on-surface">
                      {filteredPolicies.length > 0 ? (
                        filteredPolicies.slice(0, 3).map((policy) => (
                          <tr
                            key={policy.id}
                            onClick={() => setEditingPolicy(policy.id)}
                            className="group transition-all duration-200 hover:bg-primary/[0.04] hover:shadow-[inset_4px_0_0_0_#4647d3] cursor-pointer border-b border-surface-container-highest/50 last:border-0"
                          >
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                                  <policy.icon size={20} />
                                </div>
                                <div>
                                  <p className="font-semibold text-base">{policy.name}</p>
                                  <p className="text-sm text-on-surface-variant mt-0.5">{policy.version} • {policy.department}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-sm">{policy.lastModified}</td>
                            <td className="py-5 px-6">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${POLICY_STATUS_STYLE[policy.status]}`}>
                                {policy.status}
                              </span>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingPolicy(policy.id); }}
                                className="text-primary font-semibold text-sm group-hover:underline group-hover:translate-x-0.5 transition-all duration-150 active:scale-95 cursor-pointer"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-on-surface-variant font-medium">
                            No policies found matching your search or filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden flex flex-col gap-2">
                  {filteredPolicies.length > 0 ? (
                    filteredPolicies.slice(0, 3).map((policy) => (
                      <button
                        key={policy.id}
                        onClick={() => setEditingPolicy(policy.id)}
                        className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 text-left active:scale-[0.98] transition-all flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                          <policy.icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-on-surface truncate">{policy.name}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">{policy.version} · {policy.department}</p>
                          <p className="text-xs text-on-surface-variant/70 mt-0.5">{policy.lastModified}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${POLICY_STATUS_STYLE[policy.status]}`}>
                            {policy.status}
                          </span>
                          <span className="text-primary font-semibold text-xs">Edit</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-12 text-center text-on-surface-variant font-medium text-sm">
                      No policies found matching your search or filter.
                    </div>
                  )}
                </div>

                {/* View All Button */}
                <div className="p-5 text-center border-t border-outline-variant/15">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-2 text-sm font-semibold font-headline
                               text-primary hover:text-primary-dim transition-all duration-200
                               active:scale-95 group/cta px-4 py-2 rounded-xl
                               hover:bg-primary/5 cursor-pointer"
                  >
                    View All {activeFilter} Policies
                    <ChevronRight
                      className="w-4 h-4 group-hover/cta:translate-x-0.5 transition-transform duration-150"
                      strokeWidth={2.5}
                    />
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* View All Modal */}
      <ViewAllModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        policies={filteredPolicies}
        title={`All ${activeFilter} Policies`}
        onEdit={(id) => {
          setModalOpen(false);
          setEditingPolicy(id);
        }}
      />
    </div>
  );
}


// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  isOpen,
  onClose,
  policyName,
  isDeleting,
  deleteError,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  policyName: string;
  isDeleting: boolean;
  deleteError: string | null;
  onConfirm: () => void;
}) {
  const [typedName, setTypedName] = React.useState("");

  // Reset input each time modal opens
  React.useEffect(() => {
    if (isOpen) setTypedName("");
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmed = typedName.trim() === policyName.trim() && policyName.trim() !== "";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-sm cursor-pointer"
        onClick={!isDeleting ? onClose : undefined}
      />
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-[#dc2626]/15 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#dc2626]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 size={18} className="text-[#dc2626]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline font-bold text-lg text-on-surface">Delete Policy</h3>
            <p className="font-body text-sm text-on-surface-variant mt-0.5 leading-relaxed">
              This will permanently remove <span className="font-semibold text-on-surface">&ldquo;{policyName}&rdquo;</span> and all its associated data. This action cannot be undone.
            </p>
          </div>
          {!isDeleting && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer shrink-0">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Type the policy name to confirm
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && confirmed && !isDeleting) onConfirm(); }}
              placeholder={policyName}
              disabled={isDeleting}
              className={`bg-surface-container-low border rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none transition-all disabled:opacity-50 ${typedName.length > 0
                ? confirmed
                  ? "border-[#dc2626]/50 ring-2 ring-[#dc2626]/10"
                  : "border-outline-variant/40 ring-2 ring-[#dc2626]/5"
                : "border-outline-variant/30 focus:border-outline-variant"
                }`}
            />
            {typedName.length > 0 && !confirmed && (
              <p className="text-[11px] text-[#dc2626]/70 font-body">Name doesn&apos;t match — check spelling and case.</p>
            )}
          </div>

          {deleteError && (
            <div className="flex items-start gap-2 bg-[#dc2626]/5 border border-[#dc2626]/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-[#dc2626] shrink-0 mt-0.5" />
              <p className="font-body text-xs text-[#dc2626]">{deleteError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-body text-sm font-medium hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || isDeleting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#dc2626] text-white font-body text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#b91c1c] shadow-[0_4px_14px_rgba(220,38,38,0.25)] disabled:shadow-none"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={15} />
                Delete Policy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mandatory Conditions Modal ──────────────────────────────────────────────────

function ConditionsModal({
  isOpen,
  onClose,
  conditions,
  categoryBudgets,
  policyId,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  conditions: Record<string, any>;
  categoryBudgets: Record<string, string>;
  policyId: string | null;
  onSave: (newConditions: Record<string, any>) => void;
}) {
  const [localConditions, setLocalConditions] = useState(conditions);
  const [localBudgets, setLocalBudgets] = useState<Record<string, string>>(categoryBudgets);
  const [isSaving, setIsSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    setLocalConditions(conditions);
  }, [conditions]);

  useEffect(() => {
    setLocalBudgets(categoryBudgets);
  }, [categoryBudgets]);

  if (!isOpen) return null;

  const handleUpdateCondition = (category: string, index: number, value: string) => {
    setLocalConditions(prev => {
      const next = { ...prev };
      const nextCategory = { ...next[category] };
      const nextConditions = [...nextCategory.condition];
      nextConditions[index] = value;
      nextCategory.condition = nextConditions;
      next[category] = nextCategory;
      return next;
    });
  };

  const handleAddCondition = (category: string) => {
    setLocalConditions(prev => {
      const next = { ...prev };
      const nextCategory = { ...next[category] };
      nextCategory.condition = [...nextCategory.condition, ""];
      next[category] = nextCategory;
      return next;
    });
  };

  const handleRemoveCondition = (category: string, index: number) => {
    setLocalConditions(prev => {
      const next = { ...prev };
      const nextCategory = { ...next[category] };
      nextCategory.condition = nextCategory.condition.filter((_: any, i: number) => i !== index);
      next[category] = nextCategory;
      return next;
    });
  };

  const handleAddNewCategory = () => {
    if (newCategoryName.trim()) {
      setLocalConditions(prev => ({
        ...prev,
        [newCategoryName.trim()]: { condition: [""] }
      }));
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  const handleUpdateBudget = (category: string, value: string) => {
    setLocalBudgets(prev => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSaveBudgets = async () => {
    if (!policyId) {
      // No policy ID - just save conditions locally (existing behavior)
      onSave(localConditions);
      return;
    }

    setIsSaving(true);
    try {
      // Prepare categories with budgets
      const categoriesWithBudgets = Object.keys(localConditions).map(category => ({
        category,
        auto_approval_budget: localBudgets[category]
          ? parseFloat(localBudgets[category])
          : null,
      }));

      // Call API to update budgets
      const result = await updatePolicyCategories(policyId, categoriesWithBudgets);

      if (result.ok) {
        onSave(localConditions);
        onClose();
        // Refresh policies to get updated data
        // Note: In a real app, you'd want to update the policies state here
      } else {
        alert(result.error || "Failed to update policy budgets");
      }
    } catch (error) {
      console.error("Error saving budgets:", error);
      alert("Failed to save budgets");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[85vh] bg-surface-container-lowest rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="text-primary w-6 h-6" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-2xl text-on-surface">Mandatory Conditions</h3>
              <p className="text-sm text-on-surface-variant font-body">Review and edit AI extracted rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          {Object.entries(localConditions).map(([category, details]) => (
            <div key={category} className="bg-surface-container-low/50 rounded-2xl p-6 border border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-headline font-bold text-lg text-on-surface flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(70,71,211,0.5)]" />
                  {category}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddCondition(category)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                    title="Add condition"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to remove the entire "${category}" category?`)) {
                        setLocalConditions(prev => {
                          const next = { ...prev };
                          delete next[category];
                          return next;
                        });
                      }
                    }}
                    className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {details.condition.map((cond: string, i: number) => (
                  <div key={i} className="flex gap-2 group/item">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={cond}
                        onChange={(e) => handleUpdateCondition(category, i, e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface font-body focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        placeholder="Enter condition..."
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveCondition(category, i)}
                      className="p-2.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Auto-Approval Budgets Section */}
          <div className="bg-gradient-to-br from-primary/5 to-tertiary/5 rounded-2xl p-6 border border-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-headline font-bold text-base text-on-surface">Auto-Approval Budgets</h4>
                <p className="text-xs text-on-surface-variant">
                  Set the maximum amount per category for auto-approval. Leave blank for unlimited.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.keys(localConditions).map((category) => {
                const currentBudget = localBudgets[category] ?? "";

                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">
                        {category}
                      </label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-sm font-medium group-focus-within:text-primary transition-colors">
                          MYR
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={currentBudget}
                          onChange={(e) => handleUpdateBudget(category, e.target.value)}
                          placeholder="Unlimited"
                          className="w-full pl-12 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm text-on-surface font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/40"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Category UI */}
          {isAddingCategory ? (
            <div className="bg-primary/5 rounded-2xl p-6 border-2 border-dashed border-primary/20 animate-in slide-in-from-bottom-2 duration-300">
              <h4 className="text-sm font-bold text-primary mb-4 uppercase tracking-wider">New Mandatory Category</h4>
              <div className="flex gap-3">
                <input
                  autoFocus
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
                  placeholder="e.g. Travel Limits, Eligibility..."
                  className="flex-1 bg-surface-container-lowest border border-primary/30 rounded-xl px-4 py-3 text-sm text-on-surface font-body focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                <button
                  onClick={handleAddNewCategory}
                  className="px-6 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                >
                  Add
                </button>
                <button
                  onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); }}
                  className="p-3 text-on-surface-variant hover:bg-surface-container-low rounded-xl transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="w-full py-6 border-2 border-dashed border-outline-variant/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <PlusCircle size={20} />
              </div>
              <span className="text-sm font-bold font-headline">Add New Mandatory Category</span>
            </button>
          )}
        </div>

        <div className="p-6 border-t border-outline-variant/10 bg-surface-container-low/30 flex justify-between items-center shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-3 text-on-surface-variant font-body font-bold hover:bg-surface-container-high rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveBudgets}
            disabled={isSaving}
            className="px-8 py-3 bg-primary text-white rounded-xl font-body font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Settings className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Conditions & Budgets"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View All Modal Component ───────────────────────────────────────────────────

function ViewAllModal({
  isOpen,
  onClose,
  title,
  policies,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  policies: Policy[];
  onEdit: (id: string) => void;
}) {
  const [modalQuery, setModalQuery] = useState("");

  if (!isOpen) return null;

  const filtered = policies.filter(p =>
    p.name.toLowerCase().includes(modalQuery.toLowerCase()) ||
    p.department.toLowerCase().includes(modalQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-inverse-surface/30 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[85dvh] flex flex-col bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15 shrink-0">
          <div>
            <h3 className="font-headline font-bold text-lg text-on-surface">{title}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{filtered.length} total records</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-on-surface hover:bg-surface-container-low transition-all cursor-pointer">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-4 bg-surface border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center gap-2.5 bg-surface-container-low rounded-xl px-4 py-2.5 ring-1 ring-outline-variant/20 focus-within:ring-primary/40 focus-within:bg-surface-container-lowest transition-all">
            <Search className="w-4 h-4 text-on-surface-variant shrink-0" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search by name or department..."
              value={modalQuery}
              onChange={(e) => setModalQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none font-body"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-container-low/80 backdrop-blur-sm">
                <th className="py-3.5 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">Name</th>
                <th className="py-3.5 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">Modified</th>
                <th className="py-3.5 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.map((policy) => (
                <tr key={policy.id} className="hover:bg-primary/[0.04] transition-all cursor-default">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                        <policy.icon size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface text-sm">{policy.name}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{policy.version} • {policy.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-on-surface-variant">{policy.lastModified}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${POLICY_STATUS_STYLE[policy.status]}`}>
                      {policy.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => onEdit(policy.id)}
                      className="text-primary font-bold text-xs hover:underline transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/10 shrink-0 flex items-center justify-end bg-surface">
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-dim transition-all shadow-md cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Beautified UI Components ───────────────────────────────────────────────────

function parseBulletPoints(text: string) {
  const lines = text.split('\n');
  const introLines: string[] = [];
  const bullets: string[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
      // Remove the marker and trim
      const content = trimmed.replace(/^[-•*]\s*/, '');
      if (content) bullets.push(content);
    } else if (trimmed) {
      introLines.push(trimmed);
    }
  });

  return {
    intro: introLines.join(' '),
    bullets
  };
}

function PremiumBulletList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 items-start group/item">
          <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center group-hover/item:bg-primary/20 transition-all group-hover/item:scale-110 duration-300">
            <CheckCircle2 className="w-3 h-3 text-primary" strokeWidth={3} />
          </div>
          <p className="text-[13px] text-on-surface-variant font-body leading-relaxed group-hover/item:text-on-surface transition-colors">
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}
