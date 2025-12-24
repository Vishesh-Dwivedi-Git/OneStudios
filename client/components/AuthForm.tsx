"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { Mail, Lock, User } from "lucide-react";

const API_BASE = "http://localhost:5000";

export default function AuthForm({ type }: { type: "login" | "register" }) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const onChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(e: any) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload =
        type === "register"
          ? form
          : { email: form.email, password: form.password };

      await apiRequest(`/auth/${type}`, payload);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const loginWithGoogle = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const loginWithDiscord = () => {
    window.location.href = `${API_BASE}/auth/discord`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F14] px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl">

        {/* LEFT BRAND PANEL */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-teal-500/20 to-teal-400/5 p-10">
          <div>
            <h2 className="text-2xl font-semibold text-white">OneStudio</h2>
            <p className="mt-2 text-sm text-gray-300 max-w-sm">
              Create, stream, and manage professional broadcasts from one unified studio.
            </p>
          </div>
          <p className="text-xs text-gray-400">Built for creators & teams</p>
        </div>

        {/* RIGHT AUTH CARD */}
        <div className="bg-[#111827] flex items-center justify-center p-8">
          <div className="w-full max-w-sm space-y-6">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {type === "login" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-sm text-gray-400">
                {type === "login"
                  ? "Sign in to continue to OneStudio"
                  : "Start your OneStudio journey"}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* OAuth */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={loginWithGoogle}
                className="w-full rounded-xl bg-[#1F2937] hover:bg-[#273449] text-gray-200 py-2.5 text-sm transition"
              >
                Continue with Google
              </button>

              <button
                type="button"
                onClick={loginWithDiscord}
                className="w-full rounded-xl bg-[#1F2937] hover:bg-[#273449] text-gray-200 py-2.5 text-sm transition"
              >
                Continue with Discord
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-xs text-gray-500">OR</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  required
                  value={form.email}
                  onChange={onChange}
                  className="w-full rounded-xl bg-[#0B0F14] border border-gray-700 px-10 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-teal-400 focus:outline-none"
                />
              </div>

              {/* Username */}
              {type === "register" && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    name="username"
                    placeholder="Username"
                    required
                    value={form.username}
                    onChange={onChange}
                    className="w-full rounded-xl bg-[#0B0F14] border border-gray-700 px-10 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-teal-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                  value={form.password}
                  onChange={onChange}
                  className="w-full rounded-xl bg-[#0B0F14] border border-gray-700 px-10 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-teal-400 focus:outline-none"
                />
              </div>

              {/* Remember + Forgot */}
              {type === "login" && (
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-teal-400"
                    />
                    Remember me
                  </label>
                  <a href="#" className="text-teal-400 hover:underline">
                    Forgot?
                  </a>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-teal-400 hover:bg-teal-500 text-black font-semibold py-2.5 text-sm transition disabled:opacity-50"
              >
                {loading
                  ? "Please wait..."
                  : type === "login"
                  ? "Sign in"
                  : "Create account"}
              </button>
            </form>

            {/* Switch */}
            <p className="text-center text-sm text-gray-400">
              {type === "login" ? (
                <>
                  Don’t have an account?{" "}
                  <a href="/register" className="text-teal-400 hover:underline">
                    Sign up
                  </a>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <a href="/login" className="text-teal-400 hover:underline">
                    Sign in
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
