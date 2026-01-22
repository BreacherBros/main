console.log("STATS.JS GELADEN ✅");

const root = document.getElementById("players");

if (!root) {
  console.error("❌ #players nicht gefunden");
} else {
  root.innerHTML = `
    <div class="card">
      <h2>Pater_Odor</h2>
      <p>K/D: 1.34</p>
      <p>Rank: Emerald</p>
    </div>

    <div class="card">
      <h2>SomaRay_Jr</h2>
      <p>K/D: 1.12</p>
      <p>Rank: Platinum</p>
    </div>
  `;
}
