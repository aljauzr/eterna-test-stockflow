import { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
  workspaceName: string;
  tokenVersion: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
