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

function getPage(request) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page");
  if (page !== "alloy" && page !== "resin") return null;
  return page;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === "GET") {
    const page = getPage(request);
    if (!page) return badRequest("缺少或错误的 page 参数（alloy/resin）");

    const { results } = await context.env.DB.prepare(
      "SELECT id, page, title, content, created_at FROM entries WHERE page = ? ORDER BY id DESC LIMIT 200"
    )
      .bind(page)
      .all();
    return json({ ok: true, entries: results || [] });
  }

  if (request.method === "POST") {
    const user = await getAuthedUser(context);
    if (!user) return unauthorized();
    if (user.role !== "author") return unauthorized("需要作者权限");

    const page = getPage(request);
    if (!page) return badRequest("缺少或错误的 page 参数（alloy/resin）");

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    if (!title && !content) return badRequest("标题或内容至少填写一个");

    const res = await context.env.DB.prepare(
      "INSERT INTO entries(page, title, content, author_id) VALUES(?, ?, ?, ?)"
    )
      .bind(page, title, content, user.id)
      .run();

    return json({ ok: true, id: res.meta?.last_row_id });
  }

  if (request.method === "DELETE") {
    const user = await getAuthedUser(context);
    if (!user) return unauthorized();
    if (user.role !== "author") return unauthorized("需要作者权限");

    const id = Number(url.searchParams.get("id") || "");
    if (!Number.isFinite(id)) return badRequest("缺少或错误的 id");

    await context.env.DB.prepare("DELETE FROM entries WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  return badRequest("不支持的请求方法");
}

