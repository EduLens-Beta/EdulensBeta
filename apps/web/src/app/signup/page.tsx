import type { Metadata } from "next";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Create your account | EduLens",
  description: "Create your EduLens account.",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-indigo-700">EduLens</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="mb-8 mt-3 text-slate-600">
          Start with the basics. Build your student profile as you go.
        </p>
        <SignupForm />
      </section>
    </main>
  );
}
