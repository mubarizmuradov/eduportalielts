import type { EduUser } from '../identity/identity.types';

export interface AuthContext {
  user: EduUser;
  sessionId: string;
}

declare module 'express' {
  interface Request {
    auth?: AuthContext;
  }
}
