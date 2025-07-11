import "express-session";

declare global {
  namespace Express {
    interface Request {
      flash(type: string, message?: string | string[]): string[] | void;
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
