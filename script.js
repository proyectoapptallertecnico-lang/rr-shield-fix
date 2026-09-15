// Configuracion de Firebase (clave publica de cliente, protegida por reglas de Firestore)
// Si Firebase no carga (bloqueador de anuncios, red, caida del servicio) el resto de la
// pagina (menu, animaciones, formulario) debe seguir funcionando igual, asi que el fallo
// se aisla aqui en vez de dejar que detenga la ejecucion del resto del script.
let db = null;
try {
  const firebaseConfig = {
    apiKey: "AIzaSyDvqJyE6RNy6mGBFJ8p00jnXr0SGgvnxj4",
    authDomain: "rr-shield-fix-f51e8.firebaseapp.com",
    projectId: "rr-shield-fix-f51e8",
    storageBucket: "rr-shield-fix-f51e8.firebasestorage.app",
    messagingSenderId: "109491958301",
    appId: "1:109491958301:web:1fe13e1e15e5fa3a710cf4"
  };
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
} catch (err) {
  console.error("No se pudo inicializar Firebase:", err);
}

document.getElementById("year").textContent = new Date().getFullYear();

// Menu movil
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");
function setNavOpen(open) {
  mainNav.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
}
navToggle.addEventListener("click", function () {
  setNavOpen(!mainNav.classList.contains("open"));
});
mainNav.querySelectorAll("a").forEach(function (link) {
  link.addEventListener("click", function () {
    setNavOpen(false);
  });
});
document.addEventListener("click", function (e) {
  if (mainNav.classList.contains("open") && !mainNav.contains(e.target) && !navToggle.contains(e.target)) {
    setNavOpen(false);
  }
});

// Wizard del formulario
const form = document.getElementById("repairForm");
const steps = Array.from(form.querySelectorAll(".step"));
let currentStep = 0;
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const formMsg = document.getElementById("formMsg");
const stepsIndicator = document.getElementById("stepsIndicator");

function renderIndicator() {
  stepsIndicator.innerHTML = steps.map(function (_, i) {
    return "<span class=\"dot" + (i === currentStep ? " active" : "") + "\"></span>";
  }).join("");
}

function showStep(i) {
  steps.forEach(function (s, idx) { s.hidden = idx !== i; });
  prevBtn.hidden = i === 0;
  nextBtn.hidden = i === steps.length - 1;
  submitBtn.hidden = i !== steps.length - 1;
  if (i === steps.length - 1) { buildResumen(); }
  renderIndicator();
}

function validateStep(i) {
  const inputs = steps[i].querySelectorAll("input[required], select[required]");
  for (const inp of inputs) {
    if (!inp.value) { inp.reportValidity(); return false; }
  }
  return true;
}

nextBtn.addEventListener("click", function () {
  if (!validateStep(currentStep)) return;
  currentStep = Math.min(currentStep + 1, steps.length - 1);
  showStep(currentStep);
});

prevBtn.addEventListener("click", function () {
  currentStep = Math.max(currentStep - 1, 0);
  showStep(currentStep);
});

form.querySelectorAll("input[name=metodoEntrega]").forEach(function (r) {
  r.addEventListener("change", function () {
    const selected = form.querySelector("input[name=metodoEntrega]:checked").value;
    document.getElementById("mensajeriaInfo").hidden = selected !== "Mensajeria";
  });
});

function resumenRow(label, value) {
  const p = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = label + ":";
  p.appendChild(strong);
  p.appendChild(document.createTextNode(" " + value));
  return p;
}

function buildResumen() {
  const data = new FormData(form);
  const resumen = document.getElementById("resumen");
  resumen.innerHTML = "";
  resumen.appendChild(resumenRow("Nombre", data.get("nombre")));
  resumen.appendChild(resumenRow("Telefono", data.get("telefono")));
  resumen.appendChild(resumenRow("Poblacion", data.get("poblacion")));
  resumen.appendChild(resumenRow("Dispositivo", data.get("tipoDispositivo") + " - " + data.get("modelo")));
  resumen.appendChild(resumenRow("Problema", data.get("problema")));
  resumen.appendChild(resumenRow("Detalles", data.get("detalles") || "-"));
  resumen.appendChild(resumenRow("Entrega", data.get("metodoEntrega")));
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  if (!validateStep(currentStep)) return;
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";
  const data = new FormData(form);
  const hoy = new Date();
  const fechaISO = hoy.toISOString().slice(0, 10);
  const problemaCompleto = data.get("problema") + (data.get("detalles") ? (" - " + data.get("detalles")) : "");
  try {
    if (!db) throw new Error("Firebase no esta disponible");
    await db.collection("reparaciones").add({
      cliente: data.get("nombre"),
      clienteNif: "",
      telefono: data.get("telefono"),
      poblacion: data.get("poblacion"),
      tipoDispositivo: data.get("tipoDispositivo"),
      modelo: data.get("modelo"),
      problema: problemaCompleto,
      metodoEntrega: data.get("metodoEntrega"),
      estado: "Solicitud nueva - pendiente de presupuesto",
      numero: "",
      manoObra: 0,
      repuestos: 0,
      iva: 0,
      ivaPorcentaje: 0,
      total: 0,
      fecha: fechaISO,
      origen: "web-rrshieldfix.es",
      creado: firebase.firestore.FieldValue.serverTimestamp()
    });
    formMsg.textContent = "Solicitud enviada. Te contactaremos pronto. Tambien puedes escribirnos por WhatsApp para ir mas rapido.";
    formMsg.className = "form-msg success";
    form.reset();
    currentStep = 0;
    showStep(0);
  } catch (err) {
    console.error(err);
    formMsg.textContent = "Hubo un problema al enviar tu solicitud. Por favor, contactanos por WhatsApp.";
    formMsg.className = "form-msg error";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar solicitud";
  }
});

showStep(0);

// Aparicion suave de tarjetas y bloques al hacer scroll
const revealEls = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (revealEls.length && "IntersectionObserver" in window && !prefersReducedMotion) {
  const revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach(function (el) { revealObserver.observe(el); });
} else {
  revealEls.forEach(function (el) { el.classList.add("is-visible"); });
}
