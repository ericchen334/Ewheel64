-- Cloudflare D1 数据库初始化脚本
-- 在 Cloudflare Dashboard -> D1 -> 创建数据库后，把这份 SQL 复制进去执行即可。

-- 用户表：用“手机号 + 密码”登录（不走短信验证码）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  pass_salt TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer', -- viewer | author
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 内容条目（合金/树脂的文字记录）
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL, -- alloy | resin
  title TEXT,
  content TEXT,
  author_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(author_id) REFERENCES users(id)
);

-- 图片上传（先用 data_url 存储：适合小图；大图建议以后换 R2）
CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL, -- alloy | resin
  caption TEXT,
  name TEXT,
  data_url TEXT NOT NULL,
  author_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(author_id) REFERENCES users(id)
);

-- 股东名单（主页模块）
CREATE TABLE IF NOT EXISTS shareholders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  author_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(author_id) REFERENCES users(id)
);

