const players = [
  { name: "Pater_Odor", kd: 1.34, rank: "Emerald" },
  { name: "SomaRay_Jr", kd: 1.12, rank: "Platinum" }
];

function render() {
  const root = document.getElementById("players");
  root.innerHTML = "";

  players.forEach(p => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h2>${p.name}</h2>
      <p>K/D: ${p.kd}</p>
      <p>Rank: ${p.rank}</p>
    `;
    root.appendChild(div);
  });
}

render();

// Auto-Refresh (alle 10 Sekunden)
setInterval(render, 10000);
