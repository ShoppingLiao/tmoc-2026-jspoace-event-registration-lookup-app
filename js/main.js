// Google Apps Script Web App URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbwbiD6-BltYOTZ6NDqc1q3YWVxt_kYMfBiibpk4VrRa3djWzAigzT4XZJBEnWV5go-38g/exec";

const form = document.getElementById("lookupForm");
const emailInput = document.getElementById("email");
const resendBtn = document.getElementById("resendBtn");
const resultDiv = document.getElementById("result");

let currentEmail = "";

// 查詢序號
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();

  if (!email) {
    showResult("error", "請輸入 Email");
    return;
  }

  try {
    showResult("info", "🔍 查詢中，請稍候...");

    // 使用 URL 參數方式發送 POST 請求，避免 CORS preflight
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "lookup",
        email: email,
      }),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log("Response text:", text);

    const data = JSON.parse(text);
    console.log("Parsed data:", data);

    if (data.status === "success") {
      currentEmail = email;
      resendBtn.disabled = false;
      showRegistrationInfo(data.data);
    } else {
      currentEmail = "";
      resendBtn.disabled = true;
      showResult("error", "❌ " + data.message);
    }
  } catch (error) {
    console.error("查詢錯誤:", error);
    currentEmail = "";
    resendBtn.disabled = true;

    let errorMessage = "查詢時發生錯誤";
    if (error.message.includes("CORS")) {
      errorMessage =
        "CORS 錯誤：請確認 Google Apps Script 已正確設定並重新部署";
    } else if (error.message.includes("405")) {
      errorMessage =
        "405 錯誤：請確認 Google Apps Script 的 doPost 函數已正確設定";
    } else if (
      error.message.includes("NetworkError") ||
      error.message.includes("Failed to fetch")
    ) {
      errorMessage = "網路錯誤：請檢查網路連線或 API URL 是否正確";
    }

    showResult(
      "error",
      "❌ " +
        errorMessage +
        "<br><small>詳細錯誤：" +
        error.message +
        "</small>"
    );
  }
});

// 重新發送確認信
resendBtn.addEventListener("click", async () => {
  if (!currentEmail) return;

  try {
    resendBtn.disabled = true;
    resendBtn.textContent = "發送中...";

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "resend",
        email: currentEmail,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const data = JSON.parse(text);

    if (data.status === "success") {
      showResult("success", "✅ " + data.message + "，請至信箱查收！");
    } else {
      showResult("error", "❌ " + data.message);
    }
  } catch (error) {
    console.error("發送錯誤:", error);
    showResult("error", "❌ 發送時發生錯誤：" + error.message);
  } finally {
    resendBtn.disabled = false;
    resendBtn.textContent = "重新發送確認信";
  }
});

// 顯示結果
function showResult(type, message) {
  resultDiv.className = `result ${type}`;
  resultDiv.innerHTML = message;
  resultDiv.classList.remove("hidden");
}

// 顯示報名資訊
function showRegistrationInfo(data) {
  const timestamp = data.timestamp
    ? new Date(data.timestamp).toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "無資料";

  const html = `
    <h3>✅ 查詢成功</h3>
    <div class="serial-number">${data.serialNumber}</div>
    <div class="info-table">
      <div class="info-row">
        <span class="info-label">姓名：</span>
        <span class="info-value">${data.name || "無資料"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email：</span>
        <span class="info-value">${data.email}</span>
      </div>
      ${
        data.phone
          ? `
      <div class="info-row">
        <span class="info-label">電話：</span>
        <span class="info-value">${data.phone}</span>
      </div>
      `
          : ""
      }
      <div class="info-row">
        <span class="info-label">報名時間：</span>
        <span class="info-value">${timestamp}</span>
      </div>
    </div>
    <p style="margin-top: 15px; font-size: 13px; color: #666; text-align: center;">
      💡 請妥善保存您的報名序號
    </p>
  `;

  resultDiv.className = "result success";
  resultDiv.innerHTML = html;
  resultDiv.classList.remove("hidden");
}
