async function apiFetch(path, init = {}) {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const msg = data.error || `请求失败：${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function setYear() {
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

async function getMe() {
  try {
    const data = await apiFetch("/api/auth/me", { method: "GET", headers: {} });
    return data.user || null;
  } catch {
    return null;
  }
}

function isAuthor(me) {
  return !!me && me.role === "author";
}

function setFormEnabled(form, enabled) {
  if (!form) return;
  form.querySelectorAll("input,textarea,button").forEach((el) => {
    el.disabled = !enabled;
  });
}

async function bindShareholders(me) {
  const form = document.getElementById("shareholder-form");
  const input = document.getElementById("shareholder-name");
  const list = document.getElementById("shareholder-list");
  const clearButton = document.getElementById("shareholder-clear");
  if (!list) return;

  const author = isAuthor(me);
  if (!author) {
    form?.remove();
  } else {
    setFormEnabled(form, true);
  }

  async function render() {
    list.innerHTML = "";
    try {
      const data = await apiFetch("/api/shareholders", { method: "GET", headers: {} });
      const items = data.shareholders || [];

      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "还没有股东名字。";
        list.appendChild(empty);
        return;
      }

      items.forEach((row) => {
        const item = document.createElement("div");
        item.className = "tag-item";
        const text = document.createElement("span");
        text.textContent = row.name;
        item.appendChild(text);

        if (author) {
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "mini-btn";
          remove.textContent = "删除";
          remove.addEventListener("click", async () => {
            await apiFetch(`/api/shareholders?id=${row.id}`, { method: "DELETE" });
            await render();
          });
          item.appendChild(remove);
        }

        list.appendChild(item);
      });
    } catch (error) {
      const tip = document.createElement("p");
      tip.className = "muted";
      tip.textContent = `股东模块云端未就绪：${error.message}`;
      list.appendChild(tip);
    }
  }

  if (form && input && author) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      await apiFetch("/api/shareholders", {
        method: "POST",
        body: JSON.stringify({ name: value }),
      });
      input.value = "";
      await render();
    });
  }

  clearButton?.addEventListener("click", async () => {
    // 简化：逐个删除（避免做批量接口）
    const data = await apiFetch("/api/shareholders", { method: "GET", headers: {} });
    const items = data.shareholders || [];
    for (const row of items) {
      await apiFetch(`/api/shareholders?id=${row.id}`, { method: "DELETE" });
    }
    await render();
  });

  await render();
}

async function setupEditableModule(pageKey, me) {
  const editorForm = document.getElementById("entry-form");
  const titleInput = document.getElementById("entry-title");
  const contentInput = document.getElementById("entry-content");
  const entryList = document.getElementById("entry-list");
  const uploadForm = document.getElementById("upload-form");
  const fileInput = document.getElementById("upload-files");
  const captionInput = document.getElementById("upload-caption");
  const gallery = document.getElementById("upload-gallery");
  const resetEntries = document.getElementById("entry-clear");
  const resetUploads = document.getElementById("upload-clear");

  if (!editorForm || !uploadForm || !entryList || !gallery) return;

  const author = isAuthor(me);
  // 作者才允许编辑/上传；游客只看
  setFormEnabled(editorForm, author);
  setFormEnabled(uploadForm, author);
  document.querySelectorAll("[data-author-only-tip]").forEach((node) => {
    node.style.display = author ? "none" : "block";
  });

  function renderEntries() {
    entryList.innerHTML = "";
  }

  function renderUploads() {
    gallery.innerHTML = "";
  }

  async function loadEntries() {
    entryList.innerHTML = "";
    try {
      const data = await apiFetch(`/api/entries?page=${pageKey}`, { method: "GET", headers: {} });
      const entries = data.entries || [];
      if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "还没有内容。";
        entryList.appendChild(empty);
        return;
      }

      entries.forEach((entry) => {
        const card = document.createElement("article");
        card.className = "entry-card";

        const heading = document.createElement("h4");
        heading.textContent = entry.title || "未命名条目";

        const body = document.createElement("p");
        body.className = "muted";
        body.textContent = entry.content || "";

        card.append(heading, body);

        if (author) {
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "mini-btn";
          remove.textContent = "删除这条";
          remove.addEventListener("click", async () => {
            await apiFetch(`/api/entries?id=${entry.id}&page=${pageKey}`, { method: "DELETE" });
            await loadEntries();
          });
          card.append(remove);
        }

        entryList.appendChild(card);
      });
    } catch (error) {
      const tip = document.createElement("p");
      tip.className = "muted";
      tip.textContent = `内容云端未就绪：${error.message}`;
      entryList.appendChild(tip);
    }
  }

  async function loadUploads() {
    gallery.innerHTML = "";
    try {
      const data = await apiFetch(`/api/uploads?page=${pageKey}`, { method: "GET", headers: {} });
      const uploads = data.uploads || [];
      if (!uploads.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "还没有图片。";
        gallery.appendChild(empty);
        return;
      }

      uploads.forEach((item) => {
        const card = document.createElement("figure");
        card.className = "upload-card";

        const image = document.createElement("img");
        image.src = item.data_url;
        image.alt = item.caption || item.name || "上传图片";

        const caption = document.createElement("figcaption");
        caption.textContent = item.caption || item.name || "未命名图片";

        card.append(image, caption);

        if (author) {
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "mini-btn";
          remove.textContent = "删除图片";
          remove.addEventListener("click", async () => {
            await apiFetch(`/api/uploads?id=${item.id}&page=${pageKey}`, { method: "DELETE" });
            await loadUploads();
          });
          card.append(remove);
        }

        gallery.appendChild(card);
      });
    } catch (error) {
      const tip = document.createElement("p");
      tip.className = "muted";
      tip.textContent = `图片云端未就绪：${error.message}`;
      gallery.appendChild(tip);
    }
  }

  if (author) {
    editorForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      if (!title && !content) return;
      await apiFetch(`/api/entries?page=${pageKey}`, {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
      editorForm.reset();
      await loadEntries();
    });

    resetEntries?.addEventListener("click", async () => {
      // 简化：不做批量清空，避免误操作（需要的话再加）
      alert("为避免误操作，暂不提供一键清空；你可以逐条删除。");
    });

    uploadForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;

      const caption = captionInput.value.trim();

      for (const file of files) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        await apiFetch(`/api/uploads?page=${pageKey}`, {
          method: "POST",
          body: JSON.stringify({ caption, name: file.name, dataUrl }),
        });
      }

      uploadForm.reset();
      await loadUploads();
    });

    resetUploads?.addEventListener("click", async () => {
      alert("为避免误操作，暂不提供一键清空；你可以逐张删除。");
    });
  }

  renderEntries();
  renderUploads();
  await loadEntries();
  await loadUploads();
}

function initHeroSlideshow() {
  const wrapper = document.getElementById("hero-slideshow");
  if (!wrapper) return;

  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const images = [
    "/assets/cover-1.jpg",
    "/assets/cover-2.jpg",
    "/assets/cover-3.jpg",
    "/assets/cover-4.jpg",
  ];

  const slides = images.map((src, index) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `封面图片 ${index + 1}`;
    img.loading = index === 0 ? "eager" : "lazy";
    img.decoding = "async";
    img.className = "hero-slide";
    wrapper.appendChild(img);
    return img;
  });

  let current = 0;
  slides[current]?.classList.add("is-active");

  if (prefersReduced || slides.length <= 1) return;

  const intervalMs = 3800;
  let timer = window.setInterval(next, intervalMs);

  function next() {
    slides[current]?.classList.remove("is-active");
    current = (current + 1) % slides.length;
    slides[current]?.classList.add("is-active");
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.clearInterval(timer);
    } else {
      timer = window.setInterval(next, intervalMs);
    }
  });
}

setYear();

(async () => {
  const currentPage = document.body.dataset.page;
  const me = await getMe();

  if (currentPage === "home") {
    initHeroSlideshow();
    await bindShareholders(me);
  }

  if (currentPage === "alloy" || currentPage === "resin") {
    await setupEditableModule(currentPage, me);
  }

  if (currentPage === "profile") {
    await initProfilePage(me);
  }
})();

async function initProfilePage(meInit) {
  const loginForm = document.getElementById("login-form");
  const loginPhone = document.getElementById("login-phone");
  const loginPassword = document.getElementById("login-password");
  const loginTip = document.getElementById("login-tip");
  const logoutBtn = document.getElementById("logout-btn");

  const registerForm = document.getElementById("register-form");
  const registerPhone = document.getElementById("register-phone");
  const registerPassword = document.getElementById("register-password");
  const registerTip = document.getElementById("register-tip");

  const meBox = document.getElementById("me-box");
  const upgradeCard = document.getElementById("upgrade-card");
  const upgradeForm = document.getElementById("upgrade-form");
  const adminCodeInput = document.getElementById("admin-code");
  const upgradeTip = document.getElementById("upgrade-tip");

  let me = meInit;

  function renderMe() {
    if (!meBox) return;
    meBox.innerHTML = "";
    const card = document.createElement("div");
    card.className = "entry-card";
    card.innerHTML = me
      ? `<h4>已登录</h4><p class="muted">手机号：${me.phone}<br/>权限：${me.role}</p>`
      : `<h4>未登录</h4><p class="muted">请先登录或注册。</p>`;
    meBox.appendChild(card);
    if (upgradeCard) upgradeCard.style.display = me ? "block" : "none";
  }

  renderMe();

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginTip.textContent = "";
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          phone: loginPhone.value.trim(),
          password: loginPassword.value,
        }),
      });
      me = data.user;
      renderMe();
      loginTip.textContent = "登录成功。";
    } catch (error) {
      loginTip.textContent = error.message;
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    loginTip.textContent = "";
    try {
      await apiFetch("/api/auth/logout", { method: "POST", body: "{}" });
      me = null;
      renderMe();
      loginTip.textContent = "已退出。";
    } catch (error) {
      loginTip.textContent = error.message;
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    registerTip.textContent = "";
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          phone: registerPhone.value.trim(),
          password: registerPassword.value,
        }),
      });
      registerTip.textContent = "注册成功，请在左侧登录。";
    } catch (error) {
      registerTip.textContent = error.message;
    }
  });

  upgradeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    upgradeTip.textContent = "";
    try {
      const data = await apiFetch("/api/auth/upgrade", {
        method: "POST",
        body: JSON.stringify({ adminCode: adminCodeInput.value.trim() }),
      });
      me = data.user;
      renderMe();
      upgradeTip.textContent = "已开启作者模式。现在你可以去合金/树脂页面编辑与上传。";
    } catch (error) {
      upgradeTip.textContent = error.message;
    }
  });
}
