const API_KEY = import.meta.env.VITE_R6DATA_API_KEY;
const BASE_URL = "https://api.r6data.eu";

async function fetchPlayer(name) {
  const res = await fetch(
    `${BASE_URL}/player?platform=psn&username=${name}`,
    {
      headers: {
        "Authorization": API_KEY
      }
    }
  );

  if (!res.ok) {
    throw new Error("API Fehler");
  }

  return res.json();
}

export async function fetchPlayers() {
  const players = await Promise.all([
    fetchPlayer("Pater_Odor"),
    fetchPlayer("SomaRay_Jr")
  ]);

  return players.map((p, idx) => ({
    id: p.player_id,
    name: p.username,
    kd: p.stats.kd,
    level: p.level,
    matches: p.stats.matches,
    wins: p.stats.wins,
    accent: idx === 0 ? "cyan" : "orange"
  }));
}
