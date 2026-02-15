export const createUsersController = ({ apiRequest, render }) => {
  const state = {
    status: "",
    statusType: "info",
    user: null,
  };

  const nowIso = () => new Date().toISOString();

  const buildUserPayload = ({ email, displayName, tosConsent, privacyConsent }) => {
    return {
      email,
      displayName,
      tosConsentAt: tosConsent ? nowIso() : null,
      privacyConsentAt: privacyConsent ? nowIso() : null,
    };
  };

  const setStatus = (message, type = "info") => {
    state.status = message;
    state.statusType = type;
    updateView();
  };

  const createUser = async ({ email, displayName, tosConsent, privacyConsent }) => {
    if (!tosConsent || !privacyConsent) {
      setStatus("You must agree to both policies.", "error");
      return;
    }

    setStatus("Creating user...");
    const result = await apiRequest("/users", {
      method: "POST",
      body: {
        ...buildUserPayload({ email, displayName, tosConsent, privacyConsent }),
      },
    });

    if (!result.ok) {
      const message = result.data?.message || "Failed to create user.";
      setStatus(message, "error");
      return;
    }

    state.user = result.data;
    setStatus("User created.", "success");
  };

  const deleteUser = async ({ id }) => {
    if (!id) {
      setStatus("User ID is required.", "error");
      return;
    }

    setStatus("Deleting user...");
    const result = await apiRequest(`/users/${id}`, {
      method: "DELETE",
    });

    if (!result.ok) {
      const message = result.data?.message || "Failed to delete user.";
      setStatus(message, "error");
      return;
    }

    state.user = null;
    setStatus("User deleted.", "success");
  };

  const editUser = () => {
    setStatus("Edit is not available in the API yet.", "error");
  };

  const actions = {
    onCreate: createUser,
    onEdit: editUser,
    onDelete: deleteUser,
  };

  const updateView = () => {
    render(state, actions);
  };

  const init = () => {
    updateView();
  };

  return { init };
};
