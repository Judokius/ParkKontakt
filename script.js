const state = { cars: JSON.parse(localStorage.getItem("parkping-cars") || "[]") };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const codeFor = (index) => state.cars[index]?.code || "8K4L2";

document.title = document.title.replace(/ParkPing/gi, "ParkKontakt");
document.body.innerHTML = document.body.innerHTML.replace(/ParkPing/gi, "ParkKontakt").replace(/parkping/gi, "parkkontakt");

function toast(message) {
  let element = $("#toast");
  if (!element) {
    element = document.createElement("div");
    element.id = "toast";
    document.body.append(element);
  }
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 3000);
}

function updateCount() {
  $$(".count").forEach((element) => { element.textContent = state.cars.length; });
}

function renderGarage() {
  const container = $("#cars");
  if (!container) return;
  const summary = $(".summary");
  if (summary) summary.textContent = `${state.cars.length} Fahrzeug${state.cars.length === 1 ? "" : "e"} angelegt`;
  if (!state.cars.length) {
    container.innerHTML = '<div class="empty">Noch kein Fahrzeug angelegt.<br><br><a class="primary" href="new-car.html">Jetzt starten</a></div>';
    return;
  }
  container.innerHTML = state.cars.map((car, index) => `
    <article class="car-card">
      <h3>${escapeHtml(car.name || car.model)}</h3>
      <p>${escapeHtml(car.model)} · ${escapeHtml(car.color)}${car.plate ? ` · ${escapeHtml(car.plate)}` : ""}</p>
      <a class="card-link" href="card.html?car=${index}">QR-Karte anzeigen →</a>
    </article>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

const carForm = $("#car-form");
if (carForm) carForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const car = { ...Object.fromEntries(new FormData(event.currentTarget)), code: Math.random().toString(36).slice(2, 7).toUpperCase() };
  state.cars.push(car);
  localStorage.setItem("parkping-cars", JSON.stringify(state.cars));
  window.location.href = "garage.html";
});

const codeForm = $("#code-form");
if (codeForm) codeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = new FormData(event.currentTarget).get("code").toString().trim();
  if (code.length < 4) {
    toast("Bitte gib mindestens 4 Zeichen ein.");
    return;
  }
  window.location.href = `message.html?code=${encodeURIComponent(code.toUpperCase())}`;
});

$$(".reasons button").forEach((button) => button.addEventListener("click", () => {
  $$(".reasons button").forEach((item) => item.classList.remove("selected"));
  button.classList.add("selected");
  $("#message-form textarea").value = `${button.dataset.reason}: `;
}));

const messageForm = $("#message-form");
if (messageForm) messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  $$(".reasons button").forEach((item) => item.classList.remove("selected"));
  toast("Nachricht anonym und sicher gesendet.");
  window.setTimeout(() => { window.location.href = "index.html"; }, 1200);
});

const cardIndex = new URLSearchParams(window.location.search).get("car");
if (cardIndex !== null && $("#card-code")) {
  const car = state.cars[Number(cardIndex)];
  if (car) {
    $("#card-name").textContent = car.name || car.model;
    $("#card-details").textContent = `${car.model} · ${car.color}`;
    $("#card-code").textContent = `PP · ${codeFor(Number(cardIndex))}`;
  }
}

updateCount();
renderGarage();
