import { getTranslations } from "next-intl/server";

export default async function TenantDashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <main style={{ padding: 32, maxWidth: 640 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{t("welcome")}</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6 }}>{t("socleNotice")}</p>
    </main>
  );
}
