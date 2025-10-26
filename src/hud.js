import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';


export class HUD {
    constructor(healthEl, ammoEl, abilityEl, levelEl) {
        this.healthEl = healthEl;
        this.ammoEl = ammoEl;
        this.abilityEl = abilityEl;
        this.levelEl = levelEl;
    }

    update(player, levelManager) {
        this.healthEl.innerText = `Leben: ${Math.max(player.health, 0)}`;
        this.ammoEl.innerText = player.weapon?.reloading ? "Nachladen..." : `Munition: ${player.weapon?.ammo}/${player.weapon?.maxAmmo}`;
        this.abilityEl.innerText = `Fähigkeit: ${player.ability} (${Math.max(player.abilityObj?.cooldown.toFixed(1), 0)}s)`;
        this.levelEl.innerText = `Level: ${levelManager?.level}`;
    }
}

