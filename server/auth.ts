import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "campus-hub-secret-key-2024";

export interface AuthRequest extends Request {
  user?: Omit<User, "password">;
}

export function generateToken(user: Omit<User, "password">): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function verifyToken(token: string): { id: string; email: string; role: string; fullName: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; fullName: string };
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  const { storage } = await import("./storage");
  const user = await storage.getUser(decoded.id);

  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }

  const { password: _, ...userWithoutPassword } = user;
  req.user = userWithoutPassword;
  next();
}

export async function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }

  next();
}
