import cors from "cors";
import express from "express";

import { localeMiddleware } from "./locale.mjs";

export const applyMiddleware = (app) => {
  app.use(cors());
  app.use(express.json());
  app.use(localeMiddleware);
};
