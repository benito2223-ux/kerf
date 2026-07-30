"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "../../../lib/auth/supabase-browser";

export default function ConnexionPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (signInError) {
      setError(t("error"));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--canvas)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 28,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("loginTitle")}</h1>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
          {t("email")}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
          {t("password")}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>

        {error && <p style={{ color: "var(--danger)", fontSize: 12.5, margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 4,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius)",
            padding: "10px 14px",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {t("submit")}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 10px",
  fontSize: 13.5,
  background: "var(--surface)",
  color: "var(--text)",
};
