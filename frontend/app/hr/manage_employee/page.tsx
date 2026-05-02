"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  Search,
  Plus,
  Pencil,
  MoreVertical,
  Mail,
  Building2,
  ChevronRight
} from "lucide-react";
import { getEmployees, type EmployeeRecord } from "@/lib/actions/employees";

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
        className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-md cursor-default"
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
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <Plus className="w-6 h-6 rotate-45 text-on-surface-variant" />
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

  const hrCount = employees.filter(e => e.role === "HR").length;

  return (
    <div className="relative min-h-full p-6 md:p-10 lg:p-12">
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full bg-primary opacity-[0.07] blur-[80px]" />
        <div className="absolute top-32 right-40 w-[320px] h-[320px] rounded-full bg-tertiary opacity-[0.06] blur-[64px]" />
        <div className="absolute -top-8 right-[15%] w-[200px] h-[200px] rounded-full bg-primary-container opacity-[0.12] blur-[48px]" />
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <h2
              className="font-headline font-extrabold text-on-background mb-2 tracking-tight"
              style={{ fontSize: "2.5rem", letterSpacing: "-0.02em" }}
            >
              Manage Employees
            </h2>
            <p className="text-on-surface-variant text-lg font-body">
              View, edit, and manage employee access and profiles.
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-gradient-to-r from-primary to-primary-dim text-on-primary font-body text-base font-semibold transition-all hover:shadow-[0_8px_30px_rgba(70,71,211,0.4)] hover:scale-[0.98] active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {[
            { label: "Total Employees", value: employees.length, color: "text-primary", bg: "bg-primary/5", hoverBg: "group-hover:bg-primary/15", hoverShadow: "hover:shadow-[0_16px_48px_-12px_rgba(70,71,211,0.12)]" },
            { label: "HR Admins", value: hrCount, color: "text-amber-600", bg: "bg-amber-500/5", hoverBg: "group-hover:bg-amber-500/15", hoverShadow: "hover:shadow-[0_16px_48px_-12px_rgba(245,158,11,0.12)]" },
          ].map((stat, i) => (
            <div key={i} className={`bg-surface-container-lowest/70 backdrop-blur-2xl rounded-xl p-6 shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] relative overflow-hidden group ${stat.hoverShadow} hover:-translate-y-0.5 transition-all duration-300`}>
              <div className="relative z-10">
                <p className="text-xs font-semibold font-headline text-on-surface-variant tracking-widest uppercase mb-2">
                  {stat.label}
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-extrabold font-headline text-on-surface">
                    {isLoading ? "—" : stat.value}
                  </span>
                  <span className="text-sm text-on-surface-variant font-medium mb-1">
                    active members
                  </span>
                </div>
              </div>
              <div className={`absolute -bottom-6 -right-6 w-36 h-36 ${stat.bg} rounded-full blur-2xl ${stat.hoverBg} group-hover:scale-110 transition-all duration-500`} />
            </div>
          ))}
        </div>

        {/* Employee Modal (Create/Edit) */}
        <EmployeeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employee={selectedEmployee}
        />

        {/* Filter & Search Bar */}
        <div className="bg-surface-container-low/50 backdrop-blur-md border border-outline-variant/10 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-ambient-lg">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">Employee</th>
                  <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Department</th>
                  <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">Role</th>
                  <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-on-surface-variant text-sm">Loading employees...</td>
                  </tr>
                ) : filteredEmployees.map((emp) => (
                  <tr key={emp.user_id} className="hover:bg-surface-container/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary-container to-tertiary-container flex items-center justify-center font-bold text-xs text-on-primary-container border-2 border-surface-container-lowest shadow-sm">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-on-surface">{emp.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-on-surface-variant/60" />
                            <p className="text-[11px] text-on-surface-variant">{emp.email}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-on-surface-variant/70" />
                        <p className="text-sm text-on-surface-variant">{emp.department_name ?? "—"}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        emp.role === "HR" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                      }`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-on-surface-variant/30"}`} />
                        <p className={`text-xs font-medium ${emp.is_active ? "text-emerald-700" : "text-on-surface-variant"}`}>
                          {emp.is_active ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-90 cursor-pointer"
                          title="Edit Employee"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden flex flex-col gap-2 p-3">
            {isLoading ? (
              <div className="py-12 text-center text-on-surface-variant text-sm">Loading employees...</div>
            ) : filteredEmployees.map((emp) => (
              <div key={emp.user_id} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 active:scale-[0.98] transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary-container to-tertiary-container flex items-center justify-center font-bold text-xs text-on-primary-container border-2 border-surface-container-lowest shadow-sm shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-on-surface truncate">{emp.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-on-surface-variant/60 shrink-0" />
                        <p className="text-[11px] text-on-surface-variant truncate">{emp.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3 h-3 text-on-surface-variant/60 shrink-0" />
                        <p className="text-[11px] text-on-surface-variant">{emp.department_name ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      emp.role === "HR" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                    }`}>
                      {emp.role}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-on-surface-variant/30"}`} />
                      <p className={`text-[11px] font-medium ${emp.is_active ? "text-emerald-700" : "text-on-surface-variant"}`}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-outline-variant/10">
                  <button
                    onClick={() => handleEdit(emp)}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-90 cursor-pointer"
                    title="Edit Employee"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all cursor-pointer">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!isLoading && filteredEmployees.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex p-4 bg-surface-container rounded-full mb-4">
                <Search className="w-8 h-8 text-on-surface-variant/40" />
              </div>
              <p className="font-headline font-bold text-lg text-on-surface">No employees found</p>
              <p className="text-on-surface-variant text-sm mt-1">Try adjusting your search or filters.</p>
            </div>
          )}

          {!isLoading && (
            <div className="p-5 text-center border-t border-outline-variant/15">
              <span className="text-sm text-on-surface-variant font-body">
                Showing {filteredEmployees.length} of {employees.length} employees
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
