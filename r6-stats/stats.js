const API = "https://r6-proxy.breacherbros.workers.dev";

async function fetchPlayer(platform, name) {
  const res = await fetch(`${API}?platform=${platform}&name=${encodeURIComponent(name)}`);
  return res.json();
}

function val(obj, key) {
  return obj?.[key]?.displayValue || obj?.[key]?.value || "0";
}

function mapPlayer(api) {
  const segments = api.data.segments;

  const overview = segments.find(s => s.type === "overview");
  const ranked = segments.find(s => s.type === "ranked");

  return {
    username: api.data.platformInfo.platformUserHandle,
    level: val(overview.stats, "level"),
    kd: val(overview.stats, "kd"),
    wins: val(overview.stats, "wins"),
    losses: val(overview.stats, "losses"),
    kills: val(overview.stats, "kills"),
    deaths: val(overview.stats, "deaths"),
    headshots: val(overview.stats, "headshots"),
    rank: val(ranked?.stats, "rankName"),
    mmr: val(ranked?.stats, "rating")
  };
}

async function loadStats() {
  const p1raw = await fetchPlayer("psn", "Pater_Odor");
  const p2raw = await fetchPlayer("psn", "SomaRay_Jr");

  const p1 = mapPlayer(p1raw);
  const p2 = mapPlayer(p2raw);

  document.getElementById("players").innerHTML = `
    <div class="card">
      <h2>${p1.username}</h2>
      <p>Level: ${p1.level}</p>
      <p>Rank: ${p1.rank} (${p1.mmr})</p>
      <p>K/D: ${p1.kd}</p>
      <p>Wins: ${p1.wins} | Losses: ${p1.losses}</p>
      <p>Kills: ${p1.kills} | Deaths: ${p1.deaths}</p>
      <p>Headshots: ${p1.headshots}</p>
    </div>

    <div class="card">
      <h2>${p2.username}</h2>
      <p>Level: ${p2.level}</p>
      <p>Rank: ${p2.rank} (${p2.mmr})</p>
      <p>K/D: ${p2.kd}</p>
      <p>Wins: ${p2.wins} | Losses: ${p2.losses}</p>
      <p>Kills: ${p2.kills} | Deaths: ${p2.deaths}</p>
      <p>Headshots: ${p2.headshots}</p>
    </div>
  `;
}

loadStats();
setInterval(loadStats, 10000);
