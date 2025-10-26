import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';


export function updateHUD(player, hud, level) {
    hud.health.innerText = `Leben: ${Math.max(player.health,0)}`;
    hud.ability.innerText = `Fähigkeit: ${player.ability}`;
    hud.level.innerText = `Level: ${level}`;
}
