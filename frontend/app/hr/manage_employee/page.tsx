"use client";

import { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Pencil, 
  MoreVertical, 
  Mail, 
  Building2, 
  ShieldCheck, 
  ShieldAlert,
  ChevronRight
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: "HR" | "Employee";
  status: "Active" | "Inactive";
  joinedDate: string;
}

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "EMP-001",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@reclaim.my",
    department: "Human Resources",
    role: "HR",
    status: "Active",
    joinedDate: "Jan 12, 2024",
  },
  {
    id: "EMP-002",
    name: "Alex Tan Wei Ming",
    email: "alex.tan@reclaim.my",
    department: "Product & Engineering",
    role: "Employee",
    status: "Active",
    joinedDate: "Feb 05, 2024",
  },
  {
    id: "EMP-003",
    name: "Michael Chen",
    email: "michael.chen@reclaim.my",
    department: "Sales",
    role: "Employee",
    status: "Active",
    joinedDate: "Mar 20, 2024",
  },
  {
    id: "EMP-004",
    name: "Emma Larson",
    email: "emma.larson@reclaim.my",
    department: "Marketing",
    role: "Employee",
    status: "Active",
    joinedDate: "Apr 02, 2024",
  },
  {
    id: "EMP-005",
    name: "James Okafor",
    email: "james.okafor@reclaim.my",
    department: "Operations",
    role: "Employee",
    status: "Inactive",
    joinedDate: "Nov 15, 2023",
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmployeeModal({ 
  isOpen, 
  onClose,
  employee 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  employee?: Employee | null;
}) {
  if (!isOpen) return null;

  const isEdit = !!employee;

  return (
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
              {isEdit ? "Edit Employee" : "Create New Employee"}
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
              <input type="text" defaultValue={employee?.id} placeholder="e.g. EMP-12345" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Company Email</label>
              <input type="email" defaultValue={employee?.email} placeholder="john.doe@reclaim.my" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Contact Number</label>
              <input type="tel" placeholder="+60 12-345 6789" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">IC / Passport Number</label>
              <input type="text" placeholder="000000-00-0000" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Job Grade</label>
              <select className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none cursor-pointer">
                <option>Grade 1-5 (Staff)</option>
                <option>Grade 6-8 (Manager)</option>
                <option>Grade 9+ (Executive)</option>
              </select>
            </div>

            {/* Employment */}
            <div className="space-y-4 md:col-span-2 mt-4">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b border-primary/10 pb-1">Organization & Access</h4>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Department</label>
              <select defaultValue={employee?.department} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none cursor-pointer">
                <option>Human Resources</option>
                <option>Product & Engineering</option>
                <option>Sales & Marketing</option>
                <option>Finance</option>
                <option>Operations</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">System Role</label>
              <select defaultValue={employee?.role} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none cursor-pointer">
                <option value="Employee">Employee</option>
                <option value="HR">HR Admin</option>
                <option value="Manager">Manager Approver</option>
              </select>
            </div>

            {/* Financial Info */}
            <div className="space-y-4 md:col-span-2 mt-4">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b border-primary/10 pb-1">Payment Details (for Reimbursements)</h4>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Bank Name</label>
              <input type="text" placeholder="Maybank / CIMB / etc." className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Bank Account Number</label>
              <input type="text" placeholder="Enter account number" className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
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
              {isEdit ? "Save Changes" : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ManageEmployeePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const filteredEmployees = useMemo(() => {
    return MOCK_EMPLOYEES.filter(emp => 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleCreate = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const handleEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-full p-6 md:p-10 lg:p-12">
      {/* Background Decorative Orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary opacity-[0.05] blur-[100px]" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-tertiary opacity-[0.04] blur-[80px]" />
      </div>

      <div className="">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-headline font-extrabold text-on-background tracking-tight text-4xl">
                Manage Employees
              </h2>
            </div>
            <p className="text-on-surface-variant text-lg font-body">
              View, edit, and manage employee access and profiles.
            </p>
          </div>

          <button 
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-on-primary rounded-xl font-headline font-bold text-sm hover:bg-primary-dim active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(70,71,211,0.25)] cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Create New Employee
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {[
            { label: "Total Employees", value: MOCK_EMPLOYEES.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "HR Admins", value: MOCK_EMPLOYEES.filter(e => e.role === "HR").length, icon: Building2, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((stat, i) => (
            <div key={i} className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className={`p-3 ${stat.bg} ${stat.color} rounded-xl`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">{stat.label}</p>
                <p className="text-2xl font-black text-on-surface">{stat.value}</p>
              </div>
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
          <div className="flex gap-2">
            <select className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
              <option>All Departments</option>
              <option>Human Resources</option>
              <option>Product & Engineering</option>
              <option>Sales</option>
            </select>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-ambient-lg">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/40 border-b border-outline-variant/10">
                  <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Employee</th>
                  <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hidden md:table-cell">Department</th>
                  <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Role</th>
                  <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                  <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-surface-container/30 transition-colors group">
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
                        <p className="text-sm text-on-surface-variant">{emp.department}</p>
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
                        <div className={`w-1.5 h-1.5 rounded-full ${emp.status === "Active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-on-surface-variant/30"}`} />
                        <p className={`text-xs font-medium ${emp.status === "Active" ? "text-emerald-700" : "text-on-surface-variant"}`}>
                          {emp.status}
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
            {filteredEmployees.map((emp) => (
              <div key={emp.id} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 active:scale-[0.98] transition-all">
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
                        <p className="text-[11px] text-on-surface-variant">{emp.department}</p>
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
                      <div className={`w-1.5 h-1.5 rounded-full ${emp.status === "Active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-on-surface-variant/30"}`} />
                      <p className={`text-[11px] font-medium ${emp.status === "Active" ? "text-emerald-700" : "text-on-surface-variant"}`}>
                        {emp.status}
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
          
          {filteredEmployees.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex p-4 bg-surface-container rounded-full mb-4">
                <Search className="w-8 h-8 text-on-surface-variant/40" />
              </div>
              <p className="font-headline font-bold text-lg text-on-surface">No employees found</p>
              <p className="text-on-surface-variant text-sm mt-1">Try adjusting your search or filters.</p>
            </div>
          )}

          <div className="p-5 text-center border-t border-outline-variant/15">
            <button className="inline-flex items-center gap-2 text-sm font-semibold font-headline text-primary hover:text-primary-dim transition-all duration-200 active:scale-95 group/cta px-4 py-2 rounded-xl hover:bg-primary/5 cursor-pointer">
              View All Employees
              <ChevronRight className="w-4 h-4 group-hover/cta:translate-x-0.5 transition-transform duration-150" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
