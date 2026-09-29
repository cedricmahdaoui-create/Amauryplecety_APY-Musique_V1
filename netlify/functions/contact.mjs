import nodemailer from "nodemailer";
import { createHash } from "node:crypto";
import { dataStore, json, looksLikeSpam } from "../lib/common.mjs";

const MAX_MSG_PER_WINDOW = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 heure
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJETS = ["Achat d’un instrument", "Réparation", "Estimation", "Autre demande"];

const sha = (value) => createHash("sha256").update(value).digest("hex").slice(0, 24);
const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405, { Allow: "POST" });

  const user = process.env.CONTACT_SMTP_USER;
  const pass = process.env.CONTACT_SMTP_PASSWORD;
  if (!user || !pass) {
    return json({ error: "L'envoi direct n'est pas encore activé (identifiants de messagerie non définis sur le serveur)." }, 503);
  }

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "Requête invalide." }, 400); }

  // Pièges à robots : champ caché rempli, origine suspecte, envoi trop rapide, liens en nombre.
  if (clean(body.site, 200)) return json({ ok: true });
  if (looksLikeSpam(req, body)) return json({ ok: true });

  const nom = clean(body.nom, 120);
  const email = clean(body.email, 200);
  const objetRaw = clean(body.objet, 60);
  const objet = OBJETS.includes(objetRaw) ? objetRaw : "Autre demande";
  const message = clean(body.message, 5000);

  const errors = [];
  if (!nom) errors.push("le nom");
  if (!EMAIL_RE.test(email)) errors.push("une adresse e-mail valide");
  if (!message) errors.push("un message");
  if (errors.length) return json({ error: "Merci de renseigner : " + errors.join(", ") + "." }, 400);

  const store = dataStore();
  const ip = (context && context.ip) || "inconnue";
  const key = "contact-rate/" + sha(ip);
  const now = Date.now();
  let record = await store.get(key, { type: "json" }).catch(() => null);
  if (record && now - record.first > WINDOW_MS) record = null;
  if (record && record.count >= MAX_MSG_PER_WINDOW) {
    return json({ error: "Trop de messages envoyés. Réessayez dans un moment, ou appelez directement l'atelier." }, 429, { "Retry-After": "3600" });
  }
  await store.setJSON(key, { count: (record ? record.count : 0) + 1, first: record ? record.first : now }).catch(() => {});

  const transporter = nodemailer.createTransport({
    host: "smtp.mail.ovh.net",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const to = process.env.CONTACT_TO || user;
  try {
    await transporter.sendMail({
      from: `"Site APY Musique" <${user}>`,
      to,
      replyTo: `"${nom}" <${email}>`,
      subject: `[Site — ${objet}] ${nom}`,
      text: `${message}\n\n—\n${nom}\n${email}`,
    });
  } catch (e) {
    console.error("contact:", e);
    return json({ error: "L'envoi a échoué. Merci de réessayer, ou d'appeler directement l'atelier." }, 502);
  }

  return json({ ok: true });
};

export const config = { path: "/api/contact" };
