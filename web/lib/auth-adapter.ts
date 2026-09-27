import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import { pool } from "./db";

// anyang-database-schema의 users/accounts 테이블은 공식 Auth.js 어댑터(@auth/pg-adapter)가
// 기대하는 컬럼과 다르다(email_verified 등 snake_case, verification_tokens 미사용 — 확정).
// 그래서 Auth.js 표준 콜백이 기대하는 최소 동작만 우리 스키마에 맞춰 직접 구현한다
// (세션 테이블은 JWT 전략이라 다루지 않는다 — anyang-backend-api 1절).

type UserRow = {
  id: string;
  email: string;
  email_verified: Date | null;
  name: string | null;
};

function toAdapterUser(row: UserRow): AdapterUser {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified,
    name: row.name ?? undefined,
  };
}

export const pgAdapter: Adapter = {
  async createUser(user) {
    const { rows } = await pool.query<UserRow>(
      `insert into users (email, email_verified, name)
       values ($1, $2, $3)
       returning id, email, email_verified, name`,
      [user.email, user.emailVerified ?? null, user.name ?? null],
    );
    return toAdapterUser(rows[0]);
  },

  async getUser(id) {
    const { rows } = await pool.query<UserRow>(
      `select id, email, email_verified, name from users where id = $1`,
      [id],
    );
    return rows[0] ? toAdapterUser(rows[0]) : null;
  },

  async getUserByEmail(email) {
    const { rows } = await pool.query<UserRow>(
      `select id, email, email_verified, name from users where email = $1`,
      [email],
    );
    return rows[0] ? toAdapterUser(rows[0]) : null;
  },

  async getUserByAccount({ provider, providerAccountId }) {
    const { rows } = await pool.query<UserRow>(
      `select u.id, u.email, u.email_verified, u.name
         from users u
         join accounts a on a.user_id = u.id
        where a.provider = $1 and a.provider_account_id = $2`,
      [provider, providerAccountId],
    );
    return rows[0] ? toAdapterUser(rows[0]) : null;
  },

  async updateUser(user) {
    const { rows } = await pool.query<UserRow>(
      `update users
          set email = coalesce($2, email),
              email_verified = coalesce($3, email_verified),
              name = coalesce($4, name)
        where id = $1
        returning id, email, email_verified, name`,
      [user.id, user.email ?? null, user.emailVerified ?? null, user.name ?? null],
    );
    return toAdapterUser(rows[0]);
  },

  async linkAccount(account: AdapterAccount) {
    await pool.query(
      `insert into accounts (user_id, provider, provider_account_id, access_token, refresh_token, expires_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (provider, provider_account_id) do nothing`,
      [
        account.userId,
        account.provider,
        account.providerAccountId,
        account.access_token ?? null,
        account.refresh_token ?? null,
        account.expires_at ?? null,
      ],
    );
    return account;
  },

  async unlinkAccount({ provider, providerAccountId }) {
    await pool.query(
      `delete from accounts where provider = $1 and provider_account_id = $2`,
      [provider, providerAccountId],
    );
  },

  async deleteUser(id) {
    await pool.query(`delete from users where id = $1`, [id]);
  },
};
