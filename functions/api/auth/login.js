import { badRequest, json, pbkdf2Hash, setCookie, signSession } from "../../_lib/auth.js";

function parseSalt(s) {
  const nums = String(s || "")
    .split(",")
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
  return new Uint8Array(nums);
}

export async function onRequest(context) {
  if (context.request.method !== "POST") return badRequest("仅支持 POST");
  const body = await context.request.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");

  if (!phone || !password) return badRequest("请输入手机号和密码");

  const user = await context.env.DB.prepare(
    "SELECT id, phone, pass_salt, pass_hash, role FROM users WHERE phone = ?"
  )
    .bind(phone)
    .first();

  if (!user) return badRequest("手机号或密码错误");

  const saltBytes = parseSalt(user.pass_salt);
  const hash = await pbkdf2Hash(password, saltBytes);
  if (hash !== user.pass_hash) return badRequest("手机号或密码错误");

  const token = await signSession(context.env, {
    uid: user.id,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 天
  });

  const headers = new Headers();
  setCookie(
    headers,
    `ewheel_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${
      60 * 60 * 24 * 7
    }`
  );

  return json(
    { ok: true, user: { id: user.id, phone: user.phone, role: user.role } },
    { headers }
  );
}

