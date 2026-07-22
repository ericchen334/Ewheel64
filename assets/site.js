function readStore(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setYear() {
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

function bindShareholders() {
  const form = document.getElementById("shareholder-form");
  const input = document.getElementById("shareholder-name");
  const list = document.getElementById("shareholder-list");
  const clearButton = document.getElementById("shareholder-clear");
  if (!form || !input || !list || !clearButton) return;

  const key = "ewheel-shareholders";

  function render() {
    const items = readStore(key, []);
    list.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "还没有添加股东名字。";
      list.appendChild(empty);
      return;
    }

    items.forEach((name, index) => {
      const item = document.createElement("div");
      item.className = "tag-item";

      const text = document.createElement("span");
      text.textContent = name;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mini-btn";
      remove.textContent = "删除";
      remove.addEventListener("click", () => {
        const next = readStore(key, []).filter((_, current) => current !== index);
        writeStore(key, next);
        render();
      });

      item.append(text, remove);
      list.appendChild(item);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    const next = [...readStore(key, []), value];
    writeStore(key, next);
    input.value = "";
    render();
  });

  clearButton.addEventListener("click", () => {
    writeStore(key, []);
    render();
  });

  render();
}

function setupEditableModule(pageKey) {
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

  const entryKey = `ewheel-entries-${pageKey}`;
  const uploadKey = `ewheel-uploads-${pageKey}`;

  function renderEntries() {
    const entries = readStore(entryKey, []);
    entryList.innerHTML = "";

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "还没有添加内容，你可以在上方直接录入。";
      entryList.appendChild(empty);
      return;
    }

    entries.forEach((entry, index) => {
      const card = document.createElement("article");
      card.className = "entry-card";

      const heading = document.createElement("h4");
      heading.textContent = entry.title || "未命名条目";

      const body = document.createElement("p");
      body.className = "muted";
      body.textContent = entry.content || "";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mini-btn";
      remove.textContent = "删除这条";
      remove.addEventListener("click", () => {
        const next = readStore(entryKey, []).filter((_, current) => current !== index);
        writeStore(entryKey, next);
        renderEntries();
      });

      card.append(heading, body, remove);
      entryList.appendChild(card);
    });
  }

  function renderUploads() {
    const uploads = readStore(uploadKey, []);
    gallery.innerHTML = "";

    if (!uploads.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "还没有上传图片。";
      gallery.appendChild(empty);
      return;
    }

    uploads.forEach((item, index) => {
      const card = document.createElement("figure");
      card.className = "upload-card";

      const image = document.createElement("img");
      image.src = item.dataUrl;
      image.alt = item.caption || item.name || "上传图片";

      const caption = document.createElement("figcaption");
      caption.textContent = item.caption || item.name || "未命名图片";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mini-btn";
      remove.textContent = "删除图片";
      remove.addEventListener("click", () => {
        const next = readStore(uploadKey, []).filter((_, current) => current !== index);
        writeStore(uploadKey, next);
        renderUploads();
      });

      card.append(image, caption, remove);
      gallery.appendChild(card);
    });
  }

  editorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!title && !content) return;

    const next = [...readStore(entryKey, []), { title, content }];
    writeStore(entryKey, next);
    editorForm.reset();
    renderEntries();
  });

  resetEntries?.addEventListener("click", () => {
    writeStore(entryKey, []);
    renderEntries();
  });

  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;

    try {
      const results = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  name: file.name,
                  caption: captionInput.value.trim(),
                  dataUrl: reader.result,
                });
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            })
        )
      );

      const next = [...readStore(uploadKey, []), ...results];
      writeStore(uploadKey, next);
      uploadForm.reset();
      renderUploads();
    } catch (error) {
      alert("上传失败，可能是图片太大或浏览器本地存储空间不足。");
    }
  });

  resetUploads?.addEventListener("click", () => {
    writeStore(uploadKey, []);
    renderUploads();
  });

  renderEntries();
  renderUploads();
}

setYear();
bindShareholders();

const currentPage = document.body.dataset.page;
if (currentPage === "alloy" || currentPage === "resin") {
  setupEditableModule(currentPage);
}
