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
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 py-8 overflow-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, sans-serif;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-slideIn {
          animation: slideIn 0.8s ease-out forwards;
        }
        
        .auth-shadow {
          box-shadow: 
            0 4px 6px -1px rgba(0, 0, 0, 0.05),
            0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        
        .input-focus {
          transition: all 0.2s ease;
        }
        
        .input-focus:focus {
          border-color: #A3E4D7;
        }
        
        .btn-primary {
          background: #A3E4D7;
          transition: all 0.2s ease;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #8DD4C7;
        }
        
        .btn-primary:active:not(:disabled) {
          background: #7AC4B7;
        }
        
        .oauth-btn {
          transition: all 0.2s ease;
        }
        
        .oauth-btn:hover {
          background: #F8F9FA;
          border-color: #D1D5DB;
        }
      `}</style>

      <div 
        className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden bg-white auth-shadow animate-fadeInUp"
        style={{ animationDelay: '0.1s' }}
      >
        {/* LEFT BRAND PANEL */}
        <div className="relative bg-[#E8F5F3] p-8 lg:p-12 flex flex-col justify-between">
          {/* Content */}
          <div className="relative z-10 animate-slideIn" style={{ animationDelay: '0.3s' }}>
            <div className="inline-block mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#A3E4D7] rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-md"></div>
                </div>
                <h2 className="text-2xl font-semibold text-[#2C3E50]">OneStudio</h2>
              </div>
            </div>
            
            <h3 className="text-2xl lg:text-3xl font-bold text-[#2C3E50] leading-tight mb-5">
              Empower Your<br />Broadcasts
            </h3>
            
            <p className="text-[#6B7280] text-sm lg:text-base leading-relaxed max-w-md">
              A unified, high-quality platform to create, stream, and edit professional broadcasts—where all your meeting ideas align with zero hassle.
            </p>
          </div>
          
          {/* Bottom Text */}
          <div className="relative z-10">
            <p className="text-sm text-[#9CA3AF]">Built for creators & teams</p>
          </div>
        </div>

        {/* RIGHT AUTH PANEL */}
        <div className="bg-white p-6 lg:p-10 flex items-center justify-center">
          <div 
            className="w-full max-w-sm space-y-5 animate-fadeInUp"
            style={{ animationDelay: '0.4s' }}
          >
            {/* Header */}
            <div className="text-center lg:text-left">
              <h1 className="text-2xl font-bold text-[#2C3E50] mb-2">
                {type === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-[#6B7280] text-sm">
                {type === "login"
                  ? "Enter your email and password to access your studio"
                  : "Start your OneStudio journey today"}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-fadeInUp">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-3.5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
                  <input
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={form.email}
                    onChange={onChange}
                    className="w-full rounded-xl bg-white border-2 border-[#E5E7EB] px-12 py-2.5 text-[#111827] placeholder-[#9CA3AF] focus:border-[#A3E4D7] focus:outline-none input-focus"
                  />
                </div>
              </div>

              {/* Username Input (Register Only) */}
              {type === "register" && (
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
                    <input
                      name="username"
                      placeholder="Choose a username"
                      required
                      value={form.username}
                      onChange={onChange}
                      className="w-full rounded-xl bg-white border-2 border-[#E5E7EB] px-12 py-2.5 text-[#111827] placeholder-[#9CA3AF] focus:border-[#A3E4D7] focus:outline-none input-focus"
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
                  <input
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={form.password}
                    onChange={onChange}
                    className="w-full rounded-xl bg-white border-2 border-[#E5E7EB] px-12 py-2.5 text-[#111827] placeholder-[#9CA3AF] focus:border-[#A3E4D7] focus:outline-none input-focus"
                  />
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              {type === "login" && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-[#D1D5DB] text-[#A3E4D7] focus:ring-2 focus:ring-[#A3E4D7] focus:ring-offset-0"
                    />
                    <span className="text-[#6B7280] group-hover:text-[#374151] transition">
                      Remember me
                    </span>
                  </label>
                  <a 
                    href="#" 
                    className="text-[#A3E4D7] hover:text-[#8DD4C7] font-medium transition"
                  >
                    Forgot Password?
                  </a>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl btn-primary text-[#2C3E50] font-semibold py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Please wait..."
                  : type === "login"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-sm text-[#9CA3AF] font-medium">OR</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={loginWithGoogle}
                className="w-full rounded-xl bg-white border-2 border-[#E5E7EB] hover:border-[#D1D5DB] text-[#374151] py-2.5 text-sm font-medium transition oauth-btn flex items-center justify-center gap-3"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={loginWithDiscord}
                className="w-full rounded-xl bg-white border-2 border-[#E5E7EB] hover:border-[#D1D5DB] text-[#374151] py-2.5 text-sm font-medium transition oauth-btn flex items-center justify-center gap-3"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Continue with Discord
              </button>
            </div>

            {/* Switch Link */}
            <p className="text-center text-sm text-[#6B7280]">
              {type === "login" ? (
                <>
                  Don't have an account?{" "}
                  <a 
                    href="/auth/register" 
                    className="text-[#A3E4D7] hover:text-[#8DD4C7] font-semibold transition"
                  >
                    Sign Up
                  </a>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <a 
                    href="/auth/login" 
                    className="text-[#A3E4D7] hover:text-[#8DD4C7] font-semibold transition"
                  >
                    Sign In
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