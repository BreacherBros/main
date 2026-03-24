const API = "https://r6-api-backend.onrender.com/player";

async function fetchPlayer(platform, name) {
  const res = await fetch(`${API}?platform=${platform}&name=${encodeURIComponent(name)}`);
  return res.json();
}

function renderOperator(p, glowClass) {
  return `
    <div class="operator-card ${glowClass}">
      
      <div class="operator-header">
        <div>
          <div class="operator-name">${p.username}</div>
          <div class="operator-tag">${p.platform || "PSN"}</div>
        </div>
        <div class="operator-tag">
          ${p.rank || "UNRANKED"} • ${p.mmr || 0} MMR
        </div>
      </div>

      <div class="section-title">COMBAT STATS</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">KILLS</div>
          <div class="stat-value">${p.kills ?? "-"}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">DEATHS</div>
          <div class="stat-value">${p.deaths ?? "-"}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">K/D</div>
          <div class="stat-value">${p.kd ?? "-"}</div>
        </div>
      </div>

      <div class="section-title">MATCH STATS</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">WINS</div>
          <div class="stat-value">${p.wins ?? "-"}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">LOSSES</div>
          <div class="stat-value">${p.losses ?? "-"}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">LEVEL</div>
          <div class="stat-value">${p.level ?? "-"}</div>
        </div>
      </div>

      <div class="section-title">RANK HISTORY</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">CURRENT RANK</div>
          <div class="stat-value">${p.rank ?? "-"}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">MAX RANK</div>
          <div class="stat-value">${p.maxRank ?? "-"}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">MAX MMR</div>
          <div class="stat-value">${p.maxMmr ?? "-"}</div>
        </div>
      </div>

    </div>
  `;
}

async function loadStats() {
  try {
    const p1 = await fetchPlayer("psn", "BB_Pater_Odor");
    const p2 = await fetchPlayer("psn", "SomaRay_Jr");

    document.getElementById("players").innerHTML = `
      ${renderOperator(p1, "operator-glow-blue")}
      ${renderOperator(p2, "operator-glow-orange")}
    `;
  } catch (err) {
    console.error("Stats Load Error:", err);
    document.getElementById("players").innerHTML = `
      <div class="operator-card operator-glow-blue">
        <div class="operator-name">API ERROR</div>
        <div class="operator-tag">BACKEND NOT AVAILABLE</div>
      </div>
    `;
  }
}

loadStats();
setInterval(loadStats, 60000); // 60s refresh
