import type { Metadata } from "next";
import Link from "next/link";

import LoginForm from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Admin sign in | EduLens",
  description: "Sign in to EduLens administration.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfaf6] px-6 py-12 text-[#142f35]">
      <section className="w-full max-w-md rounded-2xl border border-[#dbe3db] bg-white p-8">
        <Link href="/" className="text-xl font-bold text-[#08685c]">
          EduLens.
        </Link>
        <p className="mt-8 text-xs font-semibold tracking-widest text-[#08685c]">
          ADMINISTRATION
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Admin sign in
        </h1>
        <p className="mb-8 mt-3 leading-7 text-slate-600">
          Sign in with your administrator account to manage EduLens.
        </p>
        <LoginForm adminMode />
        <p className="mt-6 text-sm leading-6 text-slate-600">
          Administrator access is assigned separately. Signing in here does
          not grant admin permission.
        </p>
      </section>
    </main>
  );
}
