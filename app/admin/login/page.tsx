"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("שם משתמש או סיסמה שגויים");
    } else {
      router.push("/admin");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--cream)" }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-3xl border"
        style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
      >
        <h1
          className="text-3xl font-extrabold text-center mb-2 tracking-widest"
          style={{ color: "var(--text)" }}
        >
          SWEBO
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          כניסת מנהל
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="שם משתמש"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border text-right outline-none"
            style={{
              background: "var(--cream)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
          <input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border text-right outline-none"
            style={{
              background: "var(--cream)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />

          {error && (
            <p className="text-center text-sm" style={{ color: "var(--maroon)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold transition-opacity disabled:opacity-60"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            {loading ? "נכנס..." : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
}
