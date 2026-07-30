"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "../../lib/auth/session";

interface NavItem {
  href?: string; // segment relatif au tenant, ex. "comptes"
  label: string;
  soon?: string;
}

interface SidebarProps {
  tenantSlug: string;
  tenantName: string;
  logoUrl: string | null;
  userLabel: string;
  role: AppRole;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Vue d'ensemble", items: [{ label: "Tableau de bord", soon: undefined }] },
  {
    label: "CRM",
    items: [
      { label: "Comptes", href: "comptes" },
      { label: "Contacts", soon: "P1" },
      { label: "Deals", href: "deals" },
    ],
  },
  {
    label: "Métier",
    items: [
      { label: "Produits", soon: "P2" },
      { label: "Devis", soon: "P2" },
      { label: "Essais", soon: "P3" },
    ],
  },
  { label: "Système", items: [{ label: "Rapports", soon: "P4" }, { label: "Paramètres", soon: "P1" }] },
];

export function Sidebar({ tenantSlug, tenantName, logoUrl, userLabel, role }: SidebarProps) {
  const pathname = usePathname();
  const dashboardHref = `/${tenantSlug}`;
  const isDashboardActive = pathname === dashboardHref;

  return (
    <aside
      style={{
        width: 232,
        flex: "none",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "18px 12px",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "4px 8px 18px 8px",
          marginBottom: 6,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={tenantName} style={{ width: 26, height: 26, borderRadius: 6, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--accent)" }} />
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15.5 }}>{tenantName}</div>
          <div style={{ fontSize: 10.5, color: "var(--faint)", letterSpacing: 0.3 }}>KERF</div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 6 }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div
              style={{
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: "var(--faint)",
                padding: "14px 10px 6px 10px",
                fontWeight: 600,
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const itemHref = item.href ? `${dashboardHref}/${item.href}` : dashboardHref;
              const active = item.href
                ? pathname?.startsWith(itemHref)
                : item.label === "Tableau de bord" && isDashboardActive;
              const disabled = !!item.soon;
              const content = (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 5,
                    fontSize: 13.3,
                    fontWeight: active ? 600 : 500,
                    color: active ? "var(--accent)" : disabled ? "var(--faint)" : "var(--muted)",
                    background: active ? "var(--accent-weak)" : "transparent",
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  {item.label}
                  {item.soon && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 9.5,
                        fontWeight: 600,
                        color: "var(--faint)",
                        background: "var(--canvas)",
                        border: "1px solid var(--border)",
                        borderRadius: 20,
                        padding: "1px 6px",
                      }}
                    >
                      {item.soon}
                    </span>
                  )}
                </div>
              );
              return disabled ? (
                <div key={item.label}>{content}</div>
              ) : (
                <Link key={item.label} href={itemHref}>
                  {content}
                </Link>
              );
            })}
          </div>
        ))}

        {role === "platform_admin" && (
          <div>
            <div
              style={{
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: "var(--faint)",
                padding: "14px 10px 6px 10px",
                fontWeight: 600,
              }}
            >
              Admin plateforme · vous seul
            </div>
            <Link href="/admin">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 5,
                  fontSize: 13.3,
                  fontWeight: 600,
                  color: pathname?.startsWith("/admin") ? "var(--accent)" : "var(--muted)",
                  background: pathname?.startsWith("/admin") ? "var(--accent-weak)" : "transparent",
                }}
              >
                🔒 Marques &amp; tenants
              </div>
            </Link>
          </div>
        )}
      </nav>

      <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 8px" }}>
          <div
            style={{
              width: 27,
              height: 27,
              borderRadius: "50%",
              background: "var(--accent-weak-strong)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              flex: "none",
            }}
          >
            {initials(userLabel)}
          </div>
          <div>
            <div style={{ fontSize: 12.6, fontWeight: 600 }}>{userLabel}</div>
            <div style={{ fontSize: 11, color: "var(--faint)" }}>{roleLabel(role)}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function initials(label: string): string {
  return label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function roleLabel(role: AppRole): string {
  switch (role) {
    case "platform_admin":
      return "Admin plateforme";
    case "tenant_admin":
      return "Admin";
    case "sales":
      return "Commercial";
    case "viewer":
      return "Lecture seule";
  }
}
