// ============================================================
// NEXUS — Authentification (inscription, connexion, JWT)
// ============================================================
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COOKIE = "nexus_token";
const MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 jours

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, is_admin: user.is_admin },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE);
}

// Middleware : attache req.user si un token valide est présent (sinon null)
export function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Connexion requise." });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: "Accès refusé." });
  next();
}

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

// ---- Inscription ----
export async function register(req, res) {
  const { email, password, fullName } = req.body || {};
  if (!emailOk(email)) return res.status(400).json({ error: "Email invalide." });
  if (!password || password.length < 8)
    return res.status(400).json({ error: "Mot de passe : 8 caractères minimum." });

  const existing = await query("SELECT id, is_guest FROM users WHERE email=$1", [email]);
  const hash = await bcrypt.hash(password, 10);

  let user;
  if (existing.rows[0] && existing.rows[0].is_guest) {
    // On transforme un ancien invité en vrai compte
    const r = await query(
      "UPDATE users SET password_hash=$1, full_name=$2, is_guest=FALSE WHERE id=$3 RETURNING *",
      [hash, fullName || null, existing.rows[0].id]
    );
    user = r.rows[0];
  } else if (existing.rows[0]) {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
  } else {
    const r = await query(
      "INSERT INTO users (email, password_hash, full_name) VALUES ($1,$2,$3) RETURNING *",
      [email, hash, fullName || null]
    );
    user = r.rows[0];
  }

  const token = sign(user);
  setAuthCookie(res, token);
  res.json({ user: publicUser(user) });
}

// ---- Connexion ----
export async function login(req, res) {
  const { email, password } = req.body || {};
  const r = await query("SELECT * FROM users WHERE email=$1", [email]);
  const user = r.rows[0];
  if (!user || !user.password_hash)
    return res.status(401).json({ error: "Identifiants incorrects." });

  const ok = await bcrypt.compare(password || "", user.password_hash);
  if (!ok) return res.status(401).json({ error: "Identifiants incorrects." });

  const token = sign(user);
  setAuthCookie(res, token);
  res.json({ user: publicUser(user) });
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export async function me(req, res) {
  if (!req.user) return res.json({ user: null });
  const r = await query("SELECT * FROM users WHERE id=$1", [req.user.id]);
  res.json({ user: r.rows[0] ? publicUser(r.rows[0]) : null });
}

// Trouve un utilisateur par email, ou crée un invité (pour le checkout invité)
export async function findOrCreateGuest(email, fullName) {
  const r = await query("SELECT * FROM users WHERE email=$1", [email]);
  if (r.rows[0]) return r.rows[0];
  const ins = await query(
    "INSERT INTO users (email, full_name, is_guest) VALUES ($1,$2,TRUE) RETURNING *",
    [email, fullName || null]
  );
  return ins.rows[0];
}

export function publicUser(u) {
  return { id: u.id, email: u.email, fullName: u.full_name, isAdmin: u.is_admin, createdAt: u.created_at };
}
