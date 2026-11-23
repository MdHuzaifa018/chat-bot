"use client";

import { useState } from "react";
import Link from "next/link";
import { submitAccessRequest } from "@/api/saasApi";

export default function RequestAccessPage() {
  const [form, setForm] = useState({ businessName: "", contactName: "", email: "", websiteUrl: "" });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setBusy(true);
    try { await submitAccessRequest(form); setSubmitted(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not submit the request."); }
    finally { setBusy(false); }
  };
  if (submitted) return <main className="min-h-screen grid place-items-center bg-[#F1F7EF] p-6"><section className="max-w-md rounded-3xl bg-white p-8 text-center shadow"><h1 className="text-2xl font-semibold text-[#254B35]">Request received</h1><p className="mt-3 text-sm text-[#647267]">Our team will review your business details. If approved, you will receive a username and access code.</p><Link className="mt-6 inline-block font-medium text-[#254B35] underline" href="/">Back to sign in</Link></section></main>;
  return <main className="min-h-screen grid place-items-center bg-[#F1F7EF] p-6"><section className="w-full max-w-lg rounded-3xl border border-[#E5F0E1] bg-white p-8 shadow-xl"><h1 className="text-2xl font-semibold text-[#254B35]">Request client access</h1><p className="mt-2 text-sm text-[#647267]">Share your business details to request a SupportAI account.</p>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form className="mt-6 space-y-4" onSubmit={submit}>{([['businessName','Business name'],['contactName','Contact name'],['email','Work email'],['websiteUrl','Website URL']] as const).map(([key,label])=><label className="block text-sm font-medium" key={key}>{label}<input required type={key==='email'?'email':'text'} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full rounded-xl border border-[#E5F0E1] bg-[#F8FBF7] px-4 py-3" /></label>)}<button disabled={busy} className="w-full rounded-full bg-[#254B35] py-3 text-white disabled:opacity-60">{busy?'Submitting…':'Submit request'}</button></form><Link href="/" className="mt-5 block text-center text-sm text-[#254B35] underline">Back to sign in</Link></section></main>;
}
