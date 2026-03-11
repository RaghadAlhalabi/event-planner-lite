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
      InvalidCredentials: "Invalid email or password.",
      LegacyAccount: "This account was created before password login. Create a new account with a password.",
      Unauthorized: "Authentication required.",
      Forbidden: "You do not have permission to modify this resource.",
    },
    validation: {
      expectedObject: "Expected object",
      unknownField: "Unknown field",
      requiredField: "Required field",
      expectedString: "Expected string",
      minCharacters: "Must be at least {min} characters",
      invalidEmail: "Invalid email",
      invalidDatetime: "Invalid datetime",
      invalidValue: "Invalid value",
    },
  },
  nb: {
    errors: {
      ValidationError: "Ugyldig foresporsel",
      DatabaseUnavailable: "Database er ikke konfigurert.",
      Conflict: "Bruker finnes allerede.",
      DatabaseError: "En databasefeil oppstod.",
      NotFound: "Ressurs ikke funnet.",
      InvalidCredentials: "Ugyldig e-post eller passord.",
      LegacyAccount: "Denne kontoen ble opprettet foer passordinnlogging. Opprett en ny konto med passord.",
      Unauthorized: "Autentisering kreves.",
      Forbidden: "Du har ikke tilgang til aa endre denne ressursen.",
    },
    validation: {
      expectedObject: "Forventet objekt",
      unknownField: "Ukjent felt",
      requiredField: "Obligatorisk felt",
      expectedString: "Forventet tekst",
      minCharacters: "Maa vaere minst {min} tegn",
      invalidEmail: "Ugyldig e-post",
      invalidDatetime: "Ugyldig dato/tid",
      invalidValue: "Ugyldig verdi",
    },
  },
};

function parseAcceptLanguageHeader(headerValue) {
  if (typeof headerValue !== "string" || !headerValue.trim()) {
    return [];
  }

  const parsed = headerValue
    .split(",")
    .map((raw, index) => {
      const token = raw.trim();
      if (!token) return null;

      const [localePart, ...params] = token.split(";");
      let quality = 1;

      for (const param of params) {
        const [key, value] = param.split("=").map((v) => v.trim());
        if (key === "q") {
          const q = Number.parseFloat(value);
          if (!Number.isNaN(q)) {
            quality = Math.min(1, Math.max(0, q));
          }
        }
      }

      return {
        locale: localePart.toLowerCase(),
        quality,
        index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.quality !== a.quality) return b.quality - a.quality;
      return a.index - b.index;
    });

  return parsed.map((item) => item.locale);
}

export function resolveLocale(input) {
  const requestedLocales = parseAcceptLanguageHeader(input);

  for (const locale of requestedLocales) {
    if (locale.startsWith("nb") || locale.startsWith("no")) {
      return "nb";
    }

    if (locale.startsWith("en")) {
      return "en";
    }
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
