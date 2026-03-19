import "./style.css";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, resolveLocale, t } from "./i18n/messages.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
const STORAGE_KEY = "event_planner_lite_user";
const LOCALE_STORAGE_KEY = "event_planner_lite_locale";
const PENDING_INVITE_KEY = "event_planner_pending_invite";

let deferredInstallPrompt = null;
let currentLocale = resolveInitialLocale();
let eventsState = {
  items: [],
  loaded: false,
  loading: false,
  error: "",
  editingId: null,
  expandedEventId: null,
  guestOnlyEventIds: {},
  invitations: {},
  rsvps: {},
};

const app = document.querySelector("#app");
applyLocaleToDocument();

const readInviteFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const eventId = String(params.get("event") || "").trim();
  const inviteId = String(params.get("invite") || "").trim();

  if (!eventId || !inviteId) return null;
  return { eventId, inviteId };
};

const savePendingInvite = (pendingInvite) => {
  if (!pendingInvite?.eventId || !pendingInvite?.inviteId) return;

  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(pendingInvite));
  } catch {
    // Ignore storage failures and keep app usable.
  }
};

const getPendingInvite = () => {
  try {
    const raw = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed?.eventId !== "string" || typeof parsed?.inviteId !== "string") {
      return null;
    }

    const eventId = parsed.eventId.trim();
    const inviteId = parsed.inviteId.trim();
    if (!eventId || !inviteId) return null;

    return { eventId, inviteId };
  } catch {
    return null;
  }
};

const clearPendingInvite = () => {
  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // Ignore storage failures and keep app usable.
  }
};

const clearInviteQueryParams = () => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("event");
    url.searchParams.delete("invite");
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", nextUrl || "/");
  } catch {
    // Ignore URL rewrite failures.
  }
};

const inviteFromUrl = readInviteFromUrl();
if (inviteFromUrl) {
  savePendingInvite(inviteFromUrl);
}

let isRestoringPendingInvite = false;

function resolveInitialLocale() {
  const preferred = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (preferred && SUPPORTED_LOCALES.includes(preferred)) {
    return preferred;
  }
  return resolveLocale(navigator.language || DEFAULT_LOCALE);
}

function applyLocaleToDocument() {
  document.documentElement.lang = currentLocale;
}

const tr = (key, params = {}) => t(currentLocale, key, params);
const isOnline = () => navigator.onLine;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(currentLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const rtf = new Intl.RelativeTimeFormat(currentLocale, { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}

function formatDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoFromInput(value) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

const setControlLoading = (control, pending, loadingText) => {
  if (!control) return;

  if (pending) {
    if (!control.dataset.defaultLabel) {
      control.dataset.defaultLabel = control.textContent;
    }
    control.textContent = loadingText;
    control.dataset.pending = "true";
    control.disabled = true;
    return;
  }

  if (control.dataset.defaultLabel) {
    control.textContent = control.dataset.defaultLabel;
  }
  delete control.dataset.pending;
  updateConnectionUi();
};

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
    const pending = control.dataset.pending === "true";
    control.disabled = !isOnline() || pending;
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

const isUnauthorizedResponse = (response, errorPayload) => {
  if (response?.status === 401) return true;
  return errorPayload?.error === "Unauthorized";
};

const handleAuthFailure = (response, errorPayload) => {
  if (!isUnauthorizedResponse(response, errorPayload)) {
    return false;
  }

  clearUser();
  clearPendingInvite();
  render();

  const message = localizeApiError(errorPayload, "ui.statusSessionExpired");
  setStatus(message, "error");
  setErrorSummary(message);
  return true;
};

const loadUserState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { user: null, cachedAt: null };

  try {
    const parsed = JSON.parse(raw);

    if (parsed?.user && typeof parsed.user === "object") {
      return {
        user: parsed.user,
        cachedAt: parsed.cachedAt || null,
      };
    }

    if (parsed?.id) {
      return {
        user: parsed,
        cachedAt: parsed.createdAt || null,
      };
    }

    return { user: null, cachedAt: null };
  } catch {
    return { user: null, cachedAt: null };
  }
};

const saveUserState = (user, cachedAt = new Date().toISOString()) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user,
      cachedAt,
    })
  );
};

const getCurrentUserId = () => {
  const { user } = loadUserState();
  return typeof user?.id === "string" ? user.id.trim() : "";
};

const buildUserHeaders = (headers = {}) => {
  const userId = getCurrentUserId();
  return userId ? { ...headers, "x-user-id": userId } : headers;
};

const resetEventsState = () => {
  eventsState = {
    items: [],
    loaded: false,
    loading: false,
    error: "",
    editingId: null,
    expandedEventId: null,
    guestOnlyEventIds: {},
    invitations: {},
    rsvps: {},
  };
};

const isGuestOnlyEvent = (eventId) => Boolean(eventsState.guestOnlyEventIds[eventId]);

const clearUser = () => {
  localStorage.removeItem(STORAGE_KEY);
  resetEventsState();
};

const setStatus = (message, type = "info") => {
  const el = document.querySelector("[data-status]");
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
};

const setErrorSummary = (message = "") => {
  const el = document.querySelector("[data-error-summary]");
  if (!el) return;

  if (!message) {
    el.textContent = "";
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.textContent = message;
};

const setEventsStatus = (message, type = "info") => {
  const el = document.querySelector("[data-events-status]");
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
};

const focusFirstInvalidControl = (form) => {
  const firstInvalid = form.querySelector(":invalid");
  if (!firstInvalid) return;

  firstInvalid.focus();
  const message = firstInvalid.validationMessage || tr("ui.statusNeedConsent");
  setErrorSummary(tr("ui.errorSummaryPrefix", { message }));
};

const setLocale = (localeInput) => {
  const resolved = resolveLocale(localeInput);
  currentLocale = resolved;
  localStorage.setItem(LOCALE_STORAGE_KEY, resolved);
  applyLocaleToDocument();
  render();
};

const getEditingEvent = () => {
  if (!eventsState.editingId) return null;
  return eventsState.items.find((item) => item.id === eventsState.editingId) || null;
};

const ensureEventCollectionState = (collectionName, eventId) => {
  if (!eventsState[collectionName][eventId]) {
    eventsState[collectionName][eventId] = {
      items: [],
      loaded: false,
      loading: false,
      error: "",
      status: "",
      statusType: "info",
    };
  }

  return eventsState[collectionName][eventId];
};

const setCollectionStatus = (collectionName, eventId, message, type = "info") => {
  const state = ensureEventCollectionState(collectionName, eventId);
  state.status = message;
  state.statusType = type;
};

const loadEvents = async ({ showLoading = true } = {}) => {
  if (!isOnline()) {
    setEventsStatus(tr("ui.eventsOfflineCacheHint"), "info");
  }

  if (showLoading) {
    eventsState.loading = true;
    render();
  }

  try {
    const userId = getCurrentUserId();
    const query = userId ? `?ownerId=${encodeURIComponent(userId)}` : "";
    const response = await fetch(`${API_BASE}/events${query}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      eventsState.error = localizeApiError(error, "ui.eventsLoadFailed");
      eventsState.loaded = true;
      return;
    }

    const payload = await response.json();
    eventsState.items = Array.isArray(payload?.items) ? payload.items : [];
    eventsState.error = "";
    eventsState.loaded = true;
  } catch {
    eventsState.error = tr("ui.eventsLoadNetwork");
    eventsState.loaded = true;
  } finally {
    eventsState.loading = false;
    render();
  }
};

const loadInvitations = async (eventId, { showLoading = true } = {}) => {
  const invitationState = ensureEventCollectionState("invitations", eventId);

  if (!isOnline()) {
    setCollectionStatus("invitations", eventId, tr("ui.invitationsOfflineCacheHint"), "info");
  }

  if (showLoading) {
    invitationState.loading = true;
    render();
  }

  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/invitations`, {
      headers: buildUserHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      invitationState.error = localizeApiError(error, "ui.invitationsLoadFailed");
      invitationState.loaded = true;
      return;
    }

    const payload = await response.json();
    invitationState.items = Array.isArray(payload?.items) ? payload.items : [];
    invitationState.error = "";
    invitationState.loaded = true;
  } catch {
    invitationState.error = tr("ui.invitationsLoadNetwork");
    invitationState.loaded = true;
  } finally {
    invitationState.loading = false;
    render();
  }
};

const loadRsvps = async (eventId, { showLoading = true } = {}) => {
  const rsvpState = ensureEventCollectionState("rsvps", eventId);

  if (!isOnline()) {
    setCollectionStatus("rsvps", eventId, tr("ui.rsvpsOfflineCacheHint"), "info");
  }

  if (showLoading) {
    rsvpState.loading = true;
    render();
  }

  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/rsvps`, {
      headers: buildUserHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      rsvpState.error = localizeApiError(error, "ui.rsvpsLoadFailed");
      rsvpState.loaded = true;
      return;
    }

    const payload = await response.json();
    rsvpState.items = Array.isArray(payload?.items) ? payload.items : [];
    rsvpState.error = "";
    rsvpState.loaded = true;
  } catch {
    rsvpState.error = tr("ui.rsvpsLoadNetwork");
    rsvpState.loaded = true;
  } finally {
    rsvpState.loading = false;
    render();
  }
};

const ensureInvitedEventVisible = async (eventId) => {
  const exists = eventsState.items.some((item) => item.id === eventId);
  if (exists) {
    return { available: true, guestOnly: isGuestOnlyEvent(eventId) };
  }

  try {
    const response = await fetch(`${API_BASE}/events/${eventId}`);
    if (!response.ok) return { available: false, guestOnly: false };

    const eventItem = await response.json();
    if (!eventItem || typeof eventItem !== "object") {
      return { available: false, guestOnly: false };
    }

    eventsState.guestOnlyEventIds[eventId] = true;
    eventsState.items = [eventItem, ...eventsState.items];
    return { available: true, guestOnly: true };
  } catch {
    return { available: false, guestOnly: false };
  }
};

const restorePendingInviteContext = async () => {
  if (isRestoringPendingInvite) return false;

  const pendingInvite = getPendingInvite();
  if (!pendingInvite) return false;
  if (!getCurrentUserId()) return false;

  isRestoringPendingInvite = true;

  try {
    await loadEvents({ showLoading: true });

    const invitedContext = await ensureInvitedEventVisible(pendingInvite.eventId);
    if (!invitedContext.available) {
      setEventsStatus(tr("ui.inviteEventNotFound"), "error");
      return false;
    }

    eventsState.expandedEventId = pendingInvite.eventId;
    render();

    if (!invitedContext.guestOnly) {
      await loadInvitations(pendingInvite.eventId, { showLoading: true });
    }
    await loadRsvps(pendingInvite.eventId, { showLoading: true });

    setCollectionStatus("rsvps", pendingInvite.eventId, tr("ui.inviteContextRestored"), "success");
    render();

    clearPendingInvite();
    clearInviteQueryParams();
    return true;
  } finally {
    isRestoringPendingInvite = false;
  }
};

const wireLanguageSwitcher = () => {
  const select = document.querySelector("[data-action='locale-switch']");
  if (!select) return;

  select.value = currentLocale;
  select.addEventListener("change", (event) => {
    setLocale(event.target.value);
  });
};

const wireInstallButton = () => {
  const installButton = document.querySelector("[data-action='install']");
  if (!installButton) return;

  installButton.hidden = !deferredInstallPrompt;

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;

    setControlLoading(installButton, true, tr("ui.installingApp"));

    try {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } finally {
      deferredInstallPrompt = null;
      setControlLoading(installButton, false, tr("ui.installingApp"));
      installButton.hidden = true;
    }
  });
};

const render = () => {
  const { user, cachedAt } = loadUserState();
  const editingEvent = getEditingEvent();
  const eventFormSubmitLabel = editingEvent ? tr("ui.eventsUpdate") : tr("ui.eventsCreate");
  const eventTitleValue = editingEvent ? escapeHtml(editingEvent.title || "") : "";
  const eventStartsAtValue = editingEvent ? formatDateTimeInput(editingEvent.startsAt) : "";
  const eventEndsAtValue = editingEvent ? formatDateTimeInput(editingEvent.endsAt) : "";
  const eventLocationValue = editingEvent ? escapeHtml(editingEvent.location || "") : "";
  const eventNotesValue = editingEvent ? escapeHtml(editingEvent.notes || "") : "";

  const eventsBody = eventsState.loading
    ? `<p>${tr("ui.eventsLoading")}</p>`
    : eventsState.items.length === 0
      ? `<p>${tr("ui.eventsEmpty")}</p>`
      : `
      <ul class="events-list">
        ${eventsState.items
          .map((eventItem) => {
            const eventId = eventItem.id;
            const isGuestView = isGuestOnlyEvent(eventId);
            const invitationState = ensureEventCollectionState("invitations", eventId);
            const rsvpState = ensureEventCollectionState("rsvps", eventId);
            const isExpanded = eventsState.expandedEventId === eventId;

            const invitationsBody = invitationState.loading
              ? `<p>${tr("ui.invitationsLoading")}</p>`
              : invitationState.items.length === 0
                ? `<p>${tr("ui.invitationsEmpty")}</p>`
                : `
                <ul class="sub-list">
                  ${invitationState.items
                    .map(
                      (invite) => `<li><strong>${escapeHtml(invite.email || "-")}</strong> - ${escapeHtml(invite.status || "pending")}</li>`
                    )
                    .join("")}
                </ul>
              `;

            const rsvpsBody = rsvpState.loading
              ? `<p>${tr("ui.rsvpsLoading")}</p>`
              : rsvpState.items.length === 0
                ? `<p>${tr("ui.rsvpsEmpty")}</p>`
                : `
                <ul class="sub-list">
                  ${rsvpState.items
                    .map(
                      (rsvp) => `<li><strong>${escapeHtml(rsvp.userId || "-")}</strong> - ${escapeHtml(rsvp.status || "-")}${rsvp.note ? ` (${escapeHtml(rsvp.note)})` : ""}</li>`
                    )
                    .join("")}
                </ul>
              `;

            return `
          <li class="event-card">
            <div class="event-card-main">
              <h3>${escapeHtml(eventItem.title || "-")}</h3>
              <p><strong>${tr("ui.eventsStartsAtLabel")}:</strong> ${formatDateTime(eventItem.startsAt)}</p>
              <p><strong>${tr("ui.eventsEndsAtLabel")}:</strong> ${formatDateTime(eventItem.endsAt)}</p>
              <p><strong>${tr("ui.eventsLocationLabel")}:</strong> ${escapeHtml(eventItem.location || "-")}</p>
              <p><strong>${tr("ui.eventsNotesLabel")}:</strong> ${escapeHtml(eventItem.notes || "-")}</p>
            </div>
            <div class="event-card-actions">
              <button type="button" data-action="toggle-event-collab" data-event-id="${escapeHtml(eventId)}">${
                isExpanded ? tr("ui.eventsHideCollab") : isGuestView ? tr("ui.rsvpsTitle") : tr("ui.eventsShowCollab")
              }</button>
              ${
                isGuestView
                  ? ""
                  : `<button type="button" class="secondary" data-action="edit-event" data-event-id="${escapeHtml(eventItem.id)}">${tr("ui.eventsEdit")}</button>
              <button type="button" class="danger" data-action="delete-event" data-event-id="${escapeHtml(eventItem.id)}" data-requires-network>${tr("ui.eventsDelete")}</button>`
              }
            </div>

            ${
              isExpanded
                ? `
              <div class="event-collab">
                <div class="event-collab-grid">
                  ${
                    isGuestView
                      ? ""
                      : `<section>
                    <h4>${tr("ui.invitationsTitle")}</h4>
                    <p class="status" data-type="${escapeHtml(invitationState.statusType || "info")}">${escapeHtml(invitationState.status || "")}</p>
                    ${invitationState.error ? `<p class="status" data-type="error">${escapeHtml(invitationState.error)}</p>` : ""}
                    <form class="form" data-form="invitation" data-event-id="${escapeHtml(eventId)}" novalidate>
                      <label>
                        ${tr("ui.invitationsEmailLabel")}
                        <input type="email" name="email" placeholder="guest@example.com" required />
                      </label>
                      <div class="actions">
                        <button type="submit" data-requires-network>${tr("ui.invitationsSend")}</button>
                        <button type="button" class="secondary" data-action="refresh-invitations" data-event-id="${escapeHtml(eventId)}" data-requires-network>${tr("ui.invitationsRefresh")}</button>
                      </div>
                    </form>
                    ${invitationsBody}
                  </section>`
                  }
                  <section>
                    <h4>${tr("ui.rsvpsTitle")}</h4>
                    <p class="status" data-type="${escapeHtml(rsvpState.statusType || "info")}">${escapeHtml(rsvpState.status || "")}</p>
                    ${rsvpState.error ? `<p class="status" data-type="error">${escapeHtml(rsvpState.error)}</p>` : ""}
                    <form class="form" data-form="rsvp" data-event-id="${escapeHtml(eventId)}" novalidate>
                      <label>
                        ${tr("ui.rsvpStatusLabel")}
                        <select name="status" required>
                          <option value="yes">${tr("ui.rsvpYes")}</option>
                          <option value="no">${tr("ui.rsvpNo")}</option>
                          <option value="maybe">${tr("ui.rsvpMaybe")}</option>
                        </select>
                      </label>
                      <label>
                        ${tr("ui.rsvpNoteLabel")}
                        <textarea name="note" rows="3"></textarea>
                      </label>
                      <div class="actions">
                        <button type="submit" data-requires-network>${tr("ui.rsvpSave")}</button>
                        <button type="button" class="secondary" data-action="refresh-rsvps" data-event-id="${escapeHtml(eventId)}" data-requires-network>${tr("ui.rsvpsRefresh")}</button>
                      </div>
                    </form>
                    ${rsvpsBody}
                  </section>
                </div>
              </div>
              `
                : ""
            }
          </li>
        `
          })
          .join("")}
      </ul>
    `;

  const cacheInfo = user && cachedAt
    ? (isOnline()
      ? tr("ui.onlineFreshInfo", { time: formatDateTime(cachedAt) })
      : tr("ui.offlineCachedInfo", {
          time: formatDateTime(cachedAt),
          relative: formatRelativeTime(cachedAt),
        }))
    : "";

  app.innerHTML = `
    <main class="page">
      <header class="hero">
        <div class="hero-topbar">
          <h1>${tr("ui.title")}</h1>
          <label class="language-switcher">
            <span>${tr("ui.languageLabel")}</span>
            <select data-action="locale-switch" aria-label="${tr("ui.languageLabel")}">
              <option value="en">${tr("ui.languageEnglish")}</option>
              <option value="nb">${tr("ui.languageNorwegian")}</option>
            </select>
          </label>
        </div>
        <p>${tr("ui.subtitle")}</p>
        <button type="button" class="secondary" data-action="install" hidden>${tr("ui.installApp")}</button>
      </header>

      <section class="panel">
        <h2>${user ? tr("ui.account") : tr("ui.createAccount")}</h2>
        <p class="network-indicator" data-network-status aria-live="polite"></p>
        <p class="status" data-status role="status" aria-live="polite"></p>
        <p class="status error-summary" data-error-summary role="alert" aria-live="assertive" hidden></p>
        ${cacheInfo ? `<p class="cache-info">${cacheInfo}</p>` : ""}

        ${
          user
            ? `
          <div class="account">
            <div><strong>${tr("ui.userId")}:</strong> ${user.id}</div>
            <div><strong>${tr("ui.email")}:</strong> ${user.email}</div>
            <div><strong>${tr("ui.displayName")}:</strong> ${user.displayName}</div>
            <div><strong>${tr("ui.consentTos")}:</strong> ${formatDateTime(user.tosConsentAt)}</div>
            <div><strong>${tr("ui.consentPrivacy")}:</strong> ${formatDateTime(user.privacyConsentAt)}</div>
            <div><strong>${tr("ui.lastUpdated")}:</strong> ${cachedAt ? `${formatDateTime(cachedAt)} (${formatRelativeTime(cachedAt)})` : "-"}</div>
          </div>
          <div class="actions">
            <button type="button" data-action="refresh" data-requires-network>${tr("ui.refreshProfile")}</button>
            <button type="button" class="secondary" data-action="logout">${tr("ui.logout")}</button>
            <button type="button" class="danger" data-action="delete" data-requires-network>${tr("ui.deleteAccount")}</button>
          </div>
        `
            : `
          <form class="form" data-form="login" novalidate>
            <h3>${tr("ui.loginExistingAccount")}</h3>
            <label for="login-email-input">
              ${tr("ui.loginEmailLabel")}
              <input id="login-email-input" type="email" name="email" placeholder="${tr("ui.emailPlaceholder")}" autocomplete="email" required />
            </label>
            <label for="login-password-input">
              ${tr("ui.loginPasswordLabel")}
              <input id="login-password-input" type="password" name="password" placeholder="${tr("ui.passwordPlaceholder")}" autocomplete="current-password" minlength="8" required />
            </label>
            <button type="submit" data-requires-network>${tr("ui.loginButton")}</button>
          </form>

          <form class="form" data-form="signup" novalidate>
            <label for="email-input">
              ${tr("ui.email")}
              <input id="email-input" type="email" name="email" placeholder="${tr("ui.emailPlaceholder")}" autocomplete="email" required />
            </label>
            <label for="display-name-input">
              ${tr("ui.displayName")}
              <input id="display-name-input" type="text" name="displayName" placeholder="${tr("ui.displayNamePlaceholder")}" autocomplete="name" required />
            </label>
            <label for="password-input">
              ${tr("ui.loginPasswordLabel")}
              <input id="password-input" type="password" name="password" placeholder="${tr("ui.passwordPlaceholder")}" autocomplete="new-password" minlength="8" required />
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

      ${
        user
          ? `
      <section class="panel">
        <h2>${tr("ui.eventsTitle")}</h2>
        <p class="status" data-events-status role="status" aria-live="polite"></p>
        <div class="actions">
          <button type="button" data-action="refresh-events" data-requires-network>${tr("ui.eventsRefresh")}</button>
        </div>
        <form class="form" data-form="event" novalidate>
          <label for="event-title-input">
            ${tr("ui.eventsTitleField")}
            <input id="event-title-input" type="text" name="title" value="${eventTitleValue}" required />
          </label>
          <label for="event-starts-at-input">
            ${tr("ui.eventsStartsAtLabel")}
            <input id="event-starts-at-input" type="datetime-local" name="startsAt" value="${eventStartsAtValue}" required />
          </label>
          <label for="event-ends-at-input">
            ${tr("ui.eventsEndsAtLabel")}
            <input id="event-ends-at-input" type="datetime-local" name="endsAt" value="${eventEndsAtValue}" />
          </label>
          <label for="event-location-input">
            ${tr("ui.eventsLocationLabel")}
            <input id="event-location-input" type="text" name="location" value="${eventLocationValue}" />
          </label>
          <label for="event-notes-input">
            ${tr("ui.eventsNotesLabel")}
            <textarea id="event-notes-input" name="notes" rows="3">${eventNotesValue}</textarea>
          </label>
          <div class="actions">
            <button type="submit" data-requires-network>${eventFormSubmitLabel}</button>
            ${
              editingEvent
                ? `<button type="button" class="secondary" data-action="cancel-event-edit">${tr("ui.eventsCancelEdit")}</button>`
                : ""
            }
          </div>
        </form>
        ${eventsState.error ? `<p class="status" data-type="error">${escapeHtml(eventsState.error)}</p>` : ""}
        ${eventsBody}
      </section>
      `
          : ""
      }
    </main>
  `;

  wireLanguageSwitcher();
  wireInstallButton();

  if (!user) {
    const loginForm = document.querySelector("[data-form='login']");
    const form = document.querySelector("[data-form='signup']");

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("");
      setErrorSummary("");

      const submitButton = loginForm.querySelector("button[type='submit']");

      if (!isOnline()) {
        const message = tr("ui.statusRequiresOnline");
        setStatus(message, "error");
        setErrorSummary(message);
        return;
      }

      if (!loginForm.reportValidity()) {
        focusFirstInvalidControl(loginForm);
        return;
      }

      const formData = new FormData(loginForm);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");
      setControlLoading(submitButton, true, tr("ui.loginButton"));

      try {
        const response = await fetch(`${API_BASE}/users/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = localizeApiError(error, "ui.statusLoginFailed");
          setStatus(message, "error");
          setErrorSummary(message);
          return;
        }

        const profile = await response.json();
        saveUserState(profile);
        await restorePendingInviteContext();
        render();
        setStatus(tr("ui.statusLoggedIn"), "success");
      } catch {
        const message = tr("ui.statusLoginNetwork");
        setStatus(message, "error");
        setErrorSummary(message);
      } finally {
        setControlLoading(submitButton, false, tr("ui.loginButton"));
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("");
      setErrorSummary("");

      const submitButton = form.querySelector("button[type='submit']");

      if (!isOnline()) {
        const message = tr("ui.statusRequiresOnline");
        setStatus(message, "error");
        setErrorSummary(message);
        return;
      }

      if (!form.reportValidity()) {
        focusFirstInvalidControl(form);
        return;
      }

      const formData = new FormData(form);
      const email = formData.get("email");
      const password = String(formData.get("password") || "");
      const displayName = formData.get("displayName");
      const now = new Date().toISOString();
      setControlLoading(submitButton, true, tr("ui.loadingCreateAccount"));

      try {
        const response = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            displayName,
            tosConsentAt: now,
            privacyConsentAt: now,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = localizeApiError(error, "ui.statusCreateFailed");
          setStatus(message, "error");
          setErrorSummary(message);
          return;
        }

        const data = await response.json();
        const newUser = {
          id: data.id,
          email,
          displayName,
          tosConsentAt: now,
          privacyConsentAt: now,
          createdAt: now,
        };
        saveUserState(newUser, now);
        await restorePendingInviteContext();
        render();
        setStatus(tr("ui.statusCreated"), "success");
      } catch {
        const message = tr("ui.statusCreateNetwork");
        setStatus(message, "error");
        setErrorSummary(message);
      } finally {
        setControlLoading(submitButton, false, tr("ui.loadingCreateAccount"));
      }
    });

    if (getPendingInvite()) {
      setStatus(tr("ui.inviteSignInRequired"), "info");
    }
  } else {
    const refreshButton = document.querySelector("[data-action='refresh']");
    const logoutButton = document.querySelector("[data-action='logout']");
    const deleteButton = document.querySelector("[data-action='delete']");

    logoutButton.addEventListener("click", () => {
      clearUser();
      render();
      setStatus(tr("ui.statusLoggedOut"), "success");
    });

    refreshButton.addEventListener("click", async () => {
      setStatus("");
      setErrorSummary("");

      if (!isOnline()) {
        const message = tr("ui.statusRequiresOnline");
        setStatus(message, "error");
        setErrorSummary(message);
        return;
      }

      setControlLoading(refreshButton, true, tr("ui.loadingRefreshProfile"));

      try {
        const response = await fetch(`${API_BASE}/users/${user.id}`);
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = localizeApiError(error, "ui.statusLoadFailed");
          setStatus(message, "error");
          setErrorSummary(message);
          return;
        }
        const profile = await response.json();
        saveUserState(profile);
        render();
        setStatus(tr("ui.statusRefreshed"), "success");
      } catch {
        const message = tr("ui.statusRefreshNetwork");
        setStatus(message, "error");
        setErrorSummary(message);
      } finally {
        setControlLoading(refreshButton, false, tr("ui.loadingRefreshProfile"));
      }
    });

    deleteButton.addEventListener("click", async () => {
      setErrorSummary("");

      if (!isOnline()) {
        const message = tr("ui.statusRequiresOnline");
        setStatus(message, "error");
        setErrorSummary(message);
        return;
      }

      const ok = window.confirm(tr("ui.confirmDelete"));
      if (!ok) return;

      setStatus("");
      setControlLoading(deleteButton, true, tr("ui.loadingDeleteAccount"));

      try {
        const response = await fetch(`${API_BASE}/users/${user.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = localizeApiError(error, "ui.statusDeleteFailed");
          setStatus(message, "error");
          setErrorSummary(message);
          return;
        }

        clearUser();
        render();
        setStatus(tr("ui.statusDeleted"), "success");
      } catch {
        const message = tr("ui.statusDeleteNetwork");
        setStatus(message, "error");
        setErrorSummary(message);
      } finally {
        setControlLoading(deleteButton, false, tr("ui.loadingDeleteAccount"));
      }
    });

    const eventsForm = document.querySelector("[data-form='event']");
    const refreshEventsButton = document.querySelector("[data-action='refresh-events']");
    const cancelEventEditButton = document.querySelector("[data-action='cancel-event-edit']");

    refreshEventsButton?.addEventListener("click", async () => {
      setEventsStatus("");

      setControlLoading(refreshEventsButton, true, tr("ui.eventsLoading"));

      await loadEvents({ showLoading: true });
      if (!getCurrentUserId()) {
        setControlLoading(refreshEventsButton, false, tr("ui.eventsLoading"));
        return;
      }
      setEventsStatus(tr("ui.eventsRefreshed"), "success");
      setControlLoading(refreshEventsButton, false, tr("ui.eventsLoading"));
    });

    cancelEventEditButton?.addEventListener("click", () => {
      eventsState.editingId = null;
      render();
    });

    eventsForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      setEventsStatus("");

      if (!isOnline()) {
        setEventsStatus(tr("ui.statusRequiresOnline"), "error");
        return;
      }

      if (!eventsForm.reportValidity()) {
        focusFirstInvalidControl(eventsForm);
        return;
      }

      if (!user?.id) {
        setEventsStatus(tr("ui.eventsSaveFailed"), "error");
        return;
      }

      const formData = new FormData(eventsForm);
      const startsAtIso = toIsoFromInput(String(formData.get("startsAt") || ""));
      const endsAtRaw = String(formData.get("endsAt") || "").trim();
      const endsAtIso = endsAtRaw ? toIsoFromInput(endsAtRaw) : null;

      if (!startsAtIso) {
        setEventsStatus(tr("ui.eventsInvalidDate"), "error");
        return;
      }

      if (endsAtIso && new Date(endsAtIso).getTime() < new Date(startsAtIso).getTime()) {
        setEventsStatus(tr("ui.eventsEndsBeforeStart"), "error");
        return;
      }

      const submitButton = eventsForm.querySelector("button[type='submit']");
      const payload = {
        title: String(formData.get("title") || "").trim(),
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        location: String(formData.get("location") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim() || null,
      };

      const isEditing = Boolean(eventsState.editingId);
      const endpoint = isEditing
        ? `${API_BASE}/events/${eventsState.editingId}`
        : `${API_BASE}/events`;
      const method = isEditing ? "PUT" : "POST";

      setControlLoading(submitButton, true, tr("ui.eventsSaving"));

      try {
        const response = await fetch(endpoint, {
          method,
          headers: buildUserHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          if (handleAuthFailure(response, error)) {
            return;
          }
          setEventsStatus(localizeApiError(error, "ui.eventsSaveFailed"), "error");
          return;
        }

        eventsState.editingId = null;
        await loadEvents({ showLoading: false });
        setEventsStatus(isEditing ? tr("ui.eventsUpdated") : tr("ui.eventsCreated"), "success");
      } catch {
        setEventsStatus(tr("ui.eventsSaveNetwork"), "error");
      } finally {
        setControlLoading(submitButton, false, tr("ui.eventsSaving"));
      }
    });

    document.querySelectorAll("[data-action='edit-event']").forEach((button) => {
      button.addEventListener("click", () => {
        const eventId = button.dataset.eventId;
        if (!eventId) return;

        eventsState.editingId = eventId;
        render();
      });
    });

    document.querySelectorAll("[data-action='toggle-event-collab']").forEach((button) => {
      button.addEventListener("click", async () => {
        const eventId = button.dataset.eventId;
        if (!eventId) return;

        eventsState.expandedEventId = eventsState.expandedEventId === eventId ? null : eventId;
        render();

        if (eventsState.expandedEventId === eventId) {
          const invitationState = ensureEventCollectionState("invitations", eventId);
          const rsvpState = ensureEventCollectionState("rsvps", eventId);

          if (!invitationState.loaded && !invitationState.loading) {
            loadInvitations(eventId, { showLoading: true });
          }

          if (!rsvpState.loaded && !rsvpState.loading) {
            loadRsvps(eventId, { showLoading: true });
          }
        }
      });
    });

    document.querySelectorAll("[data-action='refresh-invitations']").forEach((button) => {
      button.addEventListener("click", async () => {
        const eventId = button.dataset.eventId;
        if (!eventId) return;
        if (isGuestOnlyEvent(eventId)) return;

        setControlLoading(button, true, tr("ui.invitationsLoading"));
        await loadInvitations(eventId, { showLoading: true });
        setCollectionStatus("invitations", eventId, tr("ui.invitationsRefreshed"), "success");
        setControlLoading(button, false, tr("ui.invitationsLoading"));
      });
    });

    document.querySelectorAll("[data-action='refresh-rsvps']").forEach((button) => {
      button.addEventListener("click", async () => {
        const eventId = button.dataset.eventId;
        if (!eventId) return;

        setControlLoading(button, true, tr("ui.rsvpsLoading"));
        await loadRsvps(eventId, { showLoading: true });
        setCollectionStatus("rsvps", eventId, tr("ui.rsvpsRefreshed"), "success");
        setControlLoading(button, false, tr("ui.rsvpsLoading"));
      });
    });

    document.querySelectorAll("[data-form='invitation']").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const eventId = form.dataset.eventId;
        if (!eventId) return;
        if (isGuestOnlyEvent(eventId)) return;

        if (!isOnline()) {
          setCollectionStatus("invitations", eventId, tr("ui.statusRequiresOnline"), "error");
          render();
          return;
        }

        if (!form.reportValidity()) {
          focusFirstInvalidControl(form);
          return;
        }

        const submitButton = form.querySelector("button[type='submit']");
        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim();

        setControlLoading(submitButton, true, tr("ui.invitationsSending"));

        try {
          const response = await fetch(`${API_BASE}/events/${eventId}/invitations`, {
            method: "POST",
            headers: buildUserHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ email }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (handleAuthFailure(response, error)) {
              return;
            }
            setCollectionStatus(
              "invitations",
              eventId,
              localizeApiError(error, "ui.invitationsSendFailed"),
              "error"
            );
            render();
            return;
          }

          form.reset();
          await loadInvitations(eventId, { showLoading: false });
          setCollectionStatus("invitations", eventId, tr("ui.invitationsSent"), "success");
        } catch {
          setCollectionStatus("invitations", eventId, tr("ui.invitationsSendNetwork"), "error");
        } finally {
          setControlLoading(submitButton, false, tr("ui.invitationsSending"));
          render();
        }
      });
    });

    document.querySelectorAll("[data-form='rsvp']").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const eventId = form.dataset.eventId;
        if (!eventId || !user?.id) return;

        if (!isOnline()) {
          setCollectionStatus("rsvps", eventId, tr("ui.statusRequiresOnline"), "error");
          render();
          return;
        }

        if (!form.reportValidity()) {
          focusFirstInvalidControl(form);
          return;
        }

        const submitButton = form.querySelector("button[type='submit']");
        const formData = new FormData(form);
        const status = String(formData.get("status") || "").trim();
        const note = String(formData.get("note") || "").trim();

        setControlLoading(submitButton, true, tr("ui.rsvpSaving"));

        try {
          const response = await fetch(`${API_BASE}/events/${eventId}/rsvps`, {
            method: "POST",
            headers: buildUserHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({
              status,
              note: note || null,
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (handleAuthFailure(response, error)) {
              return;
            }
            setCollectionStatus("rsvps", eventId, localizeApiError(error, "ui.rsvpSaveFailed"), "error");
            render();
            return;
          }

          await loadRsvps(eventId, { showLoading: false });
          setCollectionStatus("rsvps", eventId, tr("ui.rsvpSaved"), "success");
        } catch {
          setCollectionStatus("rsvps", eventId, tr("ui.rsvpSaveNetwork"), "error");
        } finally {
          setControlLoading(submitButton, false, tr("ui.rsvpSaving"));
          render();
        }
      });
    });

    document.querySelectorAll("[data-action='delete-event']").forEach((button) => {
      button.addEventListener("click", async () => {
        const eventId = button.dataset.eventId;
        if (!eventId) return;
        if (isGuestOnlyEvent(eventId)) return;

        if (!isOnline()) {
          setEventsStatus(tr("ui.statusRequiresOnline"), "error");
          return;
        }

        if (!user?.id) {
          setEventsStatus(tr("ui.eventsDeleteFailed"), "error");
          return;
        }

        const ok = window.confirm(tr("ui.eventsConfirmDelete"));
        if (!ok) return;

        setControlLoading(button, true, tr("ui.eventsDeleting"));

        try {
          const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: "DELETE",
            headers: buildUserHeaders(),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (handleAuthFailure(response, error)) {
              return;
            }
            setEventsStatus(localizeApiError(error, "ui.eventsDeleteFailed"), "error");
            return;
          }

          if (eventsState.editingId === eventId) {
            eventsState.editingId = null;
          }

          await loadEvents({ showLoading: false });
          setEventsStatus(tr("ui.eventsDeleted"), "success");
        } catch {
          setEventsStatus(tr("ui.eventsDeleteNetwork"), "error");
        } finally {
          setControlLoading(button, false, tr("ui.eventsDeleting"));
        }
      });
    });

    if (!eventsState.loaded && !eventsState.loading) {
      if (getPendingInvite()) {
        restorePendingInviteContext();
      } else {
        loadEvents({ showLoading: true });
      }
    }
  }

  updateConnectionUi();
};

window.addEventListener("online", updateConnectionUi);
window.addEventListener("offline", updateConnectionUi);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  const installButton = document.querySelector("[data-action='install']");
  if (installButton) {
    installButton.hidden = false;
  }
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  setStatus(tr("ui.installedApp"), "success");

  const installButton = document.querySelector("[data-action='install']");
  if (installButton) {
    installButton.hidden = true;
  }
});

render();

/* ---- PWA: register service worker ---- */
if ("serviceWorker" in navigator) {
  let isReloadingForUpdate = false;

  const maybeApplyUpdate = (registration) => {
    if (!registration?.waiting) return;

    const shouldReload = window.confirm(tr("ui.swUpdatePrompt"));
    if (shouldReload) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isReloadingForUpdate) return;
    isReloadingForUpdate = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      maybeApplyUpdate(registration);

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            maybeApplyUpdate(registration);
          }
        });
      });
    } catch {
      // Keep app usable even if service worker registration fails.
    }
  });
}
