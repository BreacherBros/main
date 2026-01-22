const API = "https://r6-api-backend.onrender.com/player";

async function loadPlayer(name) {
  const res = await fetch(`${API}?platform=psn&name=${name}`);
  return res.json();
}

async function loadStats() {
  const p1raw = await loadPlayer("Pater_Odor");
  const p2raw = await loadPlayer("SomaRay_Jr");

  const p1 = p1raw.data;
  const p2 = p2raw.data;

  const p1g = p1.stats.general;
  const p1r = p1.stats.ranked;

  const p2g = p2.stats.general;
  const p2r = p2.stats.ranked;

  document.getElementById("players").innerHTML = `
    <div class="card">
      <h2>${p1.username}</h2>
      <p>Level: ${p1g.level}</p>
      <p>Rank: ${p1r.rank} (${p1r.mmr})</p>
      <p>K/D: ${p1g.kd}</p>
      <p>Wins: ${p1g.wins} | Losses: ${p1g.losses}</p>
      <p>Kills: ${p1g.kills} | Deaths: ${p1g.deaths}</p>
      <p>Headshots: ${p1g.headshots}</p>
    </div>

    <div class="card">
      <h2>${p2.username}</h2>
      <p>Level: ${p2g.level}</p>
      <p>Rank: ${p2r.rank} (${p2r.mmr})</p>
      <p>K/D: ${p2g.kd}</p>
      <p>Wins: ${p2g.wins} | Losses: ${p2g.losses}</p>
      <p>Kills: ${p2g.kills} | Deaths: ${p2g.deaths}</p>
      <p>Headshots: ${p2g.headshots}</p>
    </div>
  `;
}

// Auto refresh alle 30 Sekunden
loadStats();
setInterval(loadStats, 30000);
