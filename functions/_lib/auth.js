// Cloudflare Pages Functions 通用认证工具（简化版）

function toBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(bytes) {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str) {
  const padLen = (4 - (str.length % 4)) % 4;
  const padded = (str + "=".repeat(padLen)).replace(/-/g, "+").replace(/_/g, "/");
  return fromBase64(padded);
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

export function badRequest(message) {
  return json({ ok: false, error: message }, { status: 400 });
}

export function unauthorized(message = "未登录或无权限") {
  return json({ ok: false, error: message }, { status: 401 });
}

export function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const parts = cookie.split(";").map((c) => c.trim());
  const found = parts.find((p) => p.startsWith(`${name}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(name.length + 1));
}

export function setCookie(headers, cookieValue) {
  headers.append("set-cookie", cookieValue);
}

export async function sha256Hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

export async function signSession(env, payload) {
  const secret = env.AUTH_SECRET;
  if (!secret) throw new Error("缺少 AUTH_SECRET 环境变量");
  const jsonPayload = JSON.stringify(payload);
  const body = base64UrlEncode(new TextEncoder().encode(jsonPayload));
  const sig = await sha256Hmac(secret, body);
  return `${body}.${sig}`;
}

export async function verifySession(env, token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = await sha256Hmac(env.AUTH_SECRET, body);
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function pbkdf2Hash(password, saltBytes) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 120000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return base64UrlEncode(new Uint8Array(bits));
}

export function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytes;
}

