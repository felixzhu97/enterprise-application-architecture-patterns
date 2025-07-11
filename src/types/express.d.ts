import "express-session";

declare global {
  namespace Express {
    interface Request {
      flash(type: string): string[];
      flash(type: string, message: string | string[] | any): void;
      csrfToken?(): string;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      email: string;
      role: string;
    };
    csrfToken?: string;
  }
}
