import nodemailer from "nodemailer";
import { createHash } from "node:crypto";
import { dataStore, json, looksLikeSpam } from "../lib/common.mjs";
import { logEvent, requestInfo } from "../lib/journal.mjs";

/* Formulaire « Écrire à l'éditeur du site » : réservé aux demandes concernant le
   site lui-même (droit au retrait d'information, contact de l'éditeur technique),
   distinct du formulaire de contact de l'atelier. Envoyé via le même compte SMTP
   OVH, mais à Cédric (éditeur) plutôt qu'à l'atelier. */

const MAX_MSG_PER_WINDOW = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 heure
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJETS = ["Droit au retrait d’information", "Contacter l’éditeur du site"];
const EDITEUR_TO = "cedricmahdaoui@gmail.com";

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

  const nom = clean(body.nom, 120);
  const email = clean(body.email, 200);
  const tel = clean(body.tel, 30).replace(/[^\d+().\s-]/g, "");
  const objetRaw = clean(body.objet, 80);
  const message = clean(body.message, 5000);
  const trace = (statut, erreur = "") => logEvent("mail", {
    formulaire: "editeur", statut, objet: objetRaw, nom, email, tel, message, erreur,
    page: clean(req.headers.get("referer"), 200), ...requestInfo(req, context),
  });

  // Pièges à robots : champ caché rempli, origine suspecte, envoi trop rapide, liens en nombre.
  if (clean(body.site, 200) || looksLikeSpam(req, body)) {
    await trace("spam_bloque");
    return json({ ok: true });
  }

  const errors = [];
  if (!nom) errors.push("le nom");
  if (!EMAIL_RE.test(email)) errors.push("une adresse e-mail valide");
  if (!message) errors.push("un message");
  if (!OBJETS.includes(objetRaw)) errors.push("un objet valide");
  if (errors.length) {
    await trace("incomplet", errors.join(", "));
    return json({ error: "Merci de renseigner : " + errors.join(", ") + "." }, 400);
  }

  const store = dataStore();
  const ip = (context && context.ip) || "inconnue";
  const key = "contact-editeur-rate/" + sha(ip);
  const now = Date.now();
  let record = await store.get(key, { type: "json" }).catch(() => null);
  if (record && now - record.first > WINDOW_MS) record = null;
  if (record && record.count >= MAX_MSG_PER_WINDOW) {
    await trace("limite");
    return json({ error: "Trop de messages envoyés. Réessayez dans un moment." }, 429, { "Retry-After": "3600" });
  }
  await store.setJSON(key, { count: (record ? record.count : 0) + 1, first: record ? record.first : now }).catch(() => {});

  const transporter = nodemailer.createTransport({
    host: "smtp.mail.ovh.net",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"Site APY Musique" <${user}>`,
      to: EDITEUR_TO,
      replyTo: `"${nom}" <${email}>`,
      subject: `[Site APY Musique — ${objetRaw}] ${nom}`,
      text: `${message}\n\n—\n${nom}\n${email}${tel ? "\n" + tel : ""}`,
    });
  } catch (e) {
    console.error("contact-editeur:", e);
    await trace("echec", String((e && e.message) || e).slice(0, 300));
    return json({ error: "L'envoi a échoué. Merci de réessayer." }, 502);
  }

  await trace("envoye");
  return json({ ok: true });
};

export const config = { path: "/api/contact-editeur" };
