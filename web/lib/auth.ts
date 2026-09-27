import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { pool } from "./db";
import { verifyPassword } from "./password";
import { pgAdapter } from "./auth-adapter";

// anyang-backend-api 1절: Auth.js v5, Google + Credentials, JWT 세션(DB 세션 테이블 미사용).
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: pgAdapter,
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const { rows } = await pool.query<{ id: string; email: string; password_hash: string }>(
          `select u.id, u.email, c.password_hash
             from users u
             join credentials c on c.user_id = u.id
            where u.email = $1`,
          [email],
        );
        const row = rows[0];
        if (!row) return null;

        const ok = await verifyPassword(row.password_hash, password);
        if (!ok) return null;

        return { id: row.id, email: row.email };
      },
    }),
  ],
  callbacks: {
    // anyang-backend-api 1절/13-0절: 로그인 provider를 JWT 클레임에 남긴다(12번 관리자 인가 의존).
    async jwt({ token, account }) {
      if (account?.provider) {
        token.provider = account.provider;
      }
      // anyang-backend-api 1-2절: session.suspended는 안내 화면 표시용일 뿐, 접근 차단
      // 판정에는 쓰지 않는다(판정은 lib/require-auth.ts의 매 요청 DB 조회로만 한다).
      if (token.sub) {
        const { rows } = await pool.query<{ suspended_at: Date | null }>(
          `select suspended_at from users where id = $1`,
          [token.sub],
        );
        token.suspended = Boolean(rows[0]?.suspended_at);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      session.provider = typeof token.provider === "string" ? token.provider : undefined;
      session.suspended = Boolean(token.suspended);
      return session;
    },
  },
});
