// CrestHaven backend.
// - Accounts (signup, login, logout, profile) with scrypt password hashing and session cookies
// - Property listings submitted by users, reviewed by an admin before they go public
// - Favorites per user
// - Enquiries, bookings, design briefs and consultations, saved in SQLite and pushed to HubSpot
// - Message threads between users and the admin team
// - AI design suggestions via the Gemini API
// Requires Node.js 22.5+ (built-in node:sqlite). Keep HUBSPOT_TOKEN, GEMINI_API_KEY and
// ADMIN_PASSWORD on the server only.

import express from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { openDb } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3000);
const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "1";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "cresthaven.db");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const HUBSPOT_NOTE_TO_CONTACT = 202; // HubSpot default association type: note to contact
const SESSION_DAYS = 14;
const SESSION_COOKIE = "ch_session";
const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["contact", "booking", "sell", "design", "architect"]);
const TYPE_TITLES = {
  contact: "Website enquiry",
  booking: "Property booking request",
  sell: "Sell property submission",
  design: "Design brief",
  architect: "Architect consultation request"
};
const DESIGN_FIELDS = new Set([
  "Style", "Plot size", "Plot unit", "Floors", "Budget", "Bedrooms", "Bathrooms",
  "Kitchen", "Living room", "Other space", "Dream home description"
]);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const db = openDb(DB_PATH);

// ---------- Prepared statements ----------
const st = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  userById: db.prepare("SELECT id, name, email, phone, city, role, created_at FROM users WHERE id = ?"),
  insertUser: db.prepare("INSERT INTO users (name, email, phone, city, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"),
  updateProfile: db.prepare("UPDATE users SET name = ?, phone = ?, city = ? WHERE id = ?"),
  insertSession: db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
  sessionByHash: db.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?"),
  deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
  purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at < ?"),

  insertListing: db.prepare(`INSERT INTO listings
    (user_id, title, purpose, type, location, price, beds, baths, area, description, features, images, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`),
  updateListing: db.prepare(`UPDATE listings SET title = ?, purpose = ?, type = ?, location = ?, price = ?, beds = ?, baths = ?,
    area = ?, description = ?, features = ?, images = ?, status = 'pending', admin_note = '', updated_at = ? WHERE id = ?`),
  listingById: db.prepare("SELECT * FROM listings WHERE id = ?"),
  deleteListing: db.prepare("DELETE FROM listings WHERE id = ?"),
  approvedListings: db.prepare(`SELECT l.*, u.name AS owner_name, a.id AS adv_id, a.name AS adv_name, a.role AS adv_role,
    a.phone AS adv_phone, a.whatsapp AS adv_whatsapp, a.email AS adv_email
    FROM listings l JOIN users u ON u.id = l.user_id
    LEFT JOIN listing_advisor la ON la.listing_id = l.id
    LEFT JOIN advisors a ON a.id = la.advisor_id
    WHERE l.status = 'approved' ORDER BY l.updated_at DESC`),
  myListings: db.prepare("SELECT * FROM listings WHERE user_id = ? ORDER BY updated_at DESC"),
  allListings: db.prepare(`SELECT l.*, u.name AS owner_name, u.email AS owner_email, a.id AS adv_id, a.name AS adv_name,
    a.role AS adv_role, a.phone AS adv_phone, a.whatsapp AS adv_whatsapp, a.email AS adv_email
    FROM listings l JOIN users u ON u.id = l.user_id
    LEFT JOIN listing_advisor la ON la.listing_id = l.id
    LEFT JOIN advisors a ON a.id = la.advisor_id
    ORDER BY (l.status = 'pending') DESC, l.updated_at DESC`),
  setListingStatus: db.prepare("UPDATE listings SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?"),

  favoritesOf: db.prepare("SELECT property_key FROM favorites WHERE user_id = ? ORDER BY created_at DESC"),
  addFavorite: db.prepare("INSERT OR IGNORE INTO favorites (user_id, property_key, created_at) VALUES (?, ?, ?)"),
  removeFavorite: db.prepare("DELETE FROM favorites WHERE user_id = ? AND property_key = ?"),

  insertRequest: db.prepare("INSERT INTO requests (user_id, type, name, email, phone, fields, status, crm_status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)"),
  setCrmStatus: db.prepare("UPDATE requests SET crm_status = ? WHERE id = ?"),
  requestById: db.prepare("SELECT * FROM requests WHERE id = ?"),
  requestsOfUser: db.prepare("SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC"),
  allRequests: db.prepare("SELECT * FROM requests ORDER BY created_at DESC LIMIT 200"),
  setRequestStatus: db.prepare("UPDATE requests SET status = ? WHERE id = ?"),
  messagesOf: db.prepare("SELECT sender, body, created_at FROM messages WHERE request_id = ? ORDER BY id ASC"),
  insertMessage: db.prepare("INSERT INTO messages (request_id, sender, body, created_at) VALUES (?, ?, ?, ?)")
};

// ---------- Helpers ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function num(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return Math.round(n);
}

// Accepts values such as "3", 3 or "5+" (the sell form uses "5+").
function numLoose(value, min, max) {
  const n = parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nowIso() {
  return new Date().toISOString();
}

function cleanFields(fields) {
  return (Array.isArray(fields) ? fields.slice(0, 60) : [])
    .filter((f) => Array.isArray(f) && f.length === 2)
    .map(([label, value]) => [clean(label, 80), clean(value, 2000)])
    .filter(([label, value]) => label && value);
}

// Very small in-memory rate limiter: max N requests per IP per window.
function rateLimit(limit, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 0;
      entry.start = now;
    }
    entry.count += 1;
    hits.set(key, entry);
    if (entry.count > limit) {
      res.status(429).json({ ok: false, error: "Too many requests. Please wait a moment and try again." });
      return;
    }
    next();
  };
}

// ---------- Passwords and sessions ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return ref.length === test.length && crypto.timingSafeEqual(ref, test);
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  st.insertSession.run(tokenHash(token), userId, expires);
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`
  ];
  if (COOKIE_SECURE) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSession(req, res) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) st.deleteSession.run(tokenHash(token));
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, city: row.city, role: row.role, createdAt: row.created_at };
}

// Attach req.user (or null) to every request.
function currentUser(req, res, next) {
  req.user = null;
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    const session = st.sessionByHash.get(tokenHash(token));
    if (session && session.expires_at > Date.now()) {
      const row = st.userById.get(session.user_id);
      if (row) req.user = publicUser(row);
    }
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "Please log in to continue." });
    return;
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ ok: false, error: "Admin access only." });
    return;
  }
  next();
}

function seedAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn("ADMIN_EMAIL or ADMIN_PASSWORD is not set. No admin account was created.");
    return;
  }
  if (ADMIN_PASSWORD.length < 8) {
    console.warn("ADMIN_PASSWORD must be at least 8 characters. No admin account was created.");
    return;
  }
  if (!st.userByEmail.get(ADMIN_EMAIL)) {
    st.insertUser.run("CrestHaven Admin", ADMIN_EMAIL, "", "", hashPassword(ADMIN_PASSWORD), "admin", nowIso());
    console.log(`Admin account created for ${ADMIN_EMAIL}`);
  }
}
seedAdmin();

// ---------- Listings ----------
const PURPOSES = new Set(["buy", "rent"]);

function validateListing(body) {
  const title = clean(body.title, 120);
  const purpose = PURPOSES.has(body.purpose) ? body.purpose : "buy";
  const type = clean(body.type, 40);
  const location = clean(body.location, 120);
  const price = num(body.price, 1, 10_000_000_000);
  const beds = numLoose(body.beds, 0, 100);
  const baths = numLoose(body.baths, 0, 100);
  const area = num(body.area, 1, 1_000_000);
  const description = clean(body.description, 3000);
  const features = (Array.isArray(body.features) ? body.features : [])
    .map((f) => clean(f, 60)).filter(Boolean).slice(0, 12);

  if (!title) return { error: "Property title is required." };
  if (!type) return { error: "Please choose a property category." };
  if (!location) return { error: "Neighbourhood is required." };
  if (price === null) return { error: "Please enter a valid asking price." };
  if (beds === null || baths === null) return { error: "Please choose bedrooms and bathrooms." };
  if (area === null) return { error: "Please enter a valid area." };
  if (description.length < 20) return { error: "Please write a description of at least 20 characters." };

  return { value: { title, purpose, type, location, price, beds, baths, area, description, features } };
}

// Saves base64 image data URLs to the uploads folder and returns their public paths.
// Paths that are already stored (starting with /uploads/) are kept as they are.
function resolveImages(list) {
  const items = (Array.isArray(list) ? list : []).slice(0, MAX_IMAGES);
  const out = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    if (item.startsWith("/uploads/")) {
      out.push(item);
      continue;
    }
    const match = item.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return { error: "Photos must be JPG, PNG or WebP images." };
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > MAX_IMAGE_BYTES) return { error: "Each photo must be 3 MB or smaller." };
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
    out.push(`/uploads/${name}`);
  }
  return { value: out };
}

// Shape a database row for the public site (same keys the front-end uses).
function publicListing(row) {
  const images = JSON.parse(row.images || "[]");
  return {
    id: `l-${row.id}`,
    name: row.title,
    purpose: row.purpose,
    type: row.type,
    location: row.location,
    price: row.price,
    beds: row.beds,
    baths: row.baths,
    area: row.area,
    parking: null,
    year: null,
    listed: String(row.updated_at).slice(0, 10),
    furnished: false,
    available: true,
    images,
    alt: row.title,
    description: row.description,
    features: JSON.parse(row.features || "[]"),
    advisor: row.adv_id ? {
      name: row.adv_name,
      role: row.adv_role,
      phone: row.adv_phone,
      whatsapp: row.adv_whatsapp,
      email: row.adv_email
    } : null,
    ownerName: row.owner_name || ""
  };
}

function ownedListing(row) {
  return {
    id: row.id,
    title: row.title,
    purpose: row.purpose,
    type: row.type,
    location: row.location,
    price: row.price,
    beds: row.beds,
    baths: row.baths,
    area: row.area,
    description: row.description,
    features: JSON.parse(row.features || "[]"),
    images: JSON.parse(row.images || "[]"),
    status: row.status,
    adminNote: row.admin_note,
    updatedAt: row.updated_at,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    advisorId: row.adv_id || null
  };
}

// ---------- HubSpot ----------
async function hubspot(pathname, payload) {
  const res = await fetch(`https://api.hubapi.com${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.message || `HubSpot returned status ${res.status}`;
    throw new Error(message);
  }
  return data;
}

async function pushToHubSpot(request) {
  const [firstName, ...rest] = request.name.split(" ");
  const lastName = rest.join(" ");

  // 1. Create or update the contact by email (no duplicates).
  const upsert = await hubspot("/crm/v3/objects/contacts/batch/upsert", {
    inputs: [
      {
        idProperty: "email",
        id: request.email,
        properties: {
          email: request.email,
          firstname: firstName,
          lastname: lastName,
          phone: request.phone
        }
      }
    ]
  });
  const contactId = upsert.results?.[0]?.id;
  if (!contactId) throw new Error("HubSpot did not return a contact id.");

  // 2. Add a note on the contact with the full submission.
  const rows = request.fields
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`)
    .join("");
  const noteBody =
    `<p><strong>${escapeHtml(TYPE_TITLES[request.type] || "Website submission")}</strong> from the CrestHaven website</p>` +
    `<ul>${rows}</ul>`;

  await hubspot("/crm/v3/objects/notes", {
    properties: {
      hs_timestamp: new Date().toISOString(),
      hs_note_body: noteBody
    },
    associations: [
      {
        to: { id: contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: HUBSPOT_NOTE_TO_CONTACT }]
      }
    ]
  });

  return contactId;
}

// Stores a submission and then tries HubSpot. A HubSpot failure never loses the submission.
async function saveRequest(data, userId) {
  const now = nowIso();
  const info = st.insertRequest.run(
    userId, data.type, data.name, data.email, data.phone,
    JSON.stringify(data.fields), HUBSPOT_TOKEN ? "pending" : "skipped", now
  );
  const id = Number(info.lastInsertRowid);
  let crm = "skipped";
  if (HUBSPOT_TOKEN) {
    try {
      await pushToHubSpot(data);
      crm = "sent";
    } catch (err) {
      console.error("HubSpot error:", err.message);
      crm = "failed";
    }
    st.setCrmStatus.run(crm, id);
  }
  return { id, crm };
}

function validateRequest(body) {
  const type = clean(body.type, 20);
  const name = clean(body.name, 120);
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 40);
  const fields = cleanFields(body.fields);

  if (!ALLOWED_TYPES.has(type)) return { error: "Unknown request type." };
  if (!name) return { error: "Name is required." };
  if (!EMAIL_RE.test(email)) return { error: "A valid email is required." };
  if (!phone) return { error: "Phone number is required." };
  return { value: { type, name, email, phone, fields } };
}

// ---------- Routes: health and auth ----------
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32mb" }));
app.use(currentUser);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, hubspot: Boolean(HUBSPOT_TOKEN), ai: Boolean(GEMINI_API_KEY) });
});

app.post("/api/auth/signup", rateLimit(10, 60 * 1000), (req, res) => {
  const name = clean(req.body?.name, 120);
  const email = clean(req.body?.email, 160).toLowerCase();
  const phone = clean(req.body?.phone, 40);
  const password = String(req.body?.password || "");

  if (!name) return res.status(400).json({ ok: false, error: "Please enter your name." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid email." });
  if (password.length < 8) return res.status(400).json({ ok: false, error: "Password must be at least 8 characters." });
  if (st.userByEmail.get(email)) return res.status(409).json({ ok: false, error: "An account with this email already exists. Please log in." });

  const info = st.insertUser.run(name, email, phone, "", hashPassword(password), "user", nowIso());
  createSession(res, Number(info.lastInsertRowid));
  res.json({ ok: true, user: publicUser(st.userById.get(Number(info.lastInsertRowid))) });
});

app.post("/api/auth/login", rateLimit(10, 60 * 1000), (req, res) => {
  const email = clean(req.body?.email, 160).toLowerCase();
  const password = String(req.body?.password || "");
  const row = st.userByEmail.get(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ ok: false, error: "Email or password is not correct." });
    return;
  }
  createSession(res, row.id);
  res.json({ ok: true, user: publicUser(row) });
});

app.post("/api/auth/logout", (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.put("/api/me", requireUser, (req, res) => {
  const name = clean(req.body?.name, 120);
  const phone = clean(req.body?.phone, 40);
  const city = clean(req.body?.city, 80);
  if (!name) return res.status(400).json({ ok: false, error: "Name cannot be empty." });
  st.updateProfile.run(name, phone, city, req.user.id);
  res.json({ ok: true, user: publicUser(st.userById.get(req.user.id)) });
});

// ---------- Routes: listings ----------
app.get("/api/listings", (req, res) => {
  res.json({ ok: true, listings: st.approvedListings.all().map(publicListing) });
});

app.get("/api/my/listings", requireUser, (req, res) => {
  res.json({ ok: true, listings: st.myListings.all(req.user.id).map(ownedListing) });
});

function listingRowFor(id, user) {
  const row = st.listingById.get(id);
  if (!row) return { error: 404 };
  if (row.user_id !== user.id && user.role !== "admin") return { error: 403 };
  return { row };
}

app.post("/api/listings", requireUser, rateLimit(20, 60 * 60 * 1000), async (req, res) => {
  const check = validateListing(req.body || {});
  if (check.error) return res.status(400).json({ ok: false, error: check.error });
  const images = resolveImages(req.body?.images);
  if (images.error) return res.status(400).json({ ok: false, error: images.error });
  if (images.value.length === 0) return res.status(400).json({ ok: false, error: "Please add at least one photo." });

  const v = check.value;
  const now = nowIso();
  const info = st.insertListing.run(
    req.user.id, v.title, v.purpose, v.type, v.location, v.price, v.beds, v.baths, v.area,
    v.description, JSON.stringify(v.features), JSON.stringify(images.value), now, now
  );
  const id = Number(info.lastInsertRowid);

  // Also record the submission for the CRM, so the sales team sees it.
  const fields = [
    ["Purpose", v.purpose], ["Category", v.type], ["Location", v.location], ["Price", String(v.price)],
    ["Bedrooms", String(v.beds)], ["Bathrooms", String(v.baths)], ["Area (m²)", String(v.area)],
    ["Listing ID", `l-${id}`], ["Description", v.description]
  ];
  saveRequest({ type: "sell", name: req.user.name, email: req.user.email, phone: req.user.phone || "Not provided", fields }, req.user.id)
    .catch((err) => console.error("CRM save failed:", err.message));

  res.json({ ok: true, id: `l-${id}`, status: "pending" });
});

app.put("/api/listings/:id", requireUser, (req, res) => {
  const id = Number(req.params.id);
  const found = listingRowFor(id, req.user);
  if (found.error) return res.status(found.error === 404 ? 404 : 403).json({ ok: false, error: "Listing not found." });

  const check = validateListing(req.body || {});
  if (check.error) return res.status(400).json({ ok: false, error: check.error });
  const images = resolveImages(req.body?.images);
  if (images.error) return res.status(400).json({ ok: false, error: images.error });
  if (images.value.length === 0) return res.status(400).json({ ok: false, error: "Please keep at least one photo." });

  const v = check.value;
  st.updateListing.run(
    v.title, v.purpose, v.type, v.location, v.price, v.beds, v.baths, v.area,
    v.description, JSON.stringify(v.features), JSON.stringify(images.value), nowIso(), id
  );
  res.json({ ok: true, status: "pending" });
});

app.delete("/api/listings/:id", requireUser, (req, res) => {
  const id = Number(req.params.id);
  const found = listingRowFor(id, req.user);
  if (found.error) return res.status(found.error === 404 ? 404 : 403).json({ ok: false, error: "Listing not found." });
  st.deleteListing.run(id);
  res.json({ ok: true });
});

// ---------- Routes: favorites ----------
const KEY_RE = /^[a-z0-9-]{1,60}$/;

app.get("/api/favorites", requireUser, (req, res) => {
  res.json({ ok: true, keys: st.favoritesOf.all(req.user.id).map((r) => r.property_key) });
});

app.post("/api/favorites", requireUser, (req, res) => {
  const key = clean(req.body?.key, 60);
  if (!KEY_RE.test(key)) return res.status(400).json({ ok: false, error: "Unknown property." });
  st.addFavorite.run(req.user.id, key, nowIso());
  res.json({ ok: true });
});

app.delete("/api/favorites/:key", requireUser, (req, res) => {
  const key = clean(req.params.key, 60);
  if (!KEY_RE.test(key)) return res.status(400).json({ ok: false, error: "Unknown property." });
  st.removeFavorite.run(req.user.id, key);
  res.json({ ok: true });
});

// ---------- Routes: enquiries and message threads ----------
app.post("/api/requests", rateLimit(10, 60 * 1000), async (req, res) => {
  const check = validateRequest(req.body || {});
  if (check.error) return res.status(400).json({ ok: false, error: check.error });
  try {
    const result = await saveRequest(check.value, req.user ? req.user.id : null);
    res.json({ ok: true, id: result.id, crm: result.crm });
  } catch (err) {
    console.error("Save request failed:", err.message);
    res.status(500).json({ ok: false, error: "We could not save your request right now. Please call us or try again shortly." });
  }
});

function requestWithMessages(row) {
  return {
    id: row.id,
    type: row.type,
    typeTitle: TYPE_TITLES[row.type] || "Submission",
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
    fields: JSON.parse(row.fields || "[]"),
    messages: st.messagesOf.all(row.id).map((m) => ({ sender: m.sender, body: m.body, createdAt: m.created_at }))
  };
}

app.get("/api/my/requests", requireUser, (req, res) => {
  res.json({ ok: true, requests: st.requestsOfUser.all(req.user.id).map(requestWithMessages) });
});

app.post("/api/my/requests/:id/messages", requireUser, (req, res) => {
  const row = st.requestById.get(Number(req.params.id));
  if (!row || row.user_id !== req.user.id) return res.status(404).json({ ok: false, error: "Request not found." });
  const body = clean(req.body?.body, 2000);
  if (!body) return res.status(400).json({ ok: false, error: "Message cannot be empty." });
  st.insertMessage.run(row.id, "user", body, nowIso());
  res.json({ ok: true, request: requestWithMessages(row) });
});

// ---------- Routes: dashboard summary ----------
app.get("/api/dashboard/summary", requireUser, (req, res) => {
  const listings = st.myListings.all(req.user.id);
  const requests = st.requestsOfUser.all(req.user.id);
  const favorites = st.favoritesOf.all(req.user.id);
  const count = (status) => listings.filter((l) => l.status === status).length;
  res.json({
    ok: true,
    summary: {
      listings: listings.length,
      approved: count("approved"),
      pending: count("pending"),
      rejected: count("rejected"),
      favorites: favorites.length,
      requests: requests.length,
      replies: requests.reduce((n, r) => n + st.messagesOf.all(r.id).filter((m) => m.sender === "admin").length, 0)
    }
  });
});

// ---------- Routes: admin ----------
app.get("/api/admin/listings", requireAdmin, (req, res) => {
  res.json({ ok: true, listings: st.allListings.all().map(ownedListing) });
});

app.post("/api/admin/listings/:id/status", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = clean(req.body?.status, 20);
  if (!["approved", "rejected", "pending"].includes(status)) return res.status(400).json({ ok: false, error: "Unknown status." });
  if (!st.listingById.get(id)) return res.status(404).json({ ok: false, error: "Listing not found." });
  st.setListingStatus.run(status, clean(req.body?.note, 300), nowIso(), id);
  res.json({ ok: true });
});

app.get("/api/admin/requests", requireAdmin, (req, res) => {
  res.json({ ok: true, requests: st.allRequests.all().map(requestWithMessages) });
});

app.post("/api/admin/requests/:id/reply", requireAdmin, (req, res) => {
  const row = st.requestById.get(Number(req.params.id));
  if (!row) return res.status(404).json({ ok: false, error: "Request not found." });
  const body = clean(req.body?.body, 2000);
  if (!body) return res.status(400).json({ ok: false, error: "Reply cannot be empty." });
  st.insertMessage.run(row.id, "admin", body, nowIso());
  st.setRequestStatus.run("replied", row.id);
  res.json({ ok: true });
});

// ---------- Routes: AI design suggestions (Gemini) ----------
function buildDesignPrompt(fields) {
  const lines = fields
    .filter(([label]) => DESIGN_FIELDS.has(label))
    .map(([label, value]) => `- ${label}: ${value}`)
    .join("\n");
  return [
    "You are an experienced residential architect and interior designer.",
    "Based on the client brief below, suggest:",
    "1. Three concept directions, each with a short name and a two-sentence description.",
    "2. A simple room layout outline for the ground floor and upper floors.",
    "3. Materials and colour palette suggestions that fit the chosen style.",
    "4. Three questions the architect should ask the client next.",
    "Keep the answer under 500 words, use plain English, and use headings and short bullet points.",
    "Do not invent prices. Budget is a range the client chose.",
    "Do not use markdown. No #, *, or ** symbols. Write plain text with short headings in capital letters and simple numbered or dashed lists.",
    "Finish every section completely.",
    "",
    "Client brief:",
    lines
  ].join("\n");
}

// Only design fields go to Gemini. Name, email and phone are never included.
// Each provider returns plain text, or throws an error that includes the status.
async function askGroq(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3000
    })
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Groq ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content || "").trim();
}

async function askGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": GEMINI_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 3000 }
    })
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
}

// Only design fields go to the AI provider. Name, email and phone are never included.
// Groq is tried first (fast, generous free tier). Gemini is the backup if Groq fails.
app.post("/api/design-suggestions", rateLimit(5, 60 * 1000), async (req, res) => {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    res.status(503).json({ ok: false, error: "AI suggestions are not configured yet." });
    return;
  }
  const fields = cleanFields(req.body?.fields);
  if (!fields.some(([label]) => label === "Style")) {
    res.status(400).json({ ok: false, error: "Please choose an architectural style first." });
    return;
  }

  const prompt = buildDesignPrompt(fields);
  const providers = [];
  if (GROQ_API_KEY) providers.push(["Groq", askGroq]);
  if (GEMINI_API_KEY) providers.push(["Gemini", askGemini]);

  for (const [name, ask] of providers) {
    try {
      const text = await ask(prompt);
      if (text) {
        res.json({ ok: true, suggestions: text, provider: name });
        return;
      }
      console.error(`${name} returned an empty answer.`);
    } catch (err) {
      console.error(`${name} failed:`, err.message);
    }
  }

  res.status(502).json({ ok: false, error: "The AI service is busy right now. Please try again in a few minutes." });
});

// ---------- Routes: advisors (admin) ----------
const stAdv = {
  all: db.prepare("SELECT * FROM advisors ORDER BY name ASC"),
  byId: db.prepare("SELECT * FROM advisors WHERE id = ?"),
  insert: db.prepare("INSERT INTO advisors (name, role, phone, whatsapp, email, created_at) VALUES (?, ?, ?, ?, ?, ?)"),
  update: db.prepare("UPDATE advisors SET name = ?, role = ?, phone = ?, whatsapp = ?, email = ? WHERE id = ?"),
  remove: db.prepare("DELETE FROM advisors WHERE id = ?"),
  assign: db.prepare("INSERT OR REPLACE INTO listing_advisor (listing_id, advisor_id) VALUES (?, ?)"),
  unassign: db.prepare("DELETE FROM listing_advisor WHERE listing_id = ?")
};

function validateAdvisor(body) {
  const name = clean(body.name, 80);
  const role = clean(body.role, 80) || "Property Advisor";
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 160);
  if (name.length < 2) return { error: "Advisor name is required." };
  if (phone.replace(/\D/g, "").length < 7) return { error: "Please enter a valid phone number." };
  if (email && !EMAIL_RE.test(email)) return { error: "Please enter a valid email, or leave it empty." };
  return { value: { name, role, phone, whatsapp: phone.replace(/\D/g, ""), email } };
}

app.get("/api/admin/advisors", requireAdmin, (req, res) => {
  res.json({ ok: true, advisors: stAdv.all.all() });
});

app.post("/api/admin/advisors", requireAdmin, (req, res) => {
  const check = validateAdvisor(req.body || {});
  if (check.error) return res.status(400).json({ ok: false, error: check.error });
  const v = check.value;
  stAdv.insert.run(v.name, v.role, v.phone, v.whatsapp, v.email, nowIso());
  res.json({ ok: true });
});

app.put("/api/admin/advisors/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!stAdv.byId.get(id)) return res.status(404).json({ ok: false, error: "Advisor not found." });
  const check = validateAdvisor(req.body || {});
  if (check.error) return res.status(400).json({ ok: false, error: check.error });
  const v = check.value;
  stAdv.update.run(v.name, v.role, v.phone, v.whatsapp, v.email, id);
  res.json({ ok: true });
});

app.delete("/api/admin/advisors/:id", requireAdmin, (req, res) => {
  stAdv.remove.run(Number(req.params.id));
  res.json({ ok: true });
});

// Assigns an advisor to a listing. An empty advisorId removes the assignment (default rotation is used).
app.post("/api/admin/listings/:id/advisor", requireAdmin, (req, res) => {
  const listingId = Number(req.params.id);
  if (!st.listingById.get(listingId)) return res.status(404).json({ ok: false, error: "Listing not found." });
  const advisorId = Number(req.body?.advisorId) || 0;
  if (!advisorId) {
    stAdv.unassign.run(listingId);
    return res.json({ ok: true });
  }
  if (!stAdv.byId.get(advisorId)) return res.status(404).json({ ok: false, error: "Advisor not found." });
  stAdv.assign.run(listingId, advisorId);
  res.json({ ok: true });
});

// ---------- Static files and fallbacks ----------
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "1d", fallthrough: false }));
app.use(express.static(PUBLIC_DIR, { maxAge: "1h" }));

app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, error: "Not found." });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// JSON errors (bad JSON body, oversized body, missing upload file) instead of HTML pages.
app.use((err, req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const status = err.status || 400;
    res.status(status).json({ ok: false, error: status === 413 ? "The data is too large." : "Invalid request." });
    return;
  }
  res.status(err.status || 500).end();
});

// Remove expired sessions once an hour.
setInterval(() => st.purgeSessions.run(Date.now()), 60 * 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(`CrestHaven running on http://localhost:${PORT}`);
  if (!HUBSPOT_TOKEN) console.warn("HUBSPOT_TOKEN is not set. Submissions are saved, but not sent to HubSpot.");
  if (!GEMINI_API_KEY) console.warn("GEMINI_API_KEY is not set. AI suggestions are disabled.");
});