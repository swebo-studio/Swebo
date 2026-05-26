"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
        <div className="flex justify-center mb-2">
          <Image src="/logo.png" alt="SWEBO" width={100} height={50} className="object-contain" />
        </div>
        <p className="text-center text-xs font-bold tracking-[0.2em] mb-8" style={{ color: "var(--text-muted)" }}>
          BUILT ON UNIQUENESS
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
