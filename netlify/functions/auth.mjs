import { json, requireAdmin } from "../lib/common.mjs";

export default async (req, context) => {
  const denied = await requireAdmin(req, context);
  if (denied) return denied;
  return json({ ok: true });
};

export const config = { path: "/api/auth-check" };
