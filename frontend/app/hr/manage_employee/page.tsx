"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Mail,
  Building2,
  UserCheck,
  ShieldCheck,
  X,
} from "lucide-react";
import { SearchField } from "glisse";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { getEmployees, type EmployeeRecord } from "@/lib/actions/employees";
import { ReclaimGrid } from "@/components/grid/ReclaimGrid";
import { LifecyclePill } from "@/components/claims/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader, PageShell } from "@/components/ui/PageHeader";
import { btn } from "@/components/ui/styles";

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmployeeModal({
  isOpen,
  onClose,
  employee
}: {
  isOpen: boolean;
  onClose: () => void;
  employee?: EmployeeRecord | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const isEdit = !!employee;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low/50">
          <div>
            <h3 className="font-headline font-bold text-xl text-on-surface">
              {isEdit ? "Edit Employee" : "Add Employee"}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              {isEdit ? `Modifying details for ${employee.name}` : "Fill in the details to register a new member."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-on-surface-variant" aria-hidden="true" />
          </button>
        </div>

        <form className="p-8 overflow-y-auto max-h-[70dvh] custom-scrollbar" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Basic Info */}
            <div className="space-y-4 md:col-span-2">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b border-primary/10 pb-1">Primary Information</h4>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Full Name</label>
              <input type="text" defaultValue={employee?.name} placeholder="e.g. John Doe" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Company ID</label>
              <input type="text" defaultValue={employee?.user_code ?? ""} placeholder="e.g. EMP-12345" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Company Email</label>
              <input type="email" defaultValue={employee?.email} placeholder="john.doe@reclaim.my" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Contact Number</label>
              <input type="tel" placeholder="+60 12-345 6789" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
            </div>

            {/* Employment */}
            <div className="space-y-4 md:col-span-2 mt-4">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b border-primary/10 pb-1">Organization & Access</h4>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Department</label>
              <input type="text" defaultValue={employee?.department_name ?? ""} placeholder="e.g. Human Resources" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">System Role</label>
              <select defaultValue={employee?.role ?? "Employee"} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none cursor-pointer">
                <option value="Employee">Employee</option>
                <option value="HR">HR Admin</option>
              </select>
            </div>

            {/* Financial Info */}
            <div className="space-y-4 md:col-span-2 mt-4">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b border-primary/10 pb-1">Payment Details (for Reimbursements)</h4>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Bank Code</label>
              <input type="text" defaultValue={employee?.bank_code ?? ""} placeholder="e.g. MBBEMYKL" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Bank Account Number</label>
              <input type="text" defaultValue={employee?.bank_account_number ?? ""} placeholder="Enter account number" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
            </div>

          </div>

          <div className="mt-10 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-xl border border-outline-variant/20 font-headline font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 px-10 py-3.5 bg-primary text-on-primary rounded-xl font-headline font-bold text-sm hover:bg-primary-dim transition-all shadow-[0_8px_24px_rgba(70,71,211,0.25)] cursor-pointer"
            >
              {isEdit ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ManageEmployeePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getEmployees().then((data) => {
      setEmployees(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.department_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, employees]);

  const handleCreate = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const handleEdit = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const hrCount = employees.filter((e) => e.role === "HR").length;
  const activeCount = employees.filter((e) => e.is_active).length;

  const columnDefs = useMemo<ColDef<EmployeeRecord>[]>(
    () => [
      {
        headerName: "Employee",
        field: "name",
        flex: 1.6,
        minWidth: 240,
        filter: "agTextColumnFilter",
        cellRenderer: (p: ICellRendererParams<EmployeeRecord>) =>
          p.data ? (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={p.data.name} size="sm" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[14px] font-medium text-on-surface">{p.data.name}</p>
                <p className="truncate text-[12px] text-on-surface-variant">{p.data.email}</p>
              </div>
            </div>
          ) : null,
      },
      { headerName: "Company ID", field: "user_code", width: 140, cellClass: "font-mono text-[12px] text-on-surface-variant", valueFormatter: (p) => p.value ?? "—" },
      { headerName: "Department", field: "department_name", flex: 1, minWidth: 150, filter: "agTextColumnFilter", valueFormatter: (p) => p.value ?? "—", cellClass: "text-on-surface-variant" },
      {
        headerName: "Role",
        field: "role",
        width: 120,
        cellRenderer: (p: ICellRendererParams<EmployeeRecord, string>) => (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
              p.value === "HR" ? "bg-accent-container text-on-accent-container ring-accent/20" : "bg-primary-container text-on-primary-container ring-primary/15"
            }`}
          >
            {p.value === "HR" ? "HR Admin" : p.value}
          </span>
        ),
      },
      {
        headerName: "Status",
        field: "is_active",
        width: 130,
        cellRenderer: (p: ICellRendererParams<EmployeeRecord, boolean>) => <LifecyclePill status={p.value ? "Active" : "Inactive"} />,
      },
      { field: "email", hide: true },
      {
        headerName: "",
        colId: "actions",
        width: 90,
        sortable: false,
        resizable: false,
        cellStyle: { justifyContent: "flex-end" },
        cellRenderer: (p: ICellRendererParams<EmployeeRecord>) =>
          p.data ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(p.data!);
              }}
              aria-label={`Edit ${p.data.name}`}
              className={`${btn.icon} h-8 w-8`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null,
      },
    ],
    [],
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="People"
        title="Employees"
        description="View and manage employee access, roles, and payout details."
        actions={
          <button type="button" onClick={handleCreate} className={btn.primary}>
            <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
            Add Employee
          </button>
        }
      />

      <section aria-label="Summary" className="mb-6 grid grid-cols-3 gap-2.5 sm:gap-3 md:mb-8 md:gap-5">
        <KpiCard label="Total Employees" value={employees.length} sub="members" icon={Users} tone="primary" loading={isLoading} />
        <KpiCard label="Active" value={activeCount} sub="can submit claims" icon={UserCheck} tone="success" loading={isLoading} />
        <KpiCard label="HR Admins" value={hrCount} sub="with review access" icon={ShieldCheck} tone="accent" loading={isLoading} />
      </section>

      <EmployeeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} employee={selectedEmployee} />

      <section aria-label="Employee directory" className="overflow-hidden rounded-[20px] bg-white shadow-ambient">
        <div className="flex flex-col gap-3 border-b border-on-surface/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="w-full sm:max-w-sm">
            <SearchField
              aria-label="Search employees"
              placeholder="Search name, email, or department…"
              value={searchQuery}
              onValueChange={setSearchQuery}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {!isLoading && (
            <p className="text-[13px] text-on-surface-variant tabular-nums">
              {filteredEmployees.length} of {employees.length} employees
            </p>
          )}
        </div>

        {/* Desktop: AG Grid */}
        <div className="hidden md:block">
          <ReclaimGrid<EmployeeRecord>
            rowData={isLoading ? undefined : employees}
            loading={isLoading}
            columnDefs={columnDefs}
            quickFilterText={searchQuery}
            getRowId={(p) => p.data.user_id}
            onRowClicked={(e) => e.data && handleEdit(e.data)}
            pagination
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 25, 50]}
            defaultColDef={{ sortable: true, resizable: true }}
            overlayNoRowsTemplate='<span class="text-sm">No employees match your search.</span>'
          />
        </div>

        {/* Mobile: cards */}
        <ul className="divide-y divide-on-surface/[0.06] md:hidden">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-4">
                <span className="h-9 w-9 animate-pulse rounded-full bg-surface-container" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3 w-1/2 animate-pulse rounded bg-surface-container" />
                  <span className="block h-2.5 w-2/3 animate-pulse rounded bg-surface-container" />
                </span>
              </li>
            ))}
          {!isLoading &&
            filteredEmployees.map((emp) => (
              <li key={emp.user_id}>
                <button
                  type="button"
                  onClick={() => handleEdit(emp)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-marshmallow"
                >
                  <Avatar name={emp.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold text-on-surface">{emp.name}</span>
                      {emp.role === "HR" && (
                        <span className="rounded-full bg-accent-container px-1.5 py-0.5 text-[10px] font-semibold text-on-accent-container">HR</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 truncate text-[12px] text-on-surface-variant">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{emp.email}</span>
                    </span>
                    <span className="flex items-center gap-1 truncate text-[12px] text-on-surface-variant">
                      <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {emp.department_name ?? "—"}
                    </span>
                  </span>
                  <LifecyclePill status={emp.is_active ? "Active" : "Inactive"} />
                </button>
              </li>
            ))}
        </ul>

        {!isLoading && filteredEmployees.length === 0 && (
          <div className="flex flex-col items-center px-6 py-12 text-center md:hidden">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-marshmallow text-on-surface-variant">
              <Search className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-3 font-semibold text-on-surface">No employees found</p>
            <p className="mt-1 text-[13px] text-on-surface-variant">Try a different name, email, or department.</p>
          </div>
        )}
      </section>
    </PageShell>
  );
}
