"use client";

import React, { JSX, useRef, useState, useEffect } from 'react';
import { Plus, Search, ChevronUp, ChevronDown, ChevronRight, FileText, Shield, Archive, Pencil, Trash2, ArrowLeft, X, SlidersHorizontal, Upload } from 'lucide-react';
import { MOCK_POLICIES, POLICY_STATUS_STYLE, Policy, PolicyStatus } from '../hr_components/mockData';

export default function PolicyStudio() {
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PolicyStatus>("Active");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // File upload state
  const [mainPolicyFile, setMainPolicyFile] = useState<File | null>(null);
  const [appendixFiles, setAppendixFiles] = useState<File[]>([]);
  const [editAppendixFiles, setEditAppendixFiles] = useState<File[]>([]);
  const mainPolicyInputRef = useRef<HTMLInputElement>(null);
  const appendixInputRef = useRef<HTMLInputElement>(null);
  const editAppendixInputRef = useRef<HTMLInputElement>(null);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const [policies, setPolicies] = useState<Policy[]>(MOCK_POLICIES);

  // Status dropdown & edit states
  const [editStatus, setEditStatus] = useState<PolicyStatus>("Active");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  
  // Existing files state (for edit view)
  const [existingMainPolicyDeleted, setExistingMainPolicyDeleted] = useState(false);
  const [existingAppendix, setExistingAppendix] = useState<{name: string, size: string}[]>([
    { name: "W10_Requirements_Review.pdf", size: "1.2 MB" },
    { name: "Ergonomic_Guidelines_2023.pdf", size: "845 KB" }
  ]);

  useEffect(() => {
    if (editingPolicy && editingPolicy !== "new") {
      const p = policies.find(x => x.id === editingPolicy);
      if (p) setEditStatus(p.status);
      setExistingMainPolicyDeleted(false);
      setExistingAppendix([
        { name: "W10_Requirements_Review.pdf", size: "1.2 MB" },
        { name: "Ergonomic_Guidelines_2023.pdf", size: "845 KB" }
      ]);
      setEditAppendixFiles([]);
      setMainPolicyFile(null);
    } else if (editingPolicy === "new") {
      setEditStatus("Active");
      setMainPolicyFile(null);
      setAppendixFiles([]);
    }
    setStatusDropdownOpen(false);
  }, [editingPolicy, policies]);

  const currentPolicy = policies.find(p => p.id === editingPolicy);

  const StatusDropdown = () => (
    <div className="relative">
      <button 
        onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
        className={`flex items-center justify-between gap-2 rounded-full px-4 py-2 text-sm font-body font-medium transition-all w-[140px] cursor-pointer ${
          statusDropdownOpen ? 'bg-surface-container-low ring-2 ring-primary/20' : 'bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low'
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

  // ─── Create New Policy View ──────────────────────────────────────────────────
  if (editingPolicy === "new") {
    return (
      <div className="flex-1 flex flex-col relative overflow-hidden w-full h-full bg-surface text-on-surface">
        {/* Page Content */}
        <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full min-h-0 overflow-y-auto">
          <div className="mb-6 flex flex-wrap items-center gap-4 shrink-0">
            <button onClick={() => setEditingPolicy(null)} className="p-2 -ml-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer" aria-label="Back to Policy Studio">
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <h2 className="font-headline text-[2rem] leading-tight font-bold text-on-surface tracking-[-0.02em]">Create New Policy</h2>
          </div>

          {/* Policy Details Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 shrink-0">
            <div className="flex flex-col gap-2">
              <label className="font-body text-sm font-medium text-on-surface-variant">Policy Name</label>
              <input
                type="text"
                placeholder="e.g. Remote Work Policy"
                className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-sm font-medium text-on-surface-variant">Department</label>
              <input
                type="text"
                placeholder="e.g. Human Resources"
                className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-sm font-medium text-on-surface-variant">Version</label>
              <input
                type="text"
                placeholder="e.g. v1.0"
                className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-sm font-medium text-on-surface-variant">Effective Date</label>
              <input
                type="date"
                className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm font-body text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
            {/* Left Column: Main Policy Upload */}
            <div className="lg:col-span-7 flex flex-col gap-4 h-full">
              <h3 className="font-headline text-xl font-semibold text-on-surface shrink-0">Main Policy</h3>
              <input
                ref={mainPolicyInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setMainPolicyFile(file);
                  e.target.value = '';
                }}
              />
              {mainPolicyFile ? (
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_40px_rgba(44,47,49,0.06)] flex flex-col items-center justify-center flex-1 border border-surface-container-low min-h-[240px]">
                  <FileText className="text-error mb-2" size={48} />
                  <p className="font-body text-base font-medium text-on-surface mb-1">{mainPolicyFile.name}</p>
                  <p className="font-body text-xs text-on-surface-variant mb-6">{formatFileSize(mainPolicyFile.size)}</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => mainPolicyInputRef.current?.click()}
                      className="px-6 py-2 border border-outline text-on-surface rounded-full font-body text-sm font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => setMainPolicyFile(null)}
                      className="px-6 py-2 text-error font-body text-sm font-medium hover:bg-error-container/10 rounded-full transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => mainPolicyInputRef.current?.click()}
                  className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_40px_rgba(44,47,49,0.06)] flex flex-col items-center justify-center flex-1 border-2 border-dashed border-outline-variant hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer group min-h-[240px]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="text-primary" size={28} />
                  </div>
                  <p className="font-body text-base font-medium text-on-surface mb-1">Upload Policy Document</p>
                  <p className="font-body text-xs text-on-surface-variant mb-4">Drag and drop or click to browse</p>
                  <p className="font-body text-[11px] text-outline-variant">Supports PDF, DOCX, TXT • Max 10 MB</p>
                </div>
              )}
            </div>
            
            {/* Right Column: Appendix */}
            <div className="lg:col-span-5 flex flex-col gap-4 h-full">
              <h3 className="font-headline text-xl font-semibold text-on-surface shrink-0">Appendix (Optional)</h3>
              <input
                ref={appendixInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) setAppendixFiles(prev => [...prev, ...files]);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-col flex-1 overflow-y-auto pr-2 gap-4">
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
                {appendixFiles.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {appendixFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="bg-surface-container-lowest rounded-xl p-3 shadow-[0_4px_20px_rgba(44,47,49,0.04)] flex items-center justify-between group hover:bg-surface-container-highest transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="text-error shrink-0" size={18} />
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
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Action Bar */}
        <div className="shrink-0 bg-surface-bright/80 backdrop-blur-xl border-t border-surface-container-low p-4 z-40">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-6 px-8">
            <button onClick={() => setEditingPolicy(null)} className="px-6 py-3 border border-outline-variant text-on-surface rounded-xl font-body font-medium hover:bg-surface-container-low transition-colors active:scale-95 cursor-pointer">
              Cancel
            </button>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="font-body text-sm text-on-surface-variant">Policy Status:</span>
                <StatusDropdown />
              </div>
              <button onClick={() => {
                const newPolicy: Policy = {
                  id: "pol-" + Math.random().toString(36).substr(2, 9),
                  name: "New Policy",
                  version: "V1.0",
                  department: "General",
                  lastModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  status: editStatus,
                  icon: FileText
                };
                setPolicies([newPolicy, ...policies]);
                setEditingPolicy(null);
              }} className="bg-gradient-to-r from-primary to-primary-dim text-white rounded-xl px-8 py-3 font-body font-medium shadow-[0_0_20px_rgba(70,71,211,0.2)] hover:shadow-[0_0_30px_rgba(147,150,255,0.4)] active:scale-95 transition-all cursor-pointer">
                Create Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (editingPolicy && currentPolicy) {
    return (
      <div className="flex-1 flex flex-col relative overflow-hidden w-full h-full bg-surface text-on-surface">
        {/* Page Content */}
        <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full min-h-0 overflow-y-auto">
          <div className="mb-6 flex flex-wrap items-center gap-4 shrink-0">
            <button onClick={() => setEditingPolicy(null)} className="p-2 -ml-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer" aria-label="Back to Policy Studio">
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <h2 className="font-headline text-[2rem] leading-tight font-bold text-on-surface tracking-[-0.02em]">{currentPolicy.name} {currentPolicy.version}</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
            {/* Left Column: Main Policy */}
            <div className="lg:col-span-7 flex flex-col gap-4 h-full">
              <h3 className="font-headline text-xl font-semibold text-on-surface shrink-0">Main Policy</h3>
              <input
                ref={mainPolicyInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setMainPolicyFile(file);
                  e.target.value = '';
                }}
              />
              {mainPolicyFile ? (
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_40px_rgba(44,47,49,0.06)] flex flex-col items-center justify-center flex-1 border border-surface-container-low min-h-[240px]">
                  <FileText className="text-error mb-2" size={48} />
                  <p className="font-body text-base font-medium text-on-surface mb-1">{mainPolicyFile.name}</p>
                  <p className="font-body text-xs text-on-surface-variant mb-6">{formatFileSize(mainPolicyFile.size)}</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => mainPolicyInputRef.current?.click()}
                      className="px-6 py-2 border border-outline text-on-surface rounded-full font-body text-sm font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => setMainPolicyFile(null)}
                      className="px-6 py-2 text-error font-body text-sm font-medium hover:bg-error-container/10 rounded-full transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : !existingMainPolicyDeleted ? (
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_40px_rgba(44,47,49,0.06)] flex flex-col items-center justify-center flex-1 border border-surface-container-low min-h-[240px]">
                  <FileText className="text-error mb-2" size={48} />
                  <p className="font-body text-base font-medium text-on-surface mb-1">Remote_Work_Policy_v2.4_FINAL.pdf</p>
                  <p className="font-body text-xs text-on-surface-variant mb-6">Uploaded on Oct 12, 2023 • 2.4 MB</p>
                  <div className="flex gap-4">
                    <button onClick={() => mainPolicyInputRef.current?.click()} className="px-6 py-2 border border-outline text-on-surface rounded-full font-body text-sm font-medium hover:bg-surface-container-low transition-colors cursor-pointer">
                      Replace
                    </button>
                    <button onClick={() => setExistingMainPolicyDeleted(true)} className="px-6 py-2 text-error font-body text-sm font-medium hover:bg-error-container/10 rounded-full transition-colors cursor-pointer">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => mainPolicyInputRef.current?.click()}
                  className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_40px_rgba(44,47,49,0.06)] flex flex-col items-center justify-center flex-1 border-2 border-dashed border-outline-variant hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer group min-h-[240px]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="text-primary" size={28} />
                  </div>
                  <p className="font-body text-base font-medium text-on-surface mb-1">Upload Policy Document</p>
                  <p className="font-body text-xs text-on-surface-variant mb-4">Drag and drop or click to browse</p>
                  <p className="font-body text-[11px] text-outline-variant">Supports PDF, DOCX, TXT • Max 10 MB</p>
                </div>
              )}
            </div>
            
            {/* Right Column: Appendix */}
            <div className="lg:col-span-5 flex flex-col gap-4 h-full">
              <h3 className="font-headline text-xl font-semibold text-on-surface shrink-0">Appendix (Optional)</h3>
              <input
                ref={editAppendixInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) setEditAppendixFiles(prev => [...prev, ...files]);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-col flex-1 overflow-y-auto pr-2 gap-4">
                <button
                  onClick={() => editAppendixInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-outline-variant bg-surface-container-low/50 hover:bg-surface-container-low rounded-xl p-4 flex flex-col items-center justify-center transition-all group shrink-0 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Plus className="text-primary" size={20} />
                  </div>
                  <p className="font-body font-medium text-on-surface text-sm">Add Source</p>
                  <p className="font-body text-xs text-on-surface-variant mt-1">Drag and drop or click to upload</p>
                </button>
                <div className="flex flex-col gap-3">
                  {/* Existing Appendix Items */}
                  {existingAppendix.map((item, idx) => (
                    <div key={`existing-${idx}`} className="bg-surface-container-lowest rounded-xl p-3 shadow-[0_4px_20px_rgba(44,47,49,0.04)] flex items-center justify-between group hover:bg-surface-container-highest transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="text-error shrink-0" size={18} />
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
                  {editAppendixFiles.map((file, idx) => (
                    <div key={`edit-${file.name}-${idx}`} className="bg-surface-container-lowest rounded-xl p-3 shadow-[0_4px_20px_rgba(44,47,49,0.04)] flex items-center justify-between group hover:bg-surface-container-highest transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="text-error shrink-0" size={18} />
                        <div className="min-w-0">
                          <span className="font-body text-sm font-medium text-on-surface truncate block">{file.name}</span>
                          <span className="font-body text-[11px] text-on-surface-variant">{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditAppendixFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Action Bar */}
        <div className="shrink-0 bg-surface-bright/80 backdrop-blur-xl border-t border-surface-container-low p-4 z-40">
          <div className="max-w-7xl mx-auto flex justify-end items-center gap-6 px-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="font-body text-sm text-on-surface-variant">Policy Status:</span>
                <StatusDropdown />
              </div>
              <button onClick={() => {
                if (editingPolicy) {
                  setPolicies(policies.map(p => p.id === editingPolicy ? { ...p, status: editStatus } : p));
                }
                setEditingPolicy(null);
              }} className="bg-gradient-to-r from-primary to-primary-dim text-white rounded-xl px-8 py-3 font-body font-medium shadow-[0_0_20px_rgba(70,71,211,0.2)] hover:shadow-[0_0_30px_rgba(147,150,255,0.4)] active:scale-95 transition-all cursor-pointer">
                Save Changes
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
                        className={`px-6 py-2 rounded-lg transition-all font-medium text-sm cursor-pointer ${
                          activeFilter === status 
                            ? "bg-surface-container-lowest shadow-[0_4px_20px_rgba(44,47,49,0.04)] text-primary" 
                            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data Table Layout */}
                <div className="overflow-x-auto">
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
                        filteredPolicies.map((policy) => (
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-inverse-surface/30 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      {/* Modal Content */}
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

        {/* Search Bar in Modal */}
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

        {/* Scrollable Table */}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/10 shrink-0 flex items-center justify-end bg-surface">
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-dim transition-all shadow-md cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
