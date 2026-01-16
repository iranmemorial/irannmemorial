// script.js (module)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* ====== 1) SUPABASE CONFIG ======
   Replace these two lines with your real values from:
   Supabase Dashboard -> Settings -> API
*/
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE";

const supabaseReady =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;

const supabase = supabaseReady ? createClient(https://sfuhmpgsenoavvpfqaqd.supabase.co, eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmdWhtcGdzZW5vYXZ2cGZxYXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODkxMDgsImV4cCI6MjA4NDE2NTEwOH0.OdPAJSMYA5vtZrR1f4WM_5Kz4R0S2QeSnGXIHpL7Djg) : null;

/* ====== 2) ELEMENTS ====== */
const track = document.getElementById("track");
const trackClone = document.getElementById("trackClone");
const toggleBtn = document.getElementById("toggleBtn");
const personForm = document.getElementById("personForm");

/* ====== 3) SCROLL STATE ====== */
let paused = false;
let y = 0;
let speed = 0.35; // smaller = slower
let started = false;

/* ====== 4) HELPERS ====== */
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function clean(s) {
  return escapeHtml(String(s ?? "").trim());
}
function toIntOrNull(v) {
  const n = parseInt(String(v || "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/* ====== 5) RENDER ====== */
function renderEntry(p) {
  const name = clean(p.name);
  if (!name) return "";

  const age = p.age != null ? `Age: ${clean(p.age)}` : "";
  const gender = p.gender ? `Gender: ${clean(p.gender)}` : "";
  const line1 = [age, gender].filter(Boolean).join(" • ");

  const place = clean(p.place_of_death);
  const date = clean(p.date_of_death || "Unknown");
  const from = p.from ? `From: ${clean(p.from)}` : "";

  const social = p.social_link
    ? `Social: <a class="link" href="${clean(p.social_link)}" target="_blank" rel="noopener noreferrer">${clean(p.social_link)}</a>`
    : "";

  return `
    <div class="entry">
      <div class="name">${name}</div>
      ${line1 ? `<div class="meta">${line1}</div>` : ""}
      <div class="meta">${place} — ${date}</div>
      ${from ? `<div class="small">${from}</div>` : ""}
      ${social ? `<div class="small">${social}</div>` : ""}
    </div>
  `;
}

/* ====== 6) LOAD APPROVED FROM SUPABASE ====== */
async function loadApprovedPeople() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("memorial_people")
    .select("name, age, gender, date_of_death, place_of_death, from_place, social_link, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Supabase select error:", error);
    return [];
  }

  return (data || []).map((row) => ({
    name: row.name,
    age: row.age,
    gender: row.gender,
    date_of_death: row.date_of_death,
    place_of_death: row.place_of_death,
    from: row.from_place,
    social_link: row.social_link
  }));
}

/* ====== 7) INSERT PENDING ====== */
async function submitPerson(payload) {
  if (!supabase) return { ok: false, msg: "Supabase not configured." };

  const row = {
    name: payload.name?.trim(),
    age: toIntOrNull(payload.age),
    gender: payload.gender?.trim() || null,
    date_of_death: payload.date_of_death?.trim() || "unknown",
    place_of_death: payload.place_of_death?.trim(),
    from_place: payload.from_place?.trim() || null,
    social_link: payload.social_link?.trim() || null,
    status: "pending"
  };

  const { error } = await supabase.from("memorial_people").insert([row]);
  if (error) {
    console.error("Supabase insert error:", error);
    return { ok: false, msg: "Submission failed. Check Supabase RLS/policies." };
  }
  return { ok: true, msg: "Submitted." };
}

/* ====== 8) SCROLL LOOP ====== */
function startScroll() {
  if (started) return;
  started = true;

  function step() {
    if (!paused) {
      y -= speed;
      const h = track.offsetHeight || 1;
      if (-y >= h) y = 0;
      track.style.transform = `translateY(${y}px)`;
      trackClone.style.transform = `translateY(${y + h}px)`;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ====== 9) PAUSE BUTTON ====== */
toggleBtn?.addEventListener("click", () => {
  paused = !paused;
  toggleBtn.textContent = paused ? "Resume" : "Pause";
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    paused = !paused;
    if (toggleBtn) toggleBtn.textContent = paused ? "Resume" : "Pause";
  }
});

/* ====== 10) FORM SUBMIT ======
   Modal open/close is handled in index.html inline script.
   Here we only handle saving to Supabase.
*/
personForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(personForm);
  const payload = Object.fromEntries(fd.entries());

  if (!String(payload.name || "").trim()) return alert("Name is required.");
  if (!String(payload.date_of_death || "").trim()) return alert("Date of death is required (or type 'unknown').");
  if (!String(payload.place_of_death || "").trim()) return alert("Place of death is required.");

  const res = await submitPerson(payload);
  if (res.ok) {
    alert("Submitted successfully. It will appear after review.");
    personForm.reset();
    // close modal (handled by inline script, but we can also force-close)
    const modalBackdrop = document.getElementById("modalBackdrop");
    modalBackdrop?.classList.add("hidden");
    modalBackdrop?.setAttribute("aria-hidden", "true");
  } else {
    alert(res.msg || "Submission failed.");
  }
});

/* ====== 11) INIT ====== */
(async function init() {
  if (!track || !trackClone) return;

  if (!supabaseReady) {
    const msg = `
      <div class="entry">
        <div class="name">Setup needed</div>
        <div class="meta">Paste your Supabase URL + Anon Key into script.js</div>
      </div>`;
    track.innerHTML = msg;
    trackClone.innerHTML = msg;
    return;
  }

  const people = await loadApprovedPeople();

  if (people.length === 0) {
    const msg = `
      <div class="entry">
        <div class="name">No approved names yet</div>
        <div class="meta">Submissions may be pending review.</div>
      </div>`;
    track.innerHTML = msg;
    trackClone.innerHTML = msg;
    startScroll();
    return;
  }

  const html = people.map(renderEntry).join("");
  track.innerHTML = html;
  trackClone.innerHTML = html;

  startScroll();
})().catch((err) => {
  console.error(err);
  if (track) {
    track.innerHTML = `
      <div class="entry">
        <div class="name">Error</div>
        <div class="meta">${escapeHtml(err.message || "Unknown error")}</div>
      </div>`;
  }
});
