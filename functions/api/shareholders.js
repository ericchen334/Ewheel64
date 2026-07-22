import { badRequest, getCookie, json, unauthorized, verifySession } from "../_lib/auth.js";

async function getAuthedUser(context) {
  const token = getCookie(context.request, "ewheel_session");
  if (!token) return null;
  const payload = await verifySession(context.env, token);
  if (!payload) return null;
  const user = await context.env.DB.prepare("SELECT id, phone, role FROM users WHERE id = ?")
    .bind(payload.uid)
    .first();
  return user || null;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === "GET") {
    const { results } = await context.env.DB.prepare(
      "SELECT id, name, created_at FROM shareholders ORDER BY id DESC LIMIT 200"
    ).all();
    return json({ ok: true, shareholders: results || [] });
  }

  if (request.method === "POST") {
    const user = await getAuthedUser(context);
    if (!user) return unauthorized();
    if (user.role !== "author") return unauthorized("需要作者权限");

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    if (!name) return badRequest("请输入名字");

    const res = await context.env.DB.prepare(
      "INSERT INTO shareholders(name, author_id) VALUES(?, ?)"
    )
      .bind(name, user.id)
      .run();

    return json({ ok: true, id: res.meta?.last_row_id });
  }

  if (request.method === "DELETE") {
    const user = await getAuthedUser(context);
    if (!user) return unauthorized();
    if (user.role !== "author") return unauthorized("需要作者权限");

    const id = Number(url.searchParams.get("id") || "");
    if (!Number.isFinite(id)) return badRequest("缺少或错误的 id");

    await context.env.DB.prepare("DELETE FROM shareholders WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  return badRequest("不支持的请求方法");
}

