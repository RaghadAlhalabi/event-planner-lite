import { apiRequest } from "./modules/fetchManager.mjs";
import { createUsersController } from "./controllers/usersController.mjs";
import { renderApp } from "./views/userView.mjs";

const app = document.querySelector("#app");

const controller = createUsersController({
  apiRequest,
  render: (state, actions) => renderApp(app, state, actions),
});

controller.init();
