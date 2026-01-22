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
      <p>Rank: ${p1.rank}</p>
      <p>K/D: ${p1.kd}</p>
      <p>Wins/Losses: ${p1.wins_losses}</p>
      <p>Kills/Deaths: ${p1.kills_deaths}</p>
      <p>Headshots: ${p1.headshots}</p>
    </div>

    <div class="card">
      <h2>${p2.username}</h2>
      <p>Level: ${p2.level}</p>
      <p>Rank: ${p2.rank}</p>
      <p>K/D: ${p2.kd}</p>
      <p>Wins/Losses: ${p2.wins_losses}</p>
      <p>Kills/Deaths: ${p2.kills_deaths}</p>
      <p>Headshots: ${p2.headshots}</p>
    </div>
  `;
}

loadStats();
setInterval(loadStats, 10000);
