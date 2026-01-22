import { players } from "./r6data.js";

const app = document.getElementById("app");
const status = document.getElementById("status");

function random(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function generateDemoStats() {
  return {
    level: Math.floor(random(120, 260)),
    kd: random(0.9, 1.6),
    wl: random(0.8, 1.4),
    kills: Math.floor(random(20000, 90000)),
    matches: Math.floor(random(3000, 9000))
  };
}

function render() {
  app.innerHTML = "";

  players.forEach(player => {
    const stats = generateDemoStats();

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h2>${player.name}</h2>
      <div class="stat"><span>Level</span><span>${stats.level}</span></div>
      <div class="stat"><span>K/D</span><span>${stats.kd}</span></div>
      <div class="stat"><span>W/L</span><span>${stats.wl}</span></div>
      <div class="stat"><span>Kills</span><span>${stats.kills}</span></div>
      <div class="stat"><span>Matches</span><span>${stats.matches}</span></div>
    `;

    app.appendChild(card);
  });

  status.textContent = "Letztes Update: " + new Date().toLocaleTimeString();
}

render();
setInterval(render, 10000); // ⏱️ 10 Sekunden
