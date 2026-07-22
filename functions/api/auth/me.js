import { getCookie, json, verifySession } from "../../_lib/auth.js";

export async function onRequest(context) {
  const token = getCookie(context.request, "ewheel_session");
  if (!token) return json({ ok: true, user: null });

  const payload = await verifySession(context.env, token);
  if (!payload) return json({ ok: true, user: null });

  const user = await context.env.DB.prepare(
    "SELECT id, phone, role, created_at FROM users WHERE id = ?"
  )
    .bind(payload.uid)
    .first();

  return json({ ok: true, user: user || null });
}

