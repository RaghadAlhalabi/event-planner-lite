import cors from "cors";
import express from "express";

export const applyMiddleware = (app) => {
  app.use(cors());
  app.use(express.json());
};
