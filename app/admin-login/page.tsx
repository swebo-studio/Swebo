"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminLoginPage() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בשליחת הקוד");
      } else {
        setStep("code");
      }
    } catch {
      setError("שגיאה בשליחת הקוד");
    }
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { phone, code, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("קוד שגוי או שפג תוקפו");
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

        {step === "phone" && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            <input
              type="tel"
              placeholder="מספר טלפון"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              {loading ? "שולח..." : "שלח קוד"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
              נשלח קוד לטלפון {phone}
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="קוד אימות"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border text-center text-lg tracking-widest outline-none"
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
              {loading ? "בודק..." : "כניסה"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("phone"); setCode(""); setError(""); }}
              className="text-sm underline opacity-60 hover:opacity-100"
              style={{ color: "var(--text)" }}
            >
              שינוי מספר טלפון
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
