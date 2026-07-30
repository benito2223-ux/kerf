/**
 * Bandeau de sécurité affiché en permanence quand l'app tourne en mode
 * connexion de secours (ENABLE_DEV_AUTH=1, voir lib/auth/dev-session.ts).
 *
 * Objectif : impossible d'oublier qu'un déploiement est un environnement
 * de test — le bandeau est visible sur CHAQUE écran, y compris en démo
 * devant un prospect. Si cette variable est définie sur un déploiement
 * destiné à un client réel, c'est une faute de sécurité : tout le monde
 * peut se connecter sans mot de passe.
 */
export function DevAuthBanner() {
  if (process.env.ENABLE_DEV_AUTH !== "1") return null;

  return (
    <div
      role="alert"
      style={{
        background: "var(--warn)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        textAlign: "center",
        padding: "6px 12px",
        letterSpacing: 0.2,
        flex: "none",
      }}
    >
      ⚠ ENVIRONNEMENT DE TEST — connexion sans mot de passe active (ENABLE_DEV_AUTH). Ne jamais
      exposer cette URL à un client réel.
    </div>
  );
}
