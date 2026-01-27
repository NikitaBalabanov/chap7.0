import { CURRENCY } from './config.js';
import { getFromStorage } from './storage.js';

export function calculateTotalPrice() {
  const pricing = getFromStorage("pricing", {});
  const selectedCourses = getFromStorage("selectedCourses", []);
  const pricePerCourse = Number(pricing.programPrice) || 0;
  return pricePerCourse * selectedCourses.length;
}

export function calculateDiscountPercentage() {
  return 0;
}

export function populateCheckout() {
  const container = document.querySelector("#productList");
  const filteredCourses = getFromStorage("courses", []);
  const totalContainer = document.querySelector("#priceTotal");
  const selectedCourses = getFromStorage("selectedCourses", []);
  const pricing = getFromStorage("pricing", {});
  const pricePerCourse = Number(pricing.programPrice) || 0;

  if (getFromStorage("trial", false)) {
    const totalWrap = document.querySelector(".price_total");
    if (totalWrap) totalWrap.innerHTML = "";
    const buttons = Array.from(
      document.querySelectorAll(".btn_main_text")
    ).filter((btn) => btn.textContent === "Jetzt kaufen");
    buttons.forEach(
      (button) => (button.innerHTML = "Kurseinheit ausprobieren")
    );
    return;
  }

  filteredCourses.forEach((course) => {
    if (selectedCourses.includes(course.slug)) {
      const item = renderCheckoutItem(course.name, "", "", pricePerCourse);
      container.appendChild(item);
    }
  });
  if (totalContainer)
    totalContainer.innerHTML = calculateTotalPrice().toFixed(2) + CURRENCY;
}

function renderCheckoutItem(title, badgeText, priceOld, priceNew) {
  const wrapper = document.createElement("div");
  wrapper.className = "card_product";
  wrapper.innerHTML = `
    <div class="card_product_content u-vflex-stretch-top u-gap-4">
      <div class="card_product_top">
        <div class="product_name">${title}</div>
        <div class="card_product_price">
          <div class="price_text_new">${priceNew}€</div>
        </div>
      </div>
    </div>`;
  return wrapper;
}

export function renderCheckoutCourseItem(
  imageSrc,
  title,
  description,
  price,
  badgeText,
  badgeColor
) {
  const template = document.createElement("template");
  template.innerHTML = `
    <div class="card_product">
      <img src="${imageSrc}" loading="lazy" sizes="100vw" alt="" class="card_product_img">
      <div class="card_product_content u-vflex-stretch-top u-gap-4">
        <div class="card_product_top">
          <h4 class="product_name">${title}</h4>
          <div class="card_product_price"><div class="price_text_new">${price}${CURRENCY}</div></div>
        </div>
        <div class="product_description">${description}</div>
        ${
          badgeText
            ? `<div class="badge is-border u-align-self-start">
                 <div class="badge_text_small" style="color:${badgeColor}">${badgeText}</div>
               </div>`
            : ""
        }
      </div>
    </div>`;
  return template.content.firstElementChild;
}

export function resetCheckoutView() {
  const productList = document.querySelector("#productList");
  if (productList) productList.innerHTML = "";
  const totalContainer = document.querySelector("#priceTotal");
  if (totalContainer) totalContainer.innerHTML = "";
}
