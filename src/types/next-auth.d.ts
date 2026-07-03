import type { Role } from "@/auth";

// Augment Auth.js so the session/token carry our role. Keeps route + UI code
// type-safe when reading session.user.role.
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: Role;
    };
  }
  interface User {
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
  }
}
