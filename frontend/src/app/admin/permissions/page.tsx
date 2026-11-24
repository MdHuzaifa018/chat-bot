"use client";

import React, { useState } from "react";
import { UserPlus, ShieldCheck, Check, Trash2 } from "lucide-react";

interface PermissionSet {
  acceptRequests: boolean;
  rejectRequests: boolean;
  viewTelemetry: boolean;
  manageWebsites: boolean;
  manageTeam: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: PermissionSet;
}

const initialEmployees: Employee[] = [
  {
    id: "emp-1",
    name: "Priya Mehta",
    email: "priya@curiousrabit.online",
    role: "Onboarding Specialist",
    permissions: {
      acceptRequests: true,
      rejectRequests: true,
      viewTelemetry: false,
      manageWebsites: false,
      manageTeam: false,
    },
  },
  {
    id: "emp-2",
    name: "Kabir Singh",
    email: "kabir@curiousrabit.online",
    role: "Support Operations",
    permissions: {
      acceptRequests: true,
      rejectRequests: false,
      viewTelemetry: true,
      manageWebsites: true,
      manageTeam: false,
    },
  },
];

const permissionLabels: { key: keyof PermissionSet; label: string }[] = [
  { key: "acceptRequests", label: "Accept Requests" },
  { key: "rejectRequests", label: "Reject Requests" },
  { key: "viewTelemetry", label: "View Latency & Stats" },
  { key: "manageWebsites", label: "Manage Active Sites" },
  { key: "manageTeam", label: "Manage Team" },
];

export default function TeamPermissionsPage() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newEmp: Employee = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.trim(),
      role: role.trim() || "Team Member",
      permissions: {
        acceptRequests: true,
        rejectRequests: false,
        viewTelemetry: false,
        manageWebsites: false,
        manageTeam: false,
      },
    };

    // TODO (Backend Team): POST /api/admin/employees
    setEmployees((prev) => [newEmp, ...prev]);
    setName("");
    setEmail("");
    setRole("");
  };

  const togglePermission = (empId: string, key: keyof PermissionSet) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === empId
          ? {
              ...emp,
              permissions: {
                ...emp.permissions,
                [key]: !emp.permissions[key],
              },
            }
          : emp
      )
    );

    // TODO (Backend Team): PATCH /api/admin/employees/:id/permissions
    setSavedId(empId);
    setTimeout(() => setSavedId(null), 1500);
  };

  const handleDeleteEmployee = (empId: string) => {
    // TODO (Backend Team): DELETE /api/admin/employees/:id
    setEmployees((prev) => prev.filter((e) => e.id !== empId));
  };

  return (
    <div className="space-y-8">
      {/* Add Employee Form */}
      <div className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-[#254B35]" />
          <h2 className="text-base font-semibold text-[#202820]">
            Add Employee &amp; Assign Role
          </h2>
        </div>

        <form
          onSubmit={handleAddEmployee}
          className="grid sm:grid-cols-4 gap-3"
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Work Email"
            className="bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
          />
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (e.g. Support Agent)"
            className="bg-[#F1F7EF] border border-[#E5F0E1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C99B]"
          />
          <button
            type="submit"
            className="bg-[#254B35] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[#1e3d2a] transition-colors cursor-pointer"
          >
            Add Member
          </button>
        </form>
      </div>

      {/* Permissions Matrix */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#254B35]" />
          <h2 className="text-lg font-semibold text-[#202820]">
            Employee Access Controls
          </h2>
        </div>

        {employees.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-3xl border border-[#E5F0E1] p-6 shadow-sm space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5F0E1] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#202820]">{emp.name}</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F1F7EF] text-[#254B35] font-medium">
                    {emp.role}
                  </span>
                  {savedId === emp.id && (
                    <span className="text-xs text-[#254B35] inline-flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> Updated
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#647267] mt-0.5">{emp.email}</p>
              </div>

              <button
                onClick={() => handleDeleteEmployee(emp.id)}
                className="self-start sm:self-auto p-2 text-[#647267] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                aria-label="Remove employee"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {permissionLabels.map((perm) => {
                const enabled = emp.permissions[perm.key];
                return (
                  <button
                    key={perm.key}
                    type="button"
                    onClick={() => togglePermission(emp.id, perm.key)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      enabled
                        ? "bg-[#F1F7EF] border-[#A8C99B] text-[#254B35]"
                        : "bg-white border-[#E5F0E1] text-[#647267]"
                    }`}
                  >
                    <span className="text-xs font-medium pr-2">
                      {perm.label}
                    </span>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                        enabled ? "bg-[#254B35]" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}