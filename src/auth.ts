import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

// Roles gate what a session may do. Guests can read + recall + simulate (the
// live-demo surface); members (GitHub-authenticated) may additionally run the
// admin-gated improve()/forget() operations. Write ops still require the demo
// secrets on top — auth is defence-in-depth, not a replacement for them.
export type Role = "guest" | "member";

// GitHub OAuth is optional: it only activates when credentials are configured,
// so the app runs (and demos) with guest sign-in alone. No env, no broken tile.
const githubEnabled =
  !!process.env.AUTH_GITHUB_ID && !!process.env.AUTH_GITHUB_SECRET;

const config: NextAuthConfig = {
  // JWT sessions (required by the Credentials provider) — no DB, edge-safe so
  // the proxy/middleware can read the session on every request.
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/signin" },
  providers: [
    ...(githubEnabled ? [GitHub] : []),
    // One-click guest sign-in. No secret is accepted or checked here — it mints
    // a low-privilege guest session so anyone can explore the read/recall surface.
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {},
      authorize() {
        return {
          id: "guest",
          name: "Guest",
          email: null,
          role: "guest" as Role,
        };
      },
    }),
  ],
  callbacks: {
    // Stamp a role onto the token: GitHub → member, guest provider → guest.
    jwt({ token, user, account }) {
      if (user) {
        token.role =
          (user as { role?: Role }).role ??
          (account?.provider === "github" ? "member" : "guest");
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as Role) ?? "guest";
      }
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
export { githubEnabled };
