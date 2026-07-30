import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AccesRefusePage() {
  const t = await getTranslations("accessDenied");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "var(--canvas)",
        textAlign: "center",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>{t("title")}</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, maxWidth: 360 }}>{t("body")}</p>
      <Link href="/" style={{ color: "var(--accent)", fontSize: 13.5, fontWeight: 600 }}>
        {t("backLink")}
      </Link>
    </main>
  );
}
