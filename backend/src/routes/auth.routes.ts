import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { validateBody } from "../middleware/validate.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const authRouter = Router();

authRouter.post("/login", validateBody(loginSchema), (req, res) => {
  const { email, password } = req.body;

  if (email !== env.adminEmail || password !== env.adminPassword) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ email, role: "admin" }, env.jwtSecret, { expiresIn: "12h" });
  res.json({ token });
});
