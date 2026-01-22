const operators = [
  { name: "Pater_Odor", side: "blue" },
  { name: "SomaRay_Jr", side: "orange" }
];

const WORKER_URL = "https://r6-proxy.breacherbros.workers.dev"; // ✅ deine Worker-URL

async function fetchPlayer(player) {
  const res = await fetch(`${WORKER_URL}?player=${player}`);
  const html = await res.text();
  return parseStats(html);
}

function parseStats(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const findValue = (label) => {
    const el = [...doc.querySelectorAll("div, span, p, h1, h2, h3")]
      .find(e => e.textContent.trim().toLowerCase().includes(label.toLowerCase()));
    if (!el) return "N/A";
    const val = el.parentElement?.querySelector("span, div");
    return val ? val.textContent.trim() : "N/A";
  };

  return {
    level: findValue("Level"),
    rank: findValue("Rank"),
    kd: findValue("K/D"),
    wl: findValue("Win"),
    matches: findValue("Matches"),
    kills: findValue("Kills"),
    deaths: findValue("Deaths")
  };
}

async function render() {
  const root = document.getElementById("players");
  root.innerHTML = "";

  for (const op of operators) {
    let s;
    try {
      s = await fetchPlayer(op.name);
    } catch (e) {
      s = { level:"ERR", rank:"ERR", kd:"ERR", wl:"ERR", matches:"ERR", kills:"ERR", deaths:"ERR" };
    }

    const card = document.createElement("div");
    card.className = `operator-card ${op.side === "blue" ? "operator-glow-blue" : "operator-glow-orange"}`;

    card.innerHTML = `
      <div class="operator-header">
        <div class="operator-name">${op.name}</div>
        <div class="operator-tag">${op.side === "blue" ? "ICE UNIT" : "FIRE UNIT"}</div>
      </div>

      <div class="section-title">LIVE DATA</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-label">LEVEL</div><div class="stat-value">${s.level}</div></div>
        <div class="stat-box"><div class="stat-label">RANK</div><div class="stat-value">${s.rank}</div></div>
        <div class="stat-box"><div class="stat-label">K/D</div><div class="stat-value">${s.kd}</div></div>
        <div class="stat-box"><div class="stat-label">W/L</div><div class="stat-value">${s.wl}</div></div>
        <div class="stat-box"><div class="stat-label">MATCHES</div><div class="stat-value">${s.matches}</div></div>
        <div class="stat-box"><div class="stat-label">KILLS</div><div class="stat-value">${s.kills}</div></div>
        <div class="stat-box"><div class="stat-label">DEATHS</div><div class="stat-value">${s.deaths}</div></div>
      </div>
    `;

    root.appendChild(card);
  }
}

render();
setInterval(render, 10000); // 🔄 Auto-Update alle 10 Sekunden
