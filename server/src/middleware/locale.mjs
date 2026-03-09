import { resolveLocale, t } from "../i18n/messages.mjs";

export function localeMiddleware(req, res, next) {
  const locale = resolveLocale(req.headers["accept-language"]);

  req.locale = locale;
  req.t = (key, params = {}) => t(locale, key, params);

  return next();
}
