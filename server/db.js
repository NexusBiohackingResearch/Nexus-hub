// ============================================================
// NEXUS — Couche base de données (PostgreSQL)
// Fonctionne sur Railway (DATABASE_URL fourni par le plugin Postgres)
// et en local (variables PG* ou DATABASE_URL local).
// ============================================================
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

// SSL : requis pour une base publique/externe, mais PAS pour le réseau
// interne de Railway (*.railway.internal) ni en local.
function needsSSL(cs) {
  if (process.env.PGSSL === "disable") return false;
  if (process.env.PGSSL === "require") return true;
  if (!cs) return false;
  if (/localhost|127\.0\.0\.1|::1|\.railway\.internal/.test(cs)) return false;
  return true;
}

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: needsSSL(connectionString) ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "postgres",
        database: process.env.PGDATABASE || "nexus",
      }
);

export const query = (text, params) => pool.query(text, params);

// ------------------------------------------------------------
// Création des tables au démarrage (idempotent)
// ------------------------------------------------------------
export async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      email        TEXT UNIQUE NOT NULL,
      password_hash TEXT,               -- NULL pour les commandes invité
      full_name    TEXT,
      is_guest     BOOLEAN NOT NULL DEFAULT FALSE,
      is_admin     BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id            SERIAL PRIMARY KEY,
      reference     TEXT UNIQUE NOT NULL,          -- ex: NX-7F3A9C
      user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      email         TEXT NOT NULL,
      full_name     TEXT,
      shipping_address TEXT,
      country       TEXT,
      phone         TEXT,
      note          TEXT,
      payment_method TEXT NOT NULL DEFAULT 'crypto',
      currency      TEXT NOT NULL DEFAULT 'EUR',
      subtotal      NUMERIC(10,2) NOT NULL DEFAULT 0,
      shipping      NUMERIC(10,2) NOT NULL DEFAULT 0,
      total         NUMERIC(10,2) NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'awaiting_payment',
      -- awaiting_payment -> payment_received -> shipped | cancelled
      tracking      TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id          SERIAL PRIMARY KEY,
      order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id  TEXT NOT NULL,
      name        TEXT NOT NULL,
      unit_price  NUMERIC(10,2) NOT NULL,
      quantity    INTEGER NOT NULL
    );
  `);

  // Colonnes ajoutées pour BTCPay / promo / crypto (idempotent)
  const extraCols = [
    ["city", "TEXT"],
    ["zip", "TEXT"],
    ["promo_code", "TEXT"],
    ["discount", "NUMERIC(10,2) NOT NULL DEFAULT 0"],
    ["btc_amount", "NUMERIC(16,8)"],
    ["btc_rate", "NUMERIC(14,2)"],
    ["btcpay_invoice_id", "TEXT"],
    ["btcpay_checkout_link", "TEXT"],
    ["paid_at", "TIMESTAMPTZ"],
    ["sheet_synced", "BOOLEAN NOT NULL DEFAULT FALSE"],
    ["ga_client_id", "TEXT"],
  ];
  for (const [name, type] of extraCols) {
    await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${name} ${type};`);
  }

  await query(`CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_invoice ON orders(btcpay_invoice_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);`);

  console.log("[db] schéma prêt");
}
