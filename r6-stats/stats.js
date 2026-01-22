const players = [
  { name: "Pater_Odor", side: "blue" },
  { name: "SomaRay_Jr", side: "orange" }
];

const WORKER_URL = "https://r6-proxy.YOURNAME.workers.dev"; // <-- HIER DEINE URL

async function fetchPlayer(player) {
  const res = await fetch(`${WORKER_URL}?player=${player}`);
  const html = await res.text();

  // ⚠️ Parsing (basic, erweiterbar)
  return parseStats(html);
}

function parseStats(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // ⚠️ Tracker-Seiten ändern oft Klassen → später robust machen
  const get = (text) => {
    const el = [...doc.querySelectorAll("*")].find(e => e.textContent.includes(text));
    return el ? el.nextElementSibling?.textContent.trim() : "N/A";
  };

  return {
    level: get("Level"),
    kd: get("K/D"),
    wl: get("Win %"),
    rank: get("Rank"),
    matches: get("Matches"),
    kills: get("Kills"),
    deaths: get("Deaths")
  };
}

async function render() {
  const root = document.getElementById("players");
  root.innerHTML = "";

  for (const p of players) {
    const s = await fetchPlayer(p.name);

    const card = document.createElement("div");
    card.className = `operator-card ${p.side === "blue" ? "operator-glow-blue" : "operator-glow-orange"}`;

    card.innerHTML = `
      <div class="operator-header">
        <div class="operator-name">${p.name}</div>
        <div class="operator-tag">${p.side === "blue" ? "ICE UNIT" : "FIRE UNIT"}</div>
      </div>

      <div class="section-title">LIVE DATA</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-label">LEVEL</div><div class="stat-value">${s.level}</div></div>
        <div class="stat-box"><div class="stat-label">RANK</div><div class="stat-value">${s.rank}</div></div>
        <div class="stat-box"><div class="stat-label">K/D</div><div class="stat-value">${s.kd}</div></div>
        <div class="stat-box"><div class="stat-label">W/L</div><div class="stat-value">${s.wl}</div></div>
        <div class="stat-box"><div class="stat-label">MATCHES</div><div class="stat-value">${s.matches}</div></div>
        <div class="stat-box"><div class="stat-label">KILLS</div><div class="stat-value">${s.kills}</div></div>
      </div>
    `;

    root.appendChild(card);
  }
}

render();
setInterval(render, 10000); // 🔄 Auto-Reload alle 10 Sekunden
