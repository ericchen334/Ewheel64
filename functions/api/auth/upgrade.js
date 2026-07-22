import { badRequest, getCookie, json, unauthorized, verifySession } from "../../_lib/auth.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return badRequest("仅支持 POST");

  const token = getCookie(context.request, "ewheel_session");
  if (!token) return unauthorized();
  const payload = await verifySession(context.env, token);
  if (!payload) return unauthorized();

  const body = await context.request.json().catch(() => ({}));
  const adminCode = String(body.adminCode || "").trim();
  if (adminCode !== "911458") return badRequest("管理员 code 不正确");

  await context.env.DB.prepare("UPDATE users SET role = 'author' WHERE id = ?")
    .bind(payload.uid)
    .run();

  const user = await context.env.DB.prepare("SELECT id, phone, role FROM users WHERE id = ?")
    .bind(payload.uid)
    .first();

  return json({ ok: true, user });
}

