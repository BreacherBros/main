const API = "https://r6-api-backend.onrender.com/player";

async function fetchPlayer(platform, name) {
  try {
    const res = await fetch(`${API}?platform=${platform}&name=${encodeURIComponent(name)}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    // 👉 Falls API verschachtelt ist
    return data.data || data;

  } catch (err) {
    console.error("Fetch Fehler:", err);
    return null; // wichtig!
  }
}

function safe(val, fallback = "-") {
  return val !== undefined && val !== null ? val : fallback;
}

function renderOperator(p, glowClass) {
  if (!p) {
    return `
      <div class="operator-card ${glowClass}">
        <div class="operator-name">NO DATA</div>
        <div class="operator-tag">API ERROR</div>
      </div>
    `;
  }

  return `
    <div class="operator-card ${glowClass}">
      
      <div class="operator-header">
        <div>
          <div class="operator-name">${safe(p.username)}</div>
          <div class="operator-tag">${safe(p.platform, "PSN").toUpperCase()}</div>
        </div>
        <div class="operator-tag">
          ${safe(p.rank, "UNRANKED")} • ${safe(p.mmr, 0)} MMR
        </div>
      </div>

      <div class="section-title">COMBAT STATS</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">KILLS</div>
          <div class="stat-value">${safe(p.kills)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">DEATHS</div>
          <div class="stat-value">${safe(p.deaths)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">K/D</div>
          <div class="stat-value">${safe(p.kd)}</div>
        </div>
      </div>

      <div class="section-title">MATCH STATS</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">WINS</div>
          <div class="stat-value">${safe(p.wins)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">LOSSES</div>
          <div class="stat-value">${safe(p.losses)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">LEVEL</div>
          <div class="stat-value">${safe(p.level)}</div>
        </div>
      </div>

      <div class="section-title">RANK HISTORY</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">CURRENT RANK</div>
          <div class="stat-value">${safe(p.rank)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">MAX RANK</div>
          <div class="stat-value">${safe(p.maxRank)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">MAX MMR</div>
          <div class="stat-value">${safe(p.maxMmr)}</div>
        </div>
      </div>

    </div>
  `;
}

async function loadStats() {
  const container = document.getElementById("players");

  container.innerHTML = "Loading...";

  const [p1, p2] = await Promise.all([
    fetchPlayer("psn", "BB_Pater_Odor"),
    fetchPlayer("psn", "SomaRay_Jr")
  ]);

  container.innerHTML = `
    ${renderOperator(p1, "operator-glow-blue")}
    ${renderOperator(p2, "operator-glow-orange")}
  `;

  setTimeout(loadStats, 60000);
}

loadStats();
