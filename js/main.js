// Google Apps Script Web App URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbwbiD6-BltYOTZ6NDqc1q3YWVxt_kYMfBiibpk4VrRa3djWzAigzT4XZJBEnWV5go-38g/exec";

const form = document.getElementById("lookupForm");
const emailInput = document.getElementById("email");
const resendBtn = document.getElementById("resendBtn");
const resultDiv = document.getElementById("result");
const getPendingListBtn = document.getElementById("getPendingListBtn");
const pendingListDiv = document.getElementById("pendingList");

let currentEmail = "";

// 監聽 email 輸入框，只有輸入 TMOCTMOC 時才顯示管理按鈕
emailInput.addEventListener("input", () => {
  const value = emailInput.value.trim();
  const adminSection = document.querySelector(".admin-section");

  if (value === "TMOCTMOC") {
    adminSection.style.display = "block";
  } else {
    adminSection.style.display = "none";
    // 如果隱藏管理區，也隱藏待邀請清單
    pendingListDiv.classList.add("hidden");
  }
});

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
    <div class="serial-number-container">
      <div class="serial-number-label">您的報名序號為：</div>
      <div class="serial-number">${data.serialNumber}</div>
    </div>
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
        <span class="info-label">車主姓名：</span>
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

// 取得待邀請清單
getPendingListBtn.addEventListener("click", async () => {
  try {
    getPendingListBtn.disabled = true;
    getPendingListBtn.textContent = "載入中...";

    // 隱藏之前的結果
    resultDiv.classList.add("hidden");
    pendingListDiv.innerHTML =
      '<p style="text-align: center; color: #666;">📋 載入中，請稍候...</p>';
    pendingListDiv.classList.remove("hidden");

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getPendingList",
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
      showPendingList(data.data);
    } else {
      pendingListDiv.innerHTML = `<p style="text-align: center; color: #c62828;">❌ ${data.message}</p>`;
    }
  } catch (error) {
    console.error("取得清單錯誤:", error);
    pendingListDiv.innerHTML = `<p style="text-align: center; color: #c62828;">❌ 載入失敗：${error.message}</p>`;
  } finally {
    getPendingListBtn.disabled = false;
    getPendingListBtn.textContent = "📋 查看待邀請清單";
  }
});

// 顯示待邀請清單
function showPendingList(list) {
  if (!list || list.length === 0) {
    pendingListDiv.innerHTML = `
      <h3>📋 待邀請清單</h3>
      <p style="text-align: center; color: #666; padding: 20px;">目前沒有待邀請的報名資料</p>
    `;
    return;
  }

  let html = `
    <h3>📋 待邀請清單 <span class="pending-count">${list.length}</span></h3>
    <button id="sendInvitationBtn" class="btn btn-send-invitation" style="margin: 15px 0; width: 100%;">
      📧 寄出邀請信給所有人 (${list.length} 人)
    </button>
    <div style="margin-top: 15px;">
  `;

  list.forEach((item, index) => {
    const timestamp = item.timestamp
      ? new Date(item.timestamp).toLocaleString("zh-TW", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "無資料";

    html += `
      <div class="pending-item">
        <div class="pending-serial">${item.serialNumber || "無序號"}</div>
        <div class="pending-info">
          <div><strong>姓名：</strong>${item.name || "無資料"}</div>
          <div><strong>Email：</strong>${item.email || "無資料"}</div>
          ${item.phone ? `<div><strong>電話：</strong>${item.phone}</div>` : ""}
          <div><strong>報名時間：</strong>${timestamp}</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  pendingListDiv.innerHTML = html;
  
  // 綁定寄出邀請信按鈕事件
  const sendInvitationBtn = document.getElementById("sendInvitationBtn");
  if (sendInvitationBtn) {
    sendInvitationBtn.addEventListener("click", () => sendInvitationEmails(list));
  }
}

// 寄出邀請信
async function sendInvitationEmails(list) {
  const sendInvitationBtn = document.getElementById("sendInvitationBtn");
  
  // 確認對話框
  if (!confirm(`確定要寄出邀請信給 ${list.length} 位報名者嗎？`)) {
    return;
  }
  
  try {
    sendInvitationBtn.disabled = true;
    sendInvitationBtn.textContent = "📧 發送中，請稍候...";
    
    // 收集所有 email
    const emails = list.map(item => item.email).filter(email => email);
    
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "sendInvitations",
        emails: emails
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
      alert(`✅ 成功！已寄出 ${data.sentCount || emails.length} 封邀請信，並更新狀態為「已完成」`);
      // 重新載入清單
      getPendingListBtn.click();
    } else {
      alert(`❌ 發送失敗：${data.message}`);
      sendInvitationBtn.disabled = false;
      sendInvitationBtn.textContent = `📧 寄出邀請信給所有人 (${list.length} 人)`;
    }
  } catch (error) {
    console.error("發送邀請信錯誤:", error);
    alert(`❌ 發送時發生錯誤：${error.message}`);
    sendInvitationBtn.disabled = false;
    sendInvitationBtn.textContent = `📧 寄出邀請信給所有人 (${list.length} 人)`;
  }
}
