const PROXY = "https://r6-proxy.breacherbros.workers.dev/";

async function fetchPlayer(platform, name) {
  const target = `https://r6.tracker.network/profile/${platform}/${encodeURIComponent(name)}`;
  const res = await fetch(`${PROXY}?url=${encodeURIComponent(target)}`);
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const get = (label) => {
    const el = [...doc.querySelectorAll("*")].find(e => e.textContent.trim().startsWith(label));
    if (!el) return "N/A";
    return el.textContent.replace(label, "").trim();
  };

  return {
    username: doc.querySelector("h1")?.innerText || name,
    level: get("Level"),
    rank: get("Rank"),
    kd: get("K/D"),
    wins: get("Wins"),
    losses: get("Losses"),
    kills: get("Kills"),
    deaths: get("Deaths"),
    headshots: get("Headshots")
  };
}

async function loadStats() {
  const p1 = await fetchPlayer("psn", "Pater_Odor");
  const p2 = await fetchPlayer("psn", "SomaRay_Jr");

  document.getElementById("players").innerHTML = `
    <div class="card">
      <h2>${p1.username}</h2>
      <p>Level: ${p1.level}</p>
      <p>Rank: ${p1.rank}</p>
      <p>K/D: ${p1.kd}</p>
      <p>Wins: ${p1.wins} | Losses: ${p1.losses}</p>
      <p>Kills: ${p1.kills} | Deaths: ${p1.deaths}</p>
      <p>Headshots: ${p1.headshots}</p>
    </div>

    <div class="card">
      <h2>${p2.username}</h2>
      <p>Level: ${p2.level}</p>
      <p>Rank: ${p2.rank}</p>
      <p>K/D: ${p2.kd}</p>
      <p>Wins: ${p2.wins} | Losses: ${p2.losses}</p>
      <p>Kills: ${p2.kills} | Deaths: ${p2.deaths}</p>
      <p>Headshots: ${p2.headshots}</p>
    </div>
  `;
}

loadStats();
setInterval(loadStats, 10000);
