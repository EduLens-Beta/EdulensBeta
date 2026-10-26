import type { Metadata } from "next";
import AccountPanel from "./account-panel";

export const metadata: Metadata = {
  title: "Your account | EduLens",
  description: "Your EduLens account.",
};

export default function AccountPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-5 text-sm font-semibold text-indigo-700">EduLens</p>
        <AccountPanel />
      </section>
    </main>
  );
}
