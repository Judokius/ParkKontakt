const storageKey = "parkkontakt-cars";
const legacyStorageKey = "parkping-cars";
const config = window.PARKKONTAKT_CONFIG || {};
const supabaseClient = window.supabase && config.supabaseUrl && config.supabasePublishableKey
  ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey)
  : null;
const state = { cars: JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey) || "[]") };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const params = new URLSearchParams(window.location.search);

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

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
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
      <a class="card-link" href="card.html?car=${encodeURIComponent(car.id || index)}">QR-Karte anzeigen →</a>
    </article>`).join("");
}

async function requireOwner() {
  if (!supabaseClient) return null;
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  if (!session) {
    window.location.href = "auth.html";
    return null;
  }
  return session.user;
}

async function loadRemoteCars() {
  if (!supabaseClient || !$("#cars")) return;
  const user = await requireOwner();
  if (!user) return;
  const { data, error } = await supabaseClient.from("vehicles").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
  if (error) throw error;
  state.cars = data || [];
  renderGarage();
  updateCount();
}

async function loadInbox() {
  if (!supabaseClient || !$("#messages")) return;
  const user = await requireOwner();
  if (!user) return;
  const { data, error } = await supabaseClient
    .from("messages")
    .select("id,reason,content,is_urgent,created_at,vehicles!inner(name,model,owner_id)")
    .eq("vehicles.owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const container = $("#messages");
  if (!data?.length) {
    container.innerHTML = '<div class="empty">Noch keine Nachrichten erhalten.</div>';
    return;
  }
  container.innerHTML = data.map((message) => `
    <article class="car-card">
      <h3>${escapeHtml(message.reason || "Hinweis")}${message.is_urgent ? " · Dringend" : ""}</h3>
      <p>${escapeHtml(message.vehicles.name || message.vehicles.model)} · ${new Date(message.created_at).toLocaleString("de-DE")}</p>
      <p>${escapeHtml(message.content)}</p>
    </article>`).join("");
}

async function createVehicle(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (supabaseClient) {
    const user = await requireOwner();
    if (!user) return;
    const { data, error } = await supabaseClient.from("vehicles").insert({
      owner_id: user.id,
      name: values.name || null,
      model: values.model,
      color: values.color,
      plate: values.plate || null,
      note: values.note || null,
      urgent_enabled: values.urgent === "on",
      quiet_hours_enabled: values.quiet === "on"
    }).select().single();
    if (error) throw error;
    window.location.href = `card.html?car=${encodeURIComponent(data.id)}`;
    return;
  }
  const code = window.crypto?.getRandomValues
    ? Array.from(window.crypto.getRandomValues(new Uint32Array(5)), (value) => (value % 36).toString(36)).join("").toUpperCase()
    : Math.random().toString(36).slice(2, 7).toUpperCase();
  state.cars.push({ ...values, code, public_code: code });
  localStorage.setItem(storageKey, JSON.stringify(state.cars));
  window.location.href = "garage.html";
}

async function loadVehicle() {
  const cardIndex = params.get("car");
  const vehicleId = params.get("vehicle") || cardIndex;
  if (!vehicleId) return null;
  let car = null;
  if (supabaseClient) {
    const column = vehicleId.includes("-") ? "id" : "public_code";
    const { data, error } = await supabaseClient.from("vehicles").select("id,public_code,name,model,color").eq(column, vehicleId.toUpperCase()).single();
    if (error) throw error;
    car = data;
  } else {
    car = state.cars[Number(vehicleId)] || state.cars.find((item) => item.id === vehicleId || item.code === vehicleId);
  }
  if (!car) {
    toast("Fahrzeug nicht gefunden.");
    return null;
  }
  const isCard = Boolean($("#card-code"));
  if (isCard) {
    const code = car.code || car.id;
    const contactUrl = new URL("message.html", window.location.href);
    contactUrl.searchParams.set("vehicle", car.id || code);
    $("#card-name").textContent = car.name || car.model;
    $("#card-details").textContent = `${car.model} · ${car.color}`;
    $("#card-code").textContent = `PK · ${String(car.public_code || code).slice(0, 8).toUpperCase()}`;
    const qrElement = $("#card-qr");
    if (qrElement && window.QRCode) {
      qrElement.replaceChildren();
      new window.QRCode(qrElement, { text: contactUrl.href, width: 165, height: 165, colorDark: "#102c4d", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
    }
  }
  if ($("#message-form")) {
    $("#vehicle-label").textContent = `ParkKontakt · ${String(car.public_code || car.id).slice(0, 8).toUpperCase()}`;
    $("#vehicle-name").textContent = car.name || car.model;
    $("#vehicle-details").textContent = `${car.model} · ${car.color}`;
    $("#vehicle-make").textContent = String(car.model || "PK").slice(0, 2).toUpperCase();
    $("#message-form").dataset.vehicleId = car.id || car.code;
  }
  return car;
}

async function submitMessage(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const vehicleId = form.dataset.vehicleId || params.get("vehicle");
  const values = Object.fromEntries(new FormData(form));
  if (!vehicleId) {
    toast("Dieser QR-Code ist ungültig.");
    return;
  }
  if (supabaseClient) {
    const { error } = await supabaseClient.from("messages").insert({
      vehicle_id: vehicleId,
      reason: values.reason || null,
      content: values.message,
      is_urgent: values.reason === "Notfall"
    });
    if (error) throw error;
  }
  form.reset();
  $$(".reasons button").forEach((item) => item.classList.remove("selected"));
  toast("Nachricht anonym und sicher gesendet.");
  window.setTimeout(() => { window.location.href = "index.html"; }, 1200);
}

async function initAuth() {
  const form = $("#auth-form");
  if (!form) return;
  if (!supabaseClient) {
    const status = $("#auth-status");
    if (status) status.textContent = "Die Anmeldung ist noch nicht konfiguriert. Hinterlege zuerst die Supabase-Werte in config.js.";
    form.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    return;
  }
  form.addEventListener("submit", async (event) => {
    try {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const action = event.submitter?.value || "login";
      const result = action === "signup"
        ? await supabaseClient.auth.signUp({ email: values.email, password: values.password })
        : await supabaseClient.auth.signInWithPassword({ email: values.email, password: values.password });
      if (result.error) throw result.error;
      if (action === "signup" && !result.data.session) {
        toast("Bitte bestätige zuerst deine E-Mail-Adresse.");
        return;
      }
      window.location.href = "garage.html";
    } catch (error) {
      toast(error.message || "Anmeldung fehlgeschlagen.");
    }
  });
}

const carForm = $("#car-form");
if (carForm) carForm.addEventListener("submit", (event) => createVehicle(event).catch((error) => toast(error.message || "Fahrzeug konnte nicht gespeichert werden.")));

const messageForm = $("#message-form");
if (messageForm) {
  messageForm.addEventListener("submit", (event) => submitMessage(event).catch((error) => toast(error.message || "Nachricht konnte nicht gesendet werden.")));
  $$(".reasons button").forEach((button) => button.addEventListener("click", () => {
    $$(".reasons button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    messageForm.elements.reason.value = button.dataset.reason;
    messageForm.elements.message.value = `${button.dataset.reason}: `;
  }));
  loadVehicle().catch((error) => toast(error.message || "Fahrzeug konnte nicht geladen werden."));
}
if ($("#card-code")) {
  loadVehicle().catch((error) => toast(error.message || "Fahrzeug konnte nicht geladen werden."));
}

const codeForm = $("#code-form");
if (codeForm && !$("#auth-form")) codeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = new FormData(event.currentTarget).get("code").toString().trim();
  if (code.length < 4) {
    toast("Bitte gib mindestens 4 Zeichen ein.");
    return;
  }
  window.location.href = `message.html?vehicle=${encodeURIComponent(code.toUpperCase())}`;
});

const logoutButton = $("#logout-button");
if (logoutButton) logoutButton.addEventListener("click", async () => {
  if (supabaseClient) await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

initAuth();
loadRemoteCars().catch((error) => toast(error.message || "Fahrzeuge konnten nicht geladen werden."));
loadInbox().catch((error) => toast(error.message || "Nachrichten konnten nicht geladen werden."));
updateCount();
renderGarage();

const scanner = $("#qr-reader");
if (scanner && window.Html5Qrcode) {
  const qrScanner = new window.Html5Qrcode("qr-reader");
  qrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    (decodedText) => {
      qrScanner.stop().catch(() => {});
      let destination;
      try {
        destination = new URL(decodedText, window.location.href);
      } catch {
        toast("Dieser QR-Code ist ungültig.");
        return;
      }
      if (destination.origin !== window.location.origin || !destination.pathname.endsWith("/message.html")) {
        toast("Dieser QR-Code gehört nicht zu ParkKontakt.");
        return;
      }
      window.location.href = destination.href;
    },
    () => {}
  ).catch(() => {
    const help = $("#scan-help");
    if (help) help.textContent = "Kamerazugriff nicht möglich. Nutze stattdessen den manuellen Code.";
  });
}
