export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}
export interface LoginBody {
  email: string;
  password: string;
}

declare module "express-session" {
  interface SessionData {
    uid: string;
    loginTime: Date;
    lastActive: Date;
  }
}
