const API = "https://r6-api-backend.onrender.com/player";

async function loadPlayer(name) {
  const res = await fetch(`${API}?platform=psn&name=${name}`);
  return res.json();
}

async function loadStats() {
  const p1 = await loadPlayer("Pater_Odor");
  const p2 = await loadPlayer("SomaRay_Jr");

  document.getElementById("players").innerHTML = `
    <div class="card">
      <h2>${p1.username}</h2>
      <p>Level: ${p1.level}</p>
      <p>Rank: ${p1.rank} (${p1.rank_points})</p>
      <p>K/D: ${p1.kd}</p>
      <p>Wins: ${p1.wins} | Losses: ${p1.losses}</p>
      <p>Kills: ${p1.kills} | Deaths: ${p1.deaths}</p>
    </div>

    <div class="card">
      <h2>${p2.username}</h2>
      <p>Level: ${p2.level}</p>
      <p>Rank: ${p2.rank} (${p2.rank_points})</p>
      <p>K/D: ${p2.kd}</p>
      <p>Wins: ${p2.wins} | Losses: ${p2.losses}</p>
      <p>Kills: ${p2.kills} | Deaths: ${p2.deaths}</p>
    </div>
  `;
}

// Auto refresh alle 30 Sekunden
loadStats();
setInterval(loadStats, 30000);
