"use client";

import React, { useEffect, useState } from "react";
import {
  UserPlus,
  ShieldCheck,
  Check,
  Trash2,
  AlertCircle,
  Copy,
  RefreshCw,
  Mail,
  User,
  Briefcase,
} from "lucide-react";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployeePermissions,
} from "@/api/saasApi";

interface PermissionSet {
  acceptRequests: boolean;
  rejectRequests: boolean;
  viewTelemetry: boolean;
  manageWebsites: boolean;
  manageTeam: boolean;
}

interface EmployeeItem {
  id: string;
  name: string;
  email: string;
  job_title?: string;
  role: string;
  permissions: PermissionSet;
  is_active?: boolean;
}

const permissionLabels: { key: keyof PermissionSet; label: string }[] = [
  { key: "acceptRequests", label: "Accept Requests" },
  { key: "rejectRequests", label: "Reject Requests" },
  { key: "viewTelemetry", label: "View Latency & Stats" },
  { key: "manageWebsites", label: "Manage Active Sites" },
  { key: "manageTeam", label: "Manage Team" },
];

export default function TeamPermissionsPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchEmployees();
      if (Array.isArray(data)) {
        setEmployees(data as EmployeeItem[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const row = await createEmployee({
        name: name.trim(),
        email: email.trim(),
        role: role.trim() || "Team Member",
      });
      setNotice(
        `Team member created! Temporary password for ${row.email}: ${row.temporaryPassword} (Copy now)`
      );
      setName("");
      setEmail("");
      setRole("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add team member.");
    } finally {
      setBusy(false);
    }
  };

  const togglePermission = async (empId: string, key: keyof PermissionSet) => {
    const targetEmp = employees.find((e) => e.id === empId);
    if (!targetEmp || targetEmp.role === "super_admin") return;

    const current = targetEmp.permissions || {
      acceptRequests: false,
      rejectRequests: false,
      viewTelemetry: false,
      manageWebsites: false,
      manageTeam: false,
    };

    const updatedPermissions: PermissionSet = {
      ...current,
      [key]: !current[key],
    };

    // Optimistic UI update
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === empId
          ? {
              ...emp,
              permissions: updatedPermissions,
            }
          : emp
      )
    );

    setError("");
    try {
      const updated = await updateEmployeePermissions(
        empId,
        updatedPermissions as any
      );
      setEmployees((items) =>
        items.map((item) => (item.id === empId ? { ...item, ...updated } : item))
      );
      setSavedId(empId);
      setTimeout(() => setSavedId(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save permission update.");
      // Rollback on error
      await refresh();
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    const targetEmp = employees.find((e) => e.id === empId);
    if (targetEmp?.role === "super_admin") return;

    setError("");
    try {
      await deleteEmployee(empId);
      setEmployees((prev) => prev.filter((e) => e.id !== empId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove team member.");
    }
  };

  const copyNotice = () => {
    navigator.clipboard.writeText(notice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#202820]">
            Team Permissions &amp; Access Controls
          </h2>
          <p className="text-xs text-[#647267] mt-0.5">
            Create team members, toggle ON/OFF individual access privileges, and manage roles.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#254B35] bg-white border border-[#E5F0E1] rounded-xl hover:bg-[#F1F7EF] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Team
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div>
            <div className="flex items-center gap-2 text-green-900 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-green-700" />
              <span>Team Member Provisioned</span>
            </div>
            <p className="text-xs text-green-800 mt-1 font-mono">{notice}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyNotice}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#254B35] text-white rounded-lg text-xs font-medium hover:bg-[#1e3d2a] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy Password"}
            </button>
            <button
              onClick={() => setNotice("")}
              className="px-3 py-1.5 bg-white text-[#647267] border border-green-200 rounded-lg text-xs font-medium hover:bg-gray-50 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Add Employee Form */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#E5F0E1] flex items-center justify-center text-[#254B35]">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#202820]">
              Add Employee &amp; Assign Role
            </h3>
            <p className="text-xs text-[#647267]">
              Invite new staff to the SupportAI Admin Console.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddEmployee} className="grid sm:grid-cols-4 gap-3">
          <div className="relative">
            <User className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
            />
          </div>

          <div className="relative">
            <Mail className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work Email"
              className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
            />
          </div>

          <div className="relative">
            <Briefcase className="w-4 h-4 text-[#647267] absolute left-3.5 top-3" />
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role (e.g. Support Agent)"
              className="w-full bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="bg-[#254B35] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[#1e3d2a] transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {busy ? "Provisioning..." : "Add Member"}
          </button>
        </form>
      </div>

      {/* Permissions Matrix */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#254B35]" />
          <h2 className="text-lg font-semibold text-[#202820]">
            Employee Access Controls ({employees.length})
          </h2>
        </div>

        {employees.map((emp) => {
          const isSuper = emp.role === "super_admin";
          return (
            <div
              key={emp.id}
              className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm hover:shadow-md transition-shadow space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5F0E1] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#254B35] text-white flex items-center justify-center font-semibold text-sm">
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#202820]">{emp.name}</h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          isSuper
                            ? "bg-purple-100 text-purple-800"
                            : "bg-[#F1F7EF] text-[#254B35]"
                        }`}
                      >
                        {isSuper ? "Super Admin" : emp.job_title || emp.role}
                      </span>
                      {savedId === emp.id && (
                        <span className="text-xs text-[#254B35] inline-flex items-center gap-1 font-medium bg-[#E5F0E1] px-2 py-0.5 rounded-full animate-fadeIn">
                          <Check className="w-3.5 h-3.5" /> Updated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#647267] mt-0.5">{emp.email}</p>
                  </div>
                </div>

                {!isSuper && (
                  <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="self-start sm:self-auto p-2 text-[#647267] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    aria-label="Remove employee"
                    title="Remove team member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* ON / OFF Toggle Controls Grid */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#647267] mb-3">
                  Toggle Granular Tool Permissions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {permissionLabels.map((perm) => {
                    const enabled = isSuper || Boolean(emp.permissions?.[perm.key]);
                    return (
                      <button
                        key={perm.key}
                        type="button"
                        disabled={isSuper}
                        onClick={() => togglePermission(emp.id, perm.key)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                          isSuper ? "cursor-default opacity-90" : "cursor-pointer"
                        } ${
                          enabled
                            ? "bg-[#F1F7EF] border-[#A8C99B] text-[#254B35]"
                            : "bg-white border-[#E5F0E1] text-[#647267]"
                        }`}
                      >
                        <span className="text-xs font-medium pr-2">
                          {perm.label}
                        </span>

                        {/* Modern ON / OFF Switch */}
                        <div
                          className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                            enabled ? "bg-[#254B35]" : "bg-gray-300"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                              enabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {employees.length === 0 && !isLoading && (
          <div className="bg-white rounded-3xl border border-[#E5F0E1] p-12 text-center text-sm text-[#647267]">
            No team members found. Create one using the form above.
          </div>
        )}
      </div>
    </div>
  );
}
