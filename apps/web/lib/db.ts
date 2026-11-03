import { Pool, PoolClient } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres@localhost:5432/nationx_delivery";

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export { pool };

/**
 * Execute a callback within an isolated transaction scoped to a specific user's RLS context.
 * Enforces PostgreSQL Row Level Security (RLS) on all executed queries.
 */
export async function withUserDb<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN;");
    await client.query("SET LOCAL ROLE authenticated;");
    // Secure parameterized query for claim setting
    await client.query(
      `SELECT set_config('request.jwt.claim.sub', $1, true);`,
      [userId]
    );

    const result = await fn(client);
    await client.query("COMMIT;");
    return result;
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a callback with administrative / service-role privileges.
 * Used for admin operations or initial system setups.
 */
export async function withAdminDb<T>(
  fn: (client: PoolClient) => Promise<T>,
  adminUserId?: string
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN;");
    if (adminUserId) {
      await client.query("SET LOCAL ROLE authenticated;");
      await client.query(
        `SELECT set_config('request.jwt.claim.sub', $1, true);`,
        [adminUserId]
      );
    }
    const result = await fn(client);
    await client.query("COMMIT;");
    return result;
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    client.release();
  }
}

