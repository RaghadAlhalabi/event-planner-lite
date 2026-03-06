import "./style.css";
import { resolveLocale, t } from "./i18n/messages.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
const STORAGE_KEY = "event_planner_lite_user";
const locale = resolveLocale(navigator.language);
const tr = (key, params = {}) => t(locale, key, params);

const app = document.querySelector("#app");
document.documentElement.lang = locale;

const isOnline = () => navigator.onLine;

const updateConnectionUi = () => {
  const indicator = document.querySelector("[data-network-status]");
  if (indicator) {
    indicator.textContent = isOnline()
      ? tr("ui.networkStatusOnline")
      : tr("ui.networkStatusOffline");
    indicator.dataset.online = String(isOnline());
  }

  const controls = document.querySelectorAll("[data-requires-network]");
  controls.forEach((control) => {
    control.disabled = !isOnline();
  });
};

const localizeApiError = (errorPayload, fallbackKey) => {
  if (typeof errorPayload?.message === "string" && errorPayload.message.trim()) {
    return errorPayload.message;
  }

  if (errorPayload?.error) {
    const translated = tr(`errors.${errorPayload.error}`);
    if (translated !== `errors.${errorPayload.error}`) {
      return translated;
    }
  }

  return tr(fallbackKey);
};

const loadUser = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveUser = (user) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

const clearUser = () => {
  localStorage.removeItem(STORAGE_KEY);
};

const setStatus = (message, type = "info") => {
  const el = document.querySelector("[data-status]");
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
};

const render = () => {
  const user = loadUser();

  app.innerHTML = `
    <main class="page">
      <header class="hero">
        <h1>${tr("ui.title")}</h1>
        <p>${tr("ui.subtitle")}</p>
      </header>

      <section class="panel">
        <h2>${user ? tr("ui.account") : tr("ui.createAccount")}</h2>
        <p class="network-indicator" data-network-status aria-live="polite"></p>
        <p class="status" data-status role="status" aria-live="polite"></p>

        ${
          user
            ? `
          <div class="account">
            <div><strong>${tr("ui.userId")}:</strong> ${user.id}</div>
            <div><strong>${tr("ui.email")}:</strong> ${user.email}</div>
            <div><strong>${tr("ui.displayName")}:</strong> ${user.displayName}</div>
            <div><strong>${tr("ui.consentTos")}:</strong> ${user.tosConsentAt}</div>
            <div><strong>${tr("ui.consentPrivacy")}:</strong> ${user.privacyConsentAt}</div>
          </div>
          <div class="actions">
            <button type="button" data-action="refresh" data-requires-network>${tr("ui.refreshProfile")}</button>
            <button type="button" class="danger" data-action="delete" data-requires-network>${tr("ui.deleteAccount")}</button>
          </div>
        `
            : `
          <form class="form" data-form="signup">
            <label for="email-input">
              ${tr("ui.email")}
              <input id="email-input" type="email" name="email" placeholder="${tr("ui.emailPlaceholder")}" autocomplete="email" required />
            </label>
            <label for="display-name-input">
              ${tr("ui.displayName")}
              <input id="display-name-input" type="text" name="displayName" placeholder="${tr("ui.displayNamePlaceholder")}" autocomplete="name" required />
            </label>
            <div class="consent">
              <label class="checkbox" for="tos-consent-input">
                <input id="tos-consent-input" type="checkbox" name="tosConsent" required />
                ${tr("ui.agreeTos")}
              </label>
              <label class="checkbox" for="privacy-consent-input">
                <input id="privacy-consent-input" type="checkbox" name="privacyConsent" required />
                ${tr("ui.agreePrivacy")}
              </label>
            </div>
            <button type="submit" data-requires-network>${tr("ui.submitCreateAccount")}</button>
          </form>
        `
        }
      </section>

      <section class="panel">
        <h2>${tr("ui.policies")}</h2>
        <details>
          <summary>${tr("ui.termsSummary")}</summary>
          <p>${tr("ui.termsText1")}</p>
          <p>${tr("ui.termsText2")}</p>
        </details>
        <details>
          <summary>${tr("ui.privacySummary")}</summary>
          <p>${tr("ui.privacyText1")}</p>
          <p>${tr("ui.privacyText2")}</p>
        </details>
      </section>
    </main>
  `;

  if (!user) {
    const form = document.querySelector("[data-form='signup']");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("");

      if (!isOnline()) {
        setStatus(tr("ui.statusRequiresOnline"), "error");
        return;
      }

      const formData = new FormData(form);
      const email = formData.get("email");
      const displayName = formData.get("displayName");
      const tosConsent = formData.get("tosConsent");
      const privacyConsent = formData.get("privacyConsent");

      if (!tosConsent || !privacyConsent) {
        setStatus(tr("ui.statusNeedConsent"), "error");
        return;
      }

      const now = new Date().toISOString();

      try {
        const response = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            displayName,
            tosConsentAt: now,
            privacyConsentAt: now,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          setStatus(localizeApiError(error, "ui.statusCreateFailed"), "error");
          return;
        }

        const data = await response.json();
        const newUser = {
          id: data.id,
          email,
          displayName,
          tosConsentAt: now,
          privacyConsentAt: now,
        };
        saveUser(newUser);
        render();
        setStatus(tr("ui.statusCreated"), "success");
      } catch (err) {
        setStatus(tr("ui.statusCreateNetwork"), "error");
      }
    });
  } else {
    const refreshButton = document.querySelector("[data-action='refresh']");
    const deleteButton = document.querySelector("[data-action='delete']");

    refreshButton.addEventListener("click", async () => {
      setStatus("");

      if (!isOnline()) {
        setStatus(tr("ui.statusRequiresOnline"), "error");
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/users/${user.id}`);
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          setStatus(localizeApiError(error, "ui.statusLoadFailed"), "error");
          return;
        }
        const profile = await response.json();
        saveUser(profile);
        render();
        setStatus(tr("ui.statusRefreshed"), "success");
      } catch {
        setStatus(tr("ui.statusRefreshNetwork"), "error");
      }
    });

    deleteButton.addEventListener("click", async () => {
      if (!isOnline()) {
        setStatus(tr("ui.statusRequiresOnline"), "error");
        return;
      }

      const ok = window.confirm(tr("ui.confirmDelete"));
      if (!ok) return;

      setStatus("");

      try {
        const response = await fetch(`${API_BASE}/users/${user.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          setStatus(localizeApiError(error, "ui.statusDeleteFailed"), "error");
          return;
        }

        clearUser();
        render();
        setStatus(tr("ui.statusDeleted"), "success");
      } catch {
        setStatus(tr("ui.statusDeleteNetwork"), "error");
      }
    });
  }

  updateConnectionUi();
};

window.addEventListener("online", updateConnectionUi);
window.addEventListener("offline", updateConnectionUi);

render();

/* ---- PWA: register service worker ---- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

