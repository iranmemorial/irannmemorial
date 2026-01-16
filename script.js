const track = document.getElementById("track");
const trackClone = document.getElementById("trackClone");
const toggleBtn = document.getElementById("toggleBtn");

let paused = false;
let y = 0;
let speed = 0.35; // smaller = slower

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanLabel(s) {
  return escapeHtml(String(s || "").trim());
}

function renderEntry(p) {
  const name = cleanLabel(p.name);
  const age = Number.isFinite(p.age) ? `Age: ${p.age}` : "";
  const gender = p.gender ? `Gender: ${cleanLabel(p.gender)}` : "";
  const line1 = [age, gender].filter(Boolean).join(" • ");

  const place = cleanLabel(p.place_of_death);
  const date = cleanLabel(p.date_of_death || "Unknown");
  const from = p.from ? `From: ${cleanLabel(p.from)}` : "";
  const social = p.social_link
    ? `Social: <a class="link" href="${cleanLabel(p.social_link)}" target="_blank" rel="noopener noreferrer">${cleanLabel(p.social_link)}</a>`
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

async function loadNames() {
  const res = await fetch("names.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load names.json");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function startScroll() {
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

(async function init() {
  if (!track || !trackClone) throw new Error("Missing #track elements in index.html");

  const people = await loadNames();
  if (people.length === 0) {
    track.innerHTML = `<div class="entry"><div class="name">No names yet</div><div class="meta">Add entries to names.json</div></div>`;
    trackClone.innerHTML = track.innerHTML;
    return;
  }

  const html = people.map(renderEntry).join("");
  track.innerHTML = html;
  trackClone.innerHTML = html;

  startScroll();
})().catch((err) => {
  if (track) {
    track.innerHTML = `<div class="entry"><div class="name">Error</div><div class="meta">${escapeHtml(err.message)}</div></div>`;
  }
});
