export const SUPPORTED_LOCALES = ["en", "nb"];
export const DEFAULT_LOCALE = "en";

export const messages = {
  en: {
    errors: {
      ValidationError: "Invalid request",
      DatabaseUnavailable: "Database is not configured.",
      Conflict: "User already exists.",
      DatabaseError: "A database error occurred.",
      NotFound: "Resource not found.",
    },
    ui: {
      title: "Event Planner Lite",
      subtitle: "Minimal user accounts with explicit consent.",
      account: "Account",
      createAccount: "Create account",
      userId: "User ID",
      email: "Email",
      displayName: "Display name",
      consentTos: "Consent (ToS)",
      consentPrivacy: "Consent (Privacy)",
      refreshProfile: "Refresh profile",
      deleteAccount: "Delete account",
      emailPlaceholder: "you@example.com",
      displayNamePlaceholder: "Sam",
      agreeTos: "I agree to the Terms of Service",
      agreePrivacy: "I agree to the Privacy Policy",
      submitCreateAccount: "Create account",
      policies: "Policies",
      termsSummary: "Terms of Service (summary)",
      termsText1:
        "Users own their data. The service is granted permission to use data to operate the app.",
      termsText2:
        "Accounts can be terminated for misuse. Deleting an account removes personal data.",
      privacySummary: "Privacy Policy (summary)",
      privacyText1:
        "We collect email, display name, and consent timestamps. We use this to operate accounts.",
      privacyText2: "You can withdraw consent by deleting your account.",
      confirmDelete:
        "This will delete your account and retract consent. Continue?",
      statusNeedConsent: "You must actively consent to both policies.",
      statusCreateFailed: "Failed to create account.",
      statusCreated: "Account created.",
      statusCreateNetwork: "Network error while creating account.",
      statusLoadFailed: "Unable to load profile.",
      statusRefreshed: "Profile refreshed.",
      statusRefreshNetwork: "Network error while fetching profile.",
      statusDeleteFailed: "Unable to delete account.",
      statusDeleted: "Account deleted.",
      statusDeleteNetwork: "Network error while deleting account.",
      statusRequiresOnline: "This action requires an internet connection.",
      networkStatusOnline: "Online",
      networkStatusOffline: "Offline mode",
      networkError: "Network error. Please try again.",
    },
  },
  nb: {
    errors: {
      ValidationError: "Ugyldig foresporsel",
      DatabaseUnavailable: "Database er ikke konfigurert.",
      Conflict: "Bruker finnes allerede.",
      DatabaseError: "En databasefeil oppstod.",
      NotFound: "Ressurs ikke funnet.",
    },
    ui: {
      title: "Event Planner Lite",
      subtitle: "Minimal brukerkonto med tydelig samtykke.",
      account: "Konto",
      createAccount: "Opprett konto",
      userId: "Bruker-ID",
      email: "E-post",
      displayName: "Visningsnavn",
      consentTos: "Samtykke (vilkar)",
      consentPrivacy: "Samtykke (personvern)",
      refreshProfile: "Oppdater profil",
      deleteAccount: "Slett konto",
      emailPlaceholder: "deg@example.com",
      displayNamePlaceholder: "Ola",
      agreeTos: "Jeg godtar brukervilkarene",
      agreePrivacy: "Jeg godtar personvernerklaeringen",
      submitCreateAccount: "Opprett konto",
      policies: "Retningslinjer",
      termsSummary: "Brukervilkar (kortversjon)",
      termsText1:
        "Brukere eier sine egne data. Tjenesten har tillatelse til aa bruke data for aa drive appen.",
      termsText2:
        "Kontoer kan avsluttes ved misbruk. Sletting av konto fjerner persondata.",
      privacySummary: "Personvern (kortversjon)",
      privacyText1:
        "Vi samler e-post, visningsnavn og samtykketidspunkt. Dette brukes for aa drive kontoer.",
      privacyText2: "Du kan trekke samtykke ved aa slette kontoen din.",
      confirmDelete: "Dette vil slette kontoen din og trekke samtykke. Fortsette?",
      statusNeedConsent: "Du maa aktivt samtykke til begge retningslinjene.",
      statusCreateFailed: "Kunne ikke opprette konto.",
      statusCreated: "Konto opprettet.",
      statusCreateNetwork: "Nettverksfeil ved oppretting av konto.",
      statusLoadFailed: "Kunne ikke laste profil.",
      statusRefreshed: "Profil oppdatert.",
      statusRefreshNetwork: "Nettverksfeil ved henting av profil.",
      statusDeleteFailed: "Kunne ikke slette konto.",
      statusDeleted: "Konto slettet.",
      statusDeleteNetwork: "Nettverksfeil ved sletting av konto.",
      statusRequiresOnline: "Denne handlingen krever internettforbindelse.",
      networkStatusOnline: "Tilkoblet",
      networkStatusOffline: "Frakoblet modus",
      networkError: "Nettverksfeil. Proev igjen.",
    },
  },
};

export function resolveLocale(input) {
  if (typeof input !== "string") return DEFAULT_LOCALE;

  const normalized = input.toLowerCase();
  if (normalized.startsWith("nb") || normalized.startsWith("no")) {
    return "nb";
  }

  return "en";
}

export function t(locale, key, params = {}) {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const dictionary = messages[safeLocale] ?? messages[DEFAULT_LOCALE];
  const fallback = messages[DEFAULT_LOCALE];

  const value =
    key.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), dictionary) ??
    key.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), fallback) ??
    key;

  if (typeof value !== "string") return key;

  return value.replace(/\{(\w+)\}/g, (_, name) => {
    return Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : `{${name}}`;
  });
}
