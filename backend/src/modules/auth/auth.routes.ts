import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authRateLimiter } from "../../middleware/rateLimiter";
import {
  loginController,
  meController,
  registerController,
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, registerController);
authRouter.post("/login", authRateLimiter, loginController);
authRouter.get("/me", authenticate, meController);