import { dictionary, PUBLISHABLE_KEY, API_URL, API } from './config.js';
import { getFromStorage, setToStorage, clearLocalStorageAfterPayment } from './storage.js';
import { getSiblingButtonBySelector, setSubmitButtonLoading, setPaymentModalSizing, getUserIdSafe } from './utils.js';
import { showFullscreenLoader, hideFullscreenLoader } from './loader.js';
import { apiIsEmailVerified, wireEmailVerifyModal, showEmailVerifyModal } from './emailVerification.js';

let stripe = null;

async function initializeStripe() {
  if (typeof Stripe === "undefined") {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    document.head.appendChild(script);
    await new Promise((resolve) => (script.onload = resolve));
  }
  stripe = Stripe(PUBLISHABLE_KEY, { locale: "de" });
  return stripe;
}

export async function handlePurchaseAndInvoice(paymentIntentId, amount, userId) {
  try {
    const response = await fetch(`${API_URL}/handlePurchaseAndInvoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId, amount, userId }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to generate invoice");
    if (data.success && data.pdfUrl) {
      setToStorage("invoiceUrl", data.pdfUrl);
      return data;
    } else {
      throw new Error("Invalid response from invoice service");
    }
  } catch (error) {
    console.error("Error generating invoice:", error);
    return null;
  }
}

export async function sendWelcomeEmail(userId, programSlugs) {
  try {
    const response = await fetch(`${API_URL}/sendWebWelcomeEmail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, programSlugs }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to send welcome email");
    return data;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return null;
  }
}

export async function completeOnboarding(userId, isTrial = false) {
  try {
    const response = await fetch(`${API}/complete-onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isTrial }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to complete onboarding");
    return data;
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return null;
  }
}

export async function doPayment(amount, showLoader = false) {
  try {
    setSubmitButtonLoading(true);
    showFullscreenLoader();
    const errorDiv = document.querySelector("#error_message_payment");

    if (!stripe) await initializeStripe();

    const userData = getFromStorage("userData", {});
    const body = {
      amount: amount * 100,
      userId: getFromStorage("createUserResponse", {}).userId,
      courseSlugs: getFromStorage("selectedCourses", []),
    };

    setToStorage("paymentIntentPayload", body);
    const response = await fetch(
      "https://europe-west3-preneo-production.cloudfunctions.net/createPaymentIntent",
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to create payment intent");

    setToStorage("paymentIntentResponse", data);
    const clientSecret = data.paymentIntent;
    if (!clientSecret)
      throw new Error("No client secret received from payment intent");

    const elements = stripe.elements({
      clientSecret,
      locale: "de",
      appearance: { theme: "stripe", variables: { colorPrimary: "#5469d4" } },
      loader: "auto",
    });

    const mountEl = document.getElementById("payment_element");
    if (mountEl) mountEl.innerHTML = "";

    const paymentElement = elements.create("payment");

    const popupWrap = document.querySelector("#payment_popup_wrapper");
    popupWrap.classList.add("active");
    popupWrap.style.display = "flex";

    const submitButton = getSiblingButtonBySelector(
      "#submit_payment",
      "button"
    );
    const submitButtonText = getSiblingButtonBySelector(
      "#submit_payment",
      ".btn_main_text"
    );

    const paymentGatewayContainer = document.querySelector(
      ".payment_gateway_contain"
    );
    setPaymentModalSizing(popupWrap, paymentGatewayContainer);

    paymentElement.mount("#payment_element");
    
    setTimeout(() => {
      hideFullscreenLoader();
    }, 300);

    const updatePaymentMethodStyles = () => {
      const paymentEl = document.getElementById("payment_element");
      if (!paymentEl) return;
      
      const stripeForm = paymentEl.querySelector("form");
      if (stripeForm) {
        stripeForm.style.maxHeight = "100%";
        stripeForm.style.overflowY = "auto";
        stripeForm.style.overflowX = "visible";
        stripeForm.style.padding = "0";
        stripeForm.style.margin = "0";
      }
      
      const paypalElements = paymentEl.querySelectorAll('div[role="button"], iframe[title*="PayPal"], [class*="paypal"], [class*="PayPal"]');
      paypalElements.forEach(el => {
        el.style.width = "100%";
        el.style.display = "block";
        el.style.visibility = "visible";
        el.style.opacity = "1";
        if (el.tagName === "IFRAME") {
          el.style.minHeight = "200px";
          el.style.border = "none";
        }
      });
      
      const iframes = paymentEl.querySelectorAll("iframe");
      iframes.forEach(iframe => {
        iframe.style.width = "100%";
        iframe.style.minHeight = "200px";
        iframe.style.border = "none";
        iframe.style.display = "block";
        iframe.style.visibility = "visible";
      });
    };

    setTimeout(() => {
      setPaymentModalSizing(popupWrap, paymentGatewayContainer);
      updatePaymentMethodStyles();
    }, 500);

    setTimeout(() => {
      updatePaymentMethodStyles();
    }, 1000);

    let paymentObserver = null;
    if (paymentGatewayContainer) {
      paymentObserver = new MutationObserver(() => {
        setPaymentModalSizing(popupWrap, paymentGatewayContainer);
        updatePaymentMethodStyles();
      });

      paymentObserver.observe(paymentGatewayContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
    let closePaymentLink = document.getElementById("close_payment_window");
    if (!closePaymentLink && paymentGatewayContainer) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `
        <div style="text-align: center; margin-top: 20px;">
          <a href="#" id="close_payment_window" style="text-decoration: underline; color: #666; font-size: 14px; cursor: pointer;">
            ${dictionary["button.closePayment"]}
          </a>
        </div>`;
      paymentGatewayContainer.appendChild(wrapper);
      closePaymentLink = wrapper.querySelector("#close_payment_window");
    }
    if (closePaymentLink) {
      closePaymentLink.onclick = (e) => {
        e.preventDefault();
        if (paymentObserver) {
          paymentObserver.disconnect();
        }
        popupWrap.classList.remove("active");
        popupWrap.style.display = "none";
        setSubmitButtonLoading(false);
      };
    }

    let isPaymentProcessing = false;
    
    submitButton.addEventListener(
      "click",
      async (event) => {
        if (isPaymentProcessing) return;
        
        if (submitButtonText)
          submitButtonText.textContent = dictionary["payment.processing"];
        event.preventDefault();
        submitButton.disabled = true;
        isPaymentProcessing = true;

        try {
          const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            redirect: "if_required",
            confirmParams: {
              return_url: window.location.href.replace(
                "onboarding",
                "vielen-dank"
              ),
              payment_method_data: {
                billing_details: {
                  name: `${userData.firstName} ${userData.lastName}`,
                  email: userData.email,
                  address: { country: "DE" },
                },
              },
            },
          });

          if (error) {
            console.error("Payment failed:", error);
            errorDiv.style.display = "block";
            errorDiv.textContent = error.message;
            isPaymentProcessing = false;
            if (submitButtonText)
              submitButtonText.textContent = dictionary["payment.payNow"];
            submitButton.disabled = false;
            return;
          } else if (
            paymentIntent &&
            (paymentIntent.status === "succeeded" ||
              paymentIntent.status === "processing")
          ) {
            const isProcessing = paymentIntent.status === "processing";
            const isSucceeded = paymentIntent.status === "succeeded";

            setToStorage("paymentSuccess", {
              paymentIntentId: paymentIntent.id,
              amount: amount,
              timestamp: new Date().toISOString(),
              status: paymentIntent.status,
            });

            const userId = getFromStorage("createUserResponse", {}).userId;
            const selectedCourses = getFromStorage("selectedCourses", []);
            const programSlugs = selectedCourses.map((course) =>
              course.toUpperCase()
            );

            const purchaseBtn =
              document
                .querySelector("#registerFormSubmitButton")
                ?.closest("button") ||
              document.querySelector("[data-btn-submit]") ||
              document.querySelector("button:has(.btn_main_text)");
            if (purchaseBtn) {
              purchaseBtn.disabled = true;
              purchaseBtn.classList.add("disabled");
              purchaseBtn.setAttribute("aria-disabled", "true");
            }

            if (isSucceeded) {
              console.log("functions started");
              await handlePurchaseAndInvoice(paymentIntent.id, amount, userId);
              await sendWelcomeEmail(userId, programSlugs);
              await completeOnboarding(userId);
              console.log("functions completed");
            } else if (isProcessing) {
              console.log("SEPA payment processing - finalization via webhook");
            }

            if (showLoader) hideFullscreenLoader();
            clearLocalStorageAfterPayment();
            window.location.href = window.location.href.replace(
              "onboarding",
              "vielen-dank"
            );
            return;
          } else {
            errorDiv.style.display = "block";
            errorDiv.textContent = dictionary["error.paymentIncomplete"];
            isPaymentProcessing = false;
            if (submitButtonText)
              submitButtonText.textContent = dictionary["payment.payNow"];
            submitButton.disabled = false;
            return;
          }
        } catch (error) {
          console.error("Payment error:", error);
          errorDiv.style.display = "block";
          errorDiv.textContent = error?.message ?? error.toString();
          isPaymentProcessing = false;
          if (submitButtonText)
            submitButtonText.textContent = dictionary["payment.payNow"];
          submitButton.disabled = false;
        }
      }
    );
  } catch (error) {
    console.error(dictionary["error.payment"], error);
    setSubmitButtonLoading(false);
    hideFullscreenLoader();
    throw error;
  }
}

export async function ensureEmailVerifiedThenPay(amount, showLoader = false) {
  const userId = getUserIdSafe();
  if (!userId) {
    console.error("No userId found for email verification.");
    const errDiv = document.querySelector("#error_message_step5");
    if (errDiv) {
      errDiv.style.display = "block";
      errDiv.textContent = "Unbekannter Fehler: Benutzer nicht gefunden.";
    }
    setSubmitButtonLoading(false);
    if (showLoader) hideFullscreenLoader();
    return;
  }

  try {
    const verified = await apiIsEmailVerified(userId);
    if (verified) {
      await doPayment(amount, showLoader);
      return;
    }

    wireEmailVerifyModal({
      userId,
      onVerified: () => {
        doPayment(amount, true);
      },
      onCancel: () => {
        setSubmitButtonLoading(false);
        if (showLoader) hideFullscreenLoader();
      }
    });
    showEmailVerifyModal();
  } catch (error) {
    console.error("Email verification error:", error);
    setSubmitButtonLoading(false);
    if (showLoader) hideFullscreenLoader();
    throw error;
  }
}

export async function ensureEmailVerifiedThenCompleteTrial(showLoader = false) {
  const userId = getUserIdSafe();
  if (!userId) {
    console.error("No userId found for email verification.");
    const errDiv = document.querySelector("#error_message_step5");
    if (errDiv) {
      errDiv.style.display = "block";
      errDiv.textContent = "Unbekannter Fehler: Benutzer nicht gefunden.";
    }
    setSubmitButtonLoading(false);
    if (showLoader) hideFullscreenLoader();
    return;
  }

  try {
    const verified = await apiIsEmailVerified(userId);
    if (verified) {
      await completeOnboarding(userId, true);
      if (showLoader) hideFullscreenLoader();
      clearLocalStorageAfterPayment();
      window.location.href = window.location.href.replace(
        "onboarding",
        "vielen-dank"
      );
      return;
    }

    wireEmailVerifyModal({
      userId,
      onVerified: async () => {
        await completeOnboarding(userId, true);
        if (showLoader) hideFullscreenLoader();
        clearLocalStorageAfterPayment();
        window.location.href = window.location.href.replace(
          "onboarding",
          "vielen-dank"
        );
      },
      onCancel: () => {
        setSubmitButtonLoading(false);
        if (showLoader) hideFullscreenLoader();
      }
    });
    showEmailVerifyModal();
  } catch (error) {
    console.error("Email verification error:", error);
    setSubmitButtonLoading(false);
    if (showLoader) hideFullscreenLoader();
    throw error;
  }
}
