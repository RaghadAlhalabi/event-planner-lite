import "./style.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
const STORAGE_KEY = "event_planner_lite_user";

const app = document.querySelector("#app");

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
        <h1>Event Planner Lite</h1>
        <p>Minimal user accounts with explicit consent.</p>
      </header>

      <section class="panel">
        <h2>${user ? "Account" : "Create account"}</h2>
        <p class="status" data-status></p>

        ${
          user
            ? `
          <div class="account">
            <div><strong>User ID:</strong> ${user.id}</div>
            <div><strong>Email:</strong> ${user.email}</div>
            <div><strong>Display name:</strong> ${user.displayName}</div>
            <div><strong>Consent (ToS):</strong> ${user.tosConsentAt}</div>
            <div><strong>Consent (Privacy):</strong> ${user.privacyConsentAt}</div>
          </div>
          <div class="actions">
            <button type="button" data-action="refresh">Refresh profile</button>
            <button type="button" class="danger" data-action="delete">Delete account</button>
          </div>
        `
            : `
          <form class="form" data-form="signup">
            <label>
              Email
              <input type="email" name="email" placeholder="you@example.com" required />
            </label>
            <label>
              Display name
              <input type="text" name="displayName" placeholder="Sam" required />
            </label>
            <div class="consent">
              <label class="checkbox">
                <input type="checkbox" name="tosConsent" required />
                I agree to the Terms of Service
              </label>
              <label class="checkbox">
                <input type="checkbox" name="privacyConsent" required />
                I agree to the Privacy Policy
              </label>
            </div>
            <button type="submit">Create account</button>
          </form>
        `
        }
      </section>

      <section class="panel">
        <h2>Policies</h2>
        <details>
          <summary>Terms of Service (summary)</summary>
          <p>Users own their data. The service is granted permission to use data to operate the app.</p>
          <p>Accounts can be terminated for misuse. Deleting an account removes personal data.</p>
        </details>
        <details>
          <summary>Privacy Policy (summary)</summary>
          <p>We collect email, display name, and consent timestamps. We use this to operate accounts.</p>
          <p>You can withdraw consent by deleting your account.</p>
        </details>
      </section>
    </main>
  `;

  if (!user) {
    const form = document.querySelector("[data-form='signup']");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("");

      const formData = new FormData(form);
      const email = formData.get("email");
      const displayName = formData.get("displayName");
      const tosConsent = formData.get("tosConsent");
      const privacyConsent = formData.get("privacyConsent");

      if (!tosConsent || !privacyConsent) {
        setStatus("You must actively consent to both policies.", "error");
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
          setStatus(error.message || "Failed to create account.", "error");
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
        setStatus("Account created.", "success");
      } catch (err) {
        setStatus("Network error while creating account.", "error");
      }
    });
  } else {
    const refreshButton = document.querySelector("[data-action='refresh']");
    const deleteButton = document.querySelector("[data-action='delete']");

    refreshButton.addEventListener("click", async () => {
      setStatus("");
      try {
        const response = await fetch(`${API_BASE}/users/${user.id}`);
        if (!response.ok) {
          setStatus("Unable to load profile.", "error");
          return;
        }
        const profile = await response.json();
        saveUser(profile);
        render();
        setStatus("Profile refreshed.", "success");
      } catch {
        setStatus("Network error while fetching profile.", "error");
      }
    });

    deleteButton.addEventListener("click", async () => {
      const ok = window.confirm(
        "This will delete your account and retract consent. Continue?"
      );
      if (!ok) return;

      setStatus("");

      try {
        const response = await fetch(`${API_BASE}/users/${user.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          setStatus("Unable to delete account.", "error");
          return;
        }

        clearUser();
        render();
        setStatus("Account deleted.", "success");
      } catch {
        setStatus("Network error while deleting account.", "error");
      }
    });
  }
};

render();

/* ---- PWA: register service worker ---- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

