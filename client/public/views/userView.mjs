const renderTemplate = (id, target) => {
  const template = document.getElementById(id);
  if (!template) {
    throw new Error(`Template not found: ${id}`);
  }

  target.innerHTML = "";
  target.appendChild(template.content.cloneNode(true));
};

class UserCreate extends HTMLElement {
  connectedCallback() {
    renderTemplate("user-create", this);
    this.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      this.dispatchEvent(
        new CustomEvent("create-user", {
          bubbles: true,
          detail: {
            email: formData.get("email"),
            displayName: formData.get("displayName"),
            tosConsent: Boolean(formData.get("tosConsent")),
            privacyConsent: Boolean(formData.get("privacyConsent")),
          },
        })
      );
    });
  }
}

class UserEdit extends HTMLElement {
  connectedCallback() {
    renderTemplate("user-edit", this);
    this.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      this.dispatchEvent(
        new CustomEvent("edit-user", {
          bubbles: true,
          detail: {
            id: formData.get("id"),
            email: formData.get("email"),
            displayName: formData.get("displayName"),
          },
        })
      );
    });
  }
}

class UserDelete extends HTMLElement {
  connectedCallback() {
    renderTemplate("user-delete", this);
    this.querySelector("button").addEventListener("click", () => {
      const id = this.querySelector("input").value;
      this.dispatchEvent(
        new CustomEvent("delete-user", {
          bubbles: true,
          detail: { id },
        })
      );
    });
  }
}

if (!customElements.get("user-create")) {
  customElements.define("user-create", UserCreate);
}

if (!customElements.get("user-edit")) {
  customElements.define("user-edit", UserEdit);
}

if (!customElements.get("user-delete")) {
  customElements.define("user-delete", UserDelete);
}

export const renderApp = (target, state, actions) => {
  renderTemplate("app-shell", target);

  const statusEl = target.querySelector(".status");
  statusEl.textContent = state.status;
  statusEl.dataset.type = state.statusType;

  const createEl = target.querySelector("user-create");
  createEl.addEventListener("create-user", (event) => {
    actions.onCreate(event.detail);
  });

  const editEl = target.querySelector("user-edit");
  editEl.addEventListener("edit-user", (event) => {
    actions.onEdit(event.detail);
  });

  const deleteEl = target.querySelector("user-delete");
  deleteEl.addEventListener("delete-user", (event) => {
    actions.onDelete(event.detail);
  });
};
