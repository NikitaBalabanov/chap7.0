import { getVerifyEmailUrl, getIsEmailVerifiedUrl } from './api.js';

let EVM_INTERVAL = null;
let EVM_POLLING_INTERVAL = null;

export async function apiIsEmailVerified(userId) {
  try {
    const res = await fetch(getIsEmailVerifiedUrl(userId), { method: "GET" });
    const data = await res.json();
    if (!res.ok || !data?.success)
      throw new Error(data?.message || "Check failed");
    return !!data.emailVerified;
  } catch (e) {
    console.error("is-email-verified error:", e);
    return false;
  }
}

export async function apiSendVerifyEmail(userId) {
  try {
    const res = await fetch(getVerifyEmailUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success)
      throw new Error(data?.message || "Send failed");
    return true;
  } catch (e) {
    console.error("verify-email error:", e);
    return false;
  }
}

export function ensureEmailVerifyModalExists() {
  let modal = document.getElementById("email_verify_modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "email_verify_modal";
  modal.innerHTML = `
    <div class="evm-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;z-index:9998;"></div>
    <div class="evm-dialog" style="position:fixed;inset:0;display:none;z-index:9999;align-items:center;justify-content:center;">
      <div class="evm-card" style="max-width:600px;width:92%;background:#fff;border-radius:16px;padding:24px 24px 18px;box-shadow:0 16px 40px rgba(0,0,0,.2);">
        <h2 style="margin:0 0 14px 0;font-size:30px;line-height:1.2;color:#13223b;">E-Mail bestätigen</h2>
        <p id="evm_text" style="margin:0 0 12px 0;line-height:1.55;color:#1f2937;font-size:16px;">
          Bitte klicken Sie auf <strong>„Bestätigungslink senden"</strong>, öffnen Sie den Link in Ihrer E-Mail
          und kehren Sie anschließend in diese Browser-Registerkarte zurück.
        </p>

        <div id="evm_error" style="display:none;margin:10px 0 6px;color:#b91c1c;font-size:14px;"></div>
        <div id="evm_success" style="display:none;margin:10px 0 6px;color:#166534;font-size:14px;"></div>

        <div id="evm_actions_initial" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button id="evm_send" style="padding:10px 14px;border-radius:10px;border:1px solid #111827;background:#111827;color:#fff;cursor:pointer;">
            Bestätigungslink senden
          </button>
          <button id="evm_cancel" style="padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;background:#fff;color:#111827;cursor:pointer;">
            Abbrechen
          </button>
        </div>

        <div id="evm_actions_after_send" style="display:none;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button id="evm_resend" style="padding:10px 14px;border-radius:10px;border:1px solid #111827;background:#111827;color:#fff;cursor:pointer;">
            Nochmals senden
          </button>
          <button id="evm_close" style="margin-left:auto;padding:10px 14px;border-radius:10px;border:1px solid #d1d5db;background:#fff;color:#111827;cursor:pointer;">
            Schließen
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

export function showEmailVerifyModal() {
  const m = ensureEmailVerifyModalExists();
  m.querySelector(".evm-backdrop").style.display = "block";
  m.querySelector(".evm-dialog").style.display = "flex";
}

export function hideEmailVerifyModal() {
  const m = document.getElementById("email_verify_modal");
  if (!m) return;
  m.querySelector(".evm-backdrop").style.display = "none";
  m.querySelector(".evm-dialog").style.display = "none";

  m.querySelector("#evm_error").style.display = "none";
  m.querySelector("#evm_error").textContent = "";
  m.querySelector("#evm_success").style.display = "none";
  m.querySelector("#evm_success").textContent = "";
  m.querySelector("#evm_actions_initial").style.display = "flex";
  m.querySelector("#evm_actions_after_send").style.display = "none";

  if (EVM_INTERVAL) {
    clearInterval(EVM_INTERVAL);
    EVM_INTERVAL = null;
  }
  
  if (EVM_POLLING_INTERVAL) {
    clearInterval(EVM_POLLING_INTERVAL);
    EVM_POLLING_INTERVAL = null;
  }
}

function startResendCountdown(btn, seconds = 60) {
  const baseLabel = "Nochmals senden";
  const setLabel = (s) => (btn.textContent = `${baseLabel} (${s})`);

  btn.disabled = true;
  setLabel(seconds);

  if (EVM_INTERVAL) clearInterval(EVM_INTERVAL);
  EVM_INTERVAL = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(EVM_INTERVAL);
      EVM_INTERVAL = null;
      btn.disabled = false;
      btn.textContent = baseLabel;
      return;
    }
    setLabel(seconds);
  }, 1000);
}

function startEmailVerificationPolling(userId, onVerified) {
  if (EVM_POLLING_INTERVAL) {
    clearInterval(EVM_POLLING_INTERVAL);
  }
  
  EVM_POLLING_INTERVAL = setInterval(async () => {
    try {
      const verified = await apiIsEmailVerified(userId);
      if (verified) {
        if (EVM_POLLING_INTERVAL) {
          clearInterval(EVM_POLLING_INTERVAL);
          EVM_POLLING_INTERVAL = null;
        }
        hideEmailVerifyModal();
        if (typeof onVerified === "function") {
          onVerified();
        }
      }
    } catch (error) {
      console.error("Email verification polling error:", error);
    }
  }, 3000);
}

export function wireEmailVerifyModal({ userId, onVerified, onCancel }) {
  const m = ensureEmailVerifyModalExists();

  ["evm_send", "evm_cancel", "evm_resend", "evm_close"].forEach(
    (id) => {
      const el = m.querySelector(`#${id}`);
      if (el) {
        const clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
      }
    }
  );

  const btnSend = m.querySelector("#evm_send");
  const btnCancel = m.querySelector("#evm_cancel");
  const btnResend = m.querySelector("#evm_resend");
  const btnClose = m.querySelector("#evm_close");

  const errBox = m.querySelector("#evm_error");
  const okBox = m.querySelector("#evm_success");
  const aInit = m.querySelector("#evm_actions_initial");
  const aAfter = m.querySelector("#evm_actions_after_send");

  const showErr = (t) => {
    errBox.textContent = t || "";
    errBox.style.display = t ? "block" : "none";
    if (t) {
      okBox.style.display = "none";
      okBox.textContent = "";
    }
  };
  const showOk = (t) => {
    okBox.textContent = t || "";
    okBox.style.display = t ? "block" : "none";
    if (t) {
      errBox.style.display = "none";
      errBox.textContent = "";
    }
  };

  btnSend.addEventListener("click", async () => {
    btnSend.disabled = true;
    showErr("");
    showOk("");

    const ok = await apiSendVerifyEmail(userId);
    btnSend.disabled = false;

    if (!ok) {
      showErr("Fehler beim Senden des Bestätigungslinks.");
      return;
    }

    aInit.style.display = "none";
    aAfter.style.display = "flex";
    showOk(
      "Link gesendet. Öffnen Sie die E-Mail und klicken Sie auf den Link."
    );
    startResendCountdown(btnResend, 60);
    startEmailVerificationPolling(userId, onVerified);
  });

  btnResend.addEventListener("click", async () => {
    if (btnResend.disabled) return;

    btnResend.disabled = true;
    showErr("");
    showOk("");

    const ok = await apiSendVerifyEmail(userId);
    if (!ok) {
      btnResend.disabled = false;
      showErr("Fehler beim Senden des Bestätigungslinks.");
      return;
    }

    showOk("Link erneut gesendet.");
    startResendCountdown(btnResend, 60);
    startEmailVerificationPolling(userId, onVerified);
  });

  const handleCancel = () => {
    hideEmailVerifyModal();
    if (typeof onCancel === "function") {
      onCancel();
    }
  };

  btnCancel.addEventListener("click", handleCancel);
  btnClose.addEventListener("click", handleCancel);

  const backdrop = m.querySelector(".evm-backdrop");
  if (backdrop) {
    const oldHandler = backdrop._cancelHandler;
    if (oldHandler) {
      backdrop.removeEventListener("click", oldHandler);
    }
    backdrop._cancelHandler = (e) => {
      if (e.target === backdrop) {
        handleCancel();
      }
    };
    backdrop.addEventListener("click", backdrop._cancelHandler);
  }
}
