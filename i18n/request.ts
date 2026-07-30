import { getRequestConfig } from "next-intl/server";

/**
 * FR seul en V1, mais l'app passe déjà par next-intl (ARCHITECTURE.md §1) :
 * ajouter l'anglais ou l'allemand plus tard = un fichier messages/xx.json
 * à traduire, pas une reprise de chaque écran.
 */
export default getRequestConfig(async () => {
  const locale = "fr";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
