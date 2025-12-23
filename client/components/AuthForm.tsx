"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:5000/api";

export default function AuthForm({ type }: { type: "login" | "register" }) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
  });
  const [error, setError] = useState("");

  const onChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(e: any) {
    e.preventDefault();
    setError("");

    try {
      const payload =
        type === "register"
          ? form
          : { email: form.email, password: form.password };

      await apiRequest(`/auth/${type}`, payload);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  }

  // 🔑 OAuth redirect handlers
  const loginWithGoogle = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const loginWithDiscord = () => {
    window.location.href = `${API_BASE}/auth/discord`;
  };

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold capitalize">{type}</h1>

      {error && <p className="text-red-500">{error}</p>}

      {/* OAuth Buttons */}
      <button
        type="button"
        onClick={loginWithGoogle}
        className="w-full border py-2"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={loginWithDiscord}
        className="w-full border py-2"
      >
        Continue with Discord
      </button>

      <div className="text-center text-gray-400">OR</div>

      {/* Email Auth */}
      <input name="email" placeholder="Email" required onChange={onChange} />

      {type === "register" && (
        <input
          name="username"
          placeholder="Username"
          required
          onChange={onChange}
        />
      )}

      <input
        name="password"
        type="password"
        placeholder="Password"
        required
        onChange={onChange}
      />

      <button className="bg-black text-white px-4 py-2 w-full">
        {type === "register" ? "Create Account" : "Login"}
      </button>
    </form>
  );
}
