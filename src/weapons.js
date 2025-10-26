import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';


export class Weapon {
    constructor(player, scene, hud) {
        this.player = player;
        this.scene = scene;
        this.hud = hud;

        this.ammo = player.ammo;
        this.maxAmmo = player.ammo;
        this.reloading = false;
        this.reloadTime = player.reloadTime;

        // Raycaster für Treffer
        this.raycaster = new THREE.Raycaster();
        this.direction = new THREE.Vector3();
    }

    shoot(enemies) {
        if (this.reloading || this.ammo <= 0) return;

        this.ammo--;
        this.updateHUD();

        // Strahl vom Spieler in Blickrichtung
        const origin = this.player.position.clone();
        this.direction.set(0, 0, -1).applyQuaternion(this.player.quaternion);
        this.raycaster.set(origin, this.direction);

        const enemyMeshes = enemies.map(e => e.mesh);
        const hits = this.raycaster.intersectObjects(enemyMeshes);

        if (hits.length > 0) {
            const hit = hits[0].object;
            const enemy = enemies.find(e => e.mesh === hit);
            if (enemy) {
                enemy.health -= 50; // einfacher Schaden
                hit.material.color.set(0xffff00); // Treffer visuell
                setTimeout(() => { if(hit.material) hit.material.color.set(0xff0000); }, 100);

                if (enemy.health <= 0) {
                    this.scene.remove(enemy.mesh);
                    enemies.splice(enemies.indexOf(enemy), 1);
                }
            }
        }
    }

    reload() {
        if (this.reloading || this.ammo === this.maxAmmo) return;
        this.reloading = true;
        this.updateHUD();
        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.reloading = false;
            this.updateHUD();
        }, this.reloadTime * 1000);
    }

    updateHUD() {
        this.hud.ammo.innerText = this.reloading
            ? 'Nachladen...'
            : `Munition: ${this.ammo}/${this.maxAmmo}`;
    }
}
