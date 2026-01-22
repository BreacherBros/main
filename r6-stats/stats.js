const operators = [
  { name: "Pater_Odor", side: "blue" },
  { name: "SomaRay_Jr", side: "orange" }
];

function generateStats() {
  return {
    level: rand(140, 260),
    rank: pick(["Gold", "Platinum", "Emerald", "Diamond"]),
    mmr: rand(2600, 4200),
    kd: randFloat(0.9, 1.6),
    wl: randFloat(0.8, 1.4),
    hs: randFloat(30, 65) + "%",
    kills: rand(20000, 90000),
    deaths: rand(15000, 80000),
    matches: rand(3000, 9000),
    wins: rand(1500, 5000),
    playtime: rand(800, 3000) + "h"
  };
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
function randFloat(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function render() {
  const root = document.getElementById("players");
  root.innerHTML = "";

  operators.forEach(op => {
    const s = generateStats();

    const card = document.createElement("div");
    card.className = `operator-card ${op.side === "blue" ? "operator-glow-blue" : "operator-glow-orange"}`;

    card.innerHTML = `
      <div class="operator-header">
        <div class="operator-name">${op.name}</div>
        <div class="operator-tag">${op.side === "blue" ? "ICE UNIT" : "FIRE UNIT"}</div>
      </div>

      <div class="section-title">CORE DATA</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-label">LEVEL</div><div class="stat-value">${s.level}</div></div>
        <div class="stat-box"><div class="stat-label">RANK</div><div class="stat-value">${s.rank}</div></div>
        <div class="stat-box"><div class="stat-label">MMR</div><div class="stat-value">${s.mmr}</div></div>
      </div>

      <div class="section-title">COMBAT</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-label">K/D</div><div class="stat-value">${s.kd}</div></div>
        <div class="stat-box"><div class="stat-label">W/L</div><div class="stat-value">${s.wl}</div></div>
        <div class="stat-box"><div class="stat-label">HS%</div><div class="stat-value">${s.hs}</div></div>
      </div>

      <div class="section-title">BATTLE DATA</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-label">KILLS</div><div class="stat-value">${s.kills}</div></div>
        <div class="stat-box"><div class="stat-label">DEATHS</div><div class="stat-value">${s.deaths}</div></div>
        <div class="stat-box"><div class="stat-label">MATCHES</div><div class="stat-value">${s.matches}</div></div>
      </div>

      <div class="section-title">OPERATIONS</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-label">WINS</div><div class="stat-value">${s.wins}</div></div>
        <div class="stat-box"><div class="stat-label">PLAYTIME</div><div class="stat-value">${s.playtime}</div></div>
        <div class="stat-box"><div class="stat-label">STATUS</div><div class="stat-value">ACTIVE</div></div>
      </div>
    `;

    root.appendChild(card);
  });
}

render();
setInterval(render, 10000); // 🔄 10 Sekunden
