import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: number; email: string; isAdmin: boolean };
    }
  }
}

export {};
