import { json, setCookie } from "../../_lib/auth.js";

export async function onRequest(context) {
  const headers = new Headers();
  setCookie(headers, "ewheel_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return json({ ok: true }, { headers });
}

