import { Pool } from "pg";

const { DATABASE_URL } = process.env;

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export default pool;
export const hasDatabase = Boolean(DATABASE_URL);
