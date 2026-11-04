(function () {

  // 仅本机执行真实转换
  // GitHub Pages继续保留模拟演示
  const LOCAL = ["localhost", "127.0.0.1"]
    .includes(location.hostname);

  if (!LOCAL) return;

  function updateWordUI() {
    if (location.hash !== "#/word") return;

    const button = document.querySelector(
      '[data-run-tool="word"]'
    );

    if (!button) return;

    button.textContent = "开始转换Word";

    const upload = document.querySelector(
      '[data-fake-upload]'
    );

    if (upload) upload.accept = ".docx";

    const tag = document.querySelector(".prototype-tag");

    if (tag) {
      tag.textContent = "本地功能测试 V0.1";
    }

    const description = document.querySelector(
      ".work-panel > p"
    );

    if (description) {
      description.textContent =
        "选择飞书导出的DOCX，系统按照公司格式配置进行转换。";
    }
  }

  window.addEventListener("hashchange", updateWordUI);
  updateWordUI();

  document.addEventListener("change", (event) => {
    if (
      location.hash !== "#/word" ||
      !event.target.matches("[data-fake-upload]")
    ) return;

    const file = event.target.files[0];
    if (!file) return;

    const zone = event.target.closest(".upload-zone");

    if (zone) {
      zone.querySelector("strong").textContent = file.name;
      zone.querySelector("span:last-child").textContent =
        "文件仅在点击转换后发送到Mac本地后台";
    }
  });

  document.addEventListener("click", async (event) => {

    const button = event.target.closest(
      '[data-run-tool="word"]'
    );

    if (!button) return;

    // 阻止原本的模拟执行逻辑
    event.preventDefault();
    event.stopImmediatePropagation();

    const file = document.querySelector(
      "[data-fake-upload]"
    )?.files[0];

    const area = document.querySelector("#resultArea");

    if (!file) {
      area.textContent = "请先选择Word文件";
      return;
    }

    button.disabled = true;
    button.textContent = "正在转换……";

    area.textContent = "正在处理文档，请保持页面打开。";

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/word/convert", {
        method: "POST",
        body: form
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || "转换失败");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const count = Number(
        response.headers.get("X-Review-Count") || 0
      );

      const headingCount = Number(
        response.headers.get("X-Heading-Count") || 0
      );

      area.replaceChildren();
      area.className = "result-data research-result";

      const title = document.createElement("h3");
      title.textContent = "Word转换完成";

      const message = document.createElement("p");
      message.textContent =
        `识别标题标记 ${headingCount} 个，嵌入对象 ${count} 个。`;

      const link = document.createElement("a");
      link.href = url;
      link.download =
        file.name.replace(/\.docx$/i, "") +
        "_格式转换版.docx";

      link.textContent = "下载转换后的Word";

      link.style.cssText = [
        "display:inline-block",
        "background:#3157d5",
        "color:white",
        "padding:12px 18px",
        "border-radius:8px",
        "text-decoration:none",
        "margin-top:12px"
      ].join(";");

      area.append(title, message, link);

      if (count > 0) {
        const warning = document.createElement("p");
        warning.textContent =
          `发现 ${count} 个嵌入对象，` +
          "请人工复核Excel预览和显示范围。";

        area.append(warning);
      }

    } catch (error) {
      area.textContent = "转换失败：" + error.message;

    } finally {
      button.disabled = false;
      button.textContent = "开始转换Word";
    }

  }, true);

})();
