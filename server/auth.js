// ============================================================
// NEXUS — Authentification (inscription, connexion, JWT)
// ============================================================
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { query } from "./db.js";
import { sendVerify, sendWelcome } from "./email.js";

const randomToken = () => crypto.randomBytes(24).toString("hex");
const verifyLink = (req, token) => {
  const site = (process.env.SITE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  return `${site}/api/auth/verify?token=${token}`;
};

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
  const vtoken = randomToken();

  let user;
  if (existing.rows[0] && existing.rows[0].is_guest) {
    // On transforme un ancien invité en vrai compte (à vérifier)
    const r = await query(
      "UPDATE users SET password_hash=$1, full_name=$2, is_guest=FALSE, email_verified=FALSE, verify_token=$3 WHERE id=$4 RETURNING *",
      [hash, fullName || null, vtoken, existing.rows[0].id]
    );
    user = r.rows[0];
  } else if (existing.rows[0]) {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
  } else {
    const r = await query(
      "INSERT INTO users (email, password_hash, full_name, email_verified, verify_token) VALUES ($1,$2,$3,FALSE,$4) RETURNING *",
      [email, hash, fullName || null, vtoken]
    );
    user = r.rows[0];
  }

  // On NE connecte PAS : compte à valider par e-mail d'abord.
  sendVerify(user, verifyLink(req, vtoken)).catch((e) => console.error("email verify:", e));
  res.json({ ok: true, needVerify: true });
}

// ---- Validation de l'e-mail (clic sur le lien) ----
export async function verifyEmail(req, res) {
  const token = String(req.query.token || "").trim();
  if (!token) return res.redirect(302, "/compte.html?verified=0");
  const r = await query("SELECT * FROM users WHERE verify_token=$1", [token]);
  const user = r.rows[0];
  if (!user) return res.redirect(302, "/compte.html?verified=0");
  await query("UPDATE users SET email_verified=TRUE, verify_token=NULL WHERE id=$1", [user.id]);
  sendWelcome(user).catch(() => {});
  // On connecte automatiquement après validation
  setAuthCookie(res, sign(user));
  return res.redirect(302, "/compte.html?verified=1");
}

// ---- Renvoi du lien de validation ----
export async function resendVerification(req, res) {
  const { email } = req.body || {};
  if (!emailOk(email)) return res.status(400).json({ error: "Email invalide." });
  const r = await query("SELECT * FROM users WHERE email=$1", [email]);
  const user = r.rows[0];
  // Réponse neutre (ne révèle pas si le compte existe)
  if (user && user.email_verified === false) {
    const vtoken = randomToken();
    await query("UPDATE users SET verify_token=$1 WHERE id=$2", [vtoken, user.id]);
    sendVerify(user, verifyLink(req, vtoken)).catch(() => {});
  }
  res.json({ ok: true });
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

  // Blocage tant que l'e-mail n'est pas validé (uniquement pour les comptes
  // créés avec le nouveau système : email_verified strictement FALSE).
  if (user.email_verified === false)
    return res.status(403).json({
      error: "Compte non vérifié. Clique le lien reçu par e-mail, ou demande un nouveau lien ci-dessous.",
      needVerify: true,
    });

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
