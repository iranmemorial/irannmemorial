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
  if (!name) return "";

  const ageNum = Number.isFinite(p.age) ? p.age : parseInt(p.age, 10);
  const age = Number.isFinite(ageNum) ? `Age: ${ageNum}` : "";

  const gender = p.gender ? `Gender: ${cleanLabel(p.gender)}` : "";
  const line1 = [age, gender].filter(Boolean).join(" • ");

  const place = cleanLabel(p.place_of_death);
  const date = cleanLabel(p.date_of_death || "Unknown");
  const from = p.from ? `From: ${cleanLabel(p.from)}` : "";

  const social = p.social_link
    ? `Social: <a class="link" href="${cleanLabel(p.social_link)}" target="_blank" rel="noopener noreferrer">${cleanLabel(p.social_link)}</a>`
    : "";

  const source = p.source_url
    ? `<div class="small">Source: <a class="link" href="${cleanLabel(p.source_url)}" target="_blank" rel="noopener noreferrer">Issue</a></div>`
    : "";

  return `
    <div class="entry">
      <div class="name">${name}</div>
      ${line1 ? `<div class="meta">${line1}</div>` : ""}
      <div class="meta">${place} — ${date}</div>
      ${from ? `<div class="small">${from}</div>` : ""}
      ${social ? `<div class="small">${social}</div>` : ""}
      ${source}
    </div>
  `;
}

async function loadNamesJson() {
  const res = await fetch("names.json", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function loadApprovedIssues() {
  // IMPORTANT: these must match your GitHub username and repo name
  const owner = "irannmemorial";
  const repo = "iranmemorial";

  // Label in your screenshot is "Approved" (capital A)
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&labels=Approved&per_page=100`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const issues = await res.json();

  const get = (body, label) => {
    const m = (body || "").match(new RegExp(label + "\\s*:\\s*(.+)", "i"));
    return m ? m[1].trim() : "";
  };

  return issues
    .filter((it) => !it.pull_request) // ignore PRs if any
    .map((it) => {
      const body = it.body || "";
      const title = (it.title || "").replace(/\s+#\d+$/, "").trim();

      return {
        name: title || get(body, "Name"),
        age: parseInt(get(body, "Age"), 10),
        gender: get(body, "Gender"),
        date_of_death: get(body, "Date of death") || "unknown",
        place_of_death: get(body, "Place of death"),
        from: get(body, "From"),
        social_link: get(body, "Social media") || get(body, "Social"),
        source_url: it.html_url
      };
    });
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

  const [fromJson, fromIssues] = await Promise.all([
    loadNamesJson(),
    loadApprovedIssues()
  ]);

  // Combine and remove empty entries
  const people = [...fromJson, ...fromIssues].filter(p => p && p.name);

  if (people.length === 0) {
    const msg = `
      <div class="entry">
        <div class="name">No names yet</div>
        <div class="meta">Add entries to names.json or create an Approved Issue.</div>
      </div>`;
    track.innerHTML = msg;
    trackClone.innerHTML = msg;
    return;
  }

  const html = people.map(renderEntry).join("");
  track.innerHTML = html;
  trackClone.innerHTML = html;

  startScroll();
})().catch((err) => {
  if (track) {
    track.innerHTML = `
      <div class="entry">
        <div class="name">Error</div>
        <div class="meta">${escapeHtml(err.message)}</div>
      </div>`;
  }
});
