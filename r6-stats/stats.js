const operators = [
  { name: "Pater_Odor", side: "blue" },
  { name: "SomaRay_Jr", side: "orange" }
];

const API = "https://r6-proxy.breacherbros.workers.dev";

async function fetchPlayer(player) {
  const res = await fetch(`${API}?player=${player}`);
  return await res.json();
}

async function render() {
  const root = document.getElementById("players");
  root.innerHTML = "";

  for (const op of operators) {
    let s;
    try {
      s = await fetchPlayer(op.name);
    } catch {
      s = { level:"ERR", kd:"ERR", wl:"ERR", matches:"ERR", kills:"ERR", deaths:"ERR", rank:"ERR" };
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
        <div class="stat-box"><div class="stat-label">LEVEL</div><div class="stat-value">${s.level ?? "N/A"}</div></div>
        <div class="stat-box"><div class="stat-label">RANK</div><div class="stat-value">${s.rank ?? "N/A"}</div></div>
        <div class="stat-box"><div class="stat-label">K/D</div><div class="stat-value">${s.kd ?? "N/A"}</div></div>
        <div class="stat-box"><div class="stat-label">W/L</div><div class="stat-value">${s.wl ?? "N/A"}</div></div>
        <div class="stat-box"><div class="stat-label">MATCHES</div><div class="stat-value">${s.matches ?? "N/A"}</div></div>
        <div class="stat-box"><div class="stat-label">KILLS</div><div class="stat-value">${s.kills ?? "N/A"}</div></div>
        <div class="stat-box"><div class="stat-label">DEATHS</div><div class="stat-value">${s.deaths ?? "N/A"}</div></div>
      </div>
    `;

    root.appendChild(card);
  }
}

render();
setInterval(render, 10000);
