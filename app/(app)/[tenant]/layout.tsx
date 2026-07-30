import { notFound } from "next/navigation";
import { getTenantBySlug, getTenantIdBySlug } from "../../../lib/db/queries";
import { requireTenantMatch } from "../../../lib/auth/guard";
import { deriveAccentTokens, meetsContrastThreshold } from "../../../lib/branding/derive-accent";
import { Sidebar } from "../../../components/patterns/Sidebar";
import { DevAuthBanner } from "../../../components/patterns/DevAuthBanner";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const session = await requireTenantMatch(tenantSlug, getTenantIdBySlug);

  const accentHex = tenant.branding.accentHex;
  const brandStyle =
    accentHex && meetsContrastThreshold(accentHex)
      ? deriveAccentTokens(accentHex)
      : null;

  const logoUrl = tenant.branding.logoPath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${tenant.branding.logoPath}`
    : null;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {brandStyle && (
        // Personnalisation par tenant (ARCHITECTURE.md §3.6) : seule la
        // couleur d'accent change, tous les autres tokens restent fixes.
        <style
          dangerouslySetInnerHTML={{
            __html: `:root {
              --accent: ${brandStyle.accent};
              --accent-hover: ${brandStyle.accentHover};
              --accent-weak: ${brandStyle.accentWeak};
              --accent-weak-strong: ${brandStyle.accentWeakStrong};
            }`,
          }}
        />
      )}
      <Sidebar
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        logoUrl={logoUrl}
        userLabel={session.email ?? "Utilisateur"}
        role={session.role!}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <DevAuthBanner />
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
