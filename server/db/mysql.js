import mysql from 'mysql2/promise';

// Connection pool – created once on first call to getPool().
let pool;

/**
 * Returns the shared MySQL connection pool.
 * All connection settings must be provided via environment variables:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */
export function getPool() {
  if (!pool) {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
      throw new Error(
        'Missing required database environment variables. ' +
        'Please set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.'
      );
    }
    pool = mysql.createPool({
      host: DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

/**
 * Creates the required tables if they do not already exist.
 * Call once at startup after verifying connectivity.
 */
export async function initSchema() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      username      VARCHAR(30)  NOT NULL,
      username_lower VARCHAR(30) NOT NULL,
      pin           CHAR(4)      NOT NULL,
      total_score   INT          NOT NULL DEFAULT 0,
      created_at    DATETIME     NOT NULL,
      last_login_at DATETIME     NOT NULL,
      UNIQUE KEY uq_username_lower (username_lower)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      user_id           INT         NOT NULL,
      username_snapshot VARCHAR(30) NOT NULL,
      score             INT         NOT NULL,
      category          VARCHAR(50),
      level             INT,
      created_at        DATETIME    NOT NULL,
      KEY idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS progress (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      user_id   INT         NOT NULL,
      category  VARCHAR(50) NOT NULL,
      level     INT         NOT NULL DEFAULT 1,
      score     INT         NOT NULL DEFAULT 0,
      UNIQUE KEY uq_user_category (user_id, category),
      KEY idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/**
 * Runs a lightweight query to verify that the database is reachable and the
 * credentials are valid.  Returns true on success, false on failure.
 */
export async function checkDbConnectivity() {
  try {
    const db = getPool();
    await db.query('SELECT 1');
    console.log(
      'MySQL connectivity OK (host: %s, database: %s)',
      process.env.DB_HOST,
      process.env.DB_NAME
    );
    return true;
  } catch (err) {
    console.error('MySQL connectivity check failed: %s', err.message);
    return false;
  }
}
