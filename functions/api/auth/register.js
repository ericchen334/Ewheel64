import { badRequest, json, pbkdf2Hash, randomSalt } from "../../_lib/auth.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return badRequest("仅支持 POST");
  const body = await context.request.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");

  if (!phone || phone.length < 6) return badRequest("请输入手机号（至少 6 位）");
  if (!password || password.length < 6) return badRequest("密码至少 6 位");

  const salt = randomSalt();
  const hash = await pbkdf2Hash(password, salt);

  try {
    await context.env.DB.prepare(
      "INSERT INTO users(phone, pass_salt, pass_hash, role) VALUES(?, ?, ?, 'viewer')"
    )
      .bind(phone, Array.from(salt).join(","), hash)
      .run();
  } catch (error) {
    return badRequest("注册失败：该手机号可能已存在");
  }

  return json({ ok: true });
}

