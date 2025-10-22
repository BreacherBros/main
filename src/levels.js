import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { Enemy } from './enemy.js';

export class LevelManager {
    constructor(scene, map, player) {
        this.scene = scene;
        this.map = map;
        this.player = player;
        this.level = 1;
        this.enemies = [];
        this.maxLevels = 20;
    }

    startLevel() {
        // Entferne alte Gegner
        this.enemies.forEach(e=>this.scene.remove(e.mesh));
        this.enemies = [];

        if(this.level>this.maxLevels){
            alert("Alle Level abgeschlossen! Du hast gewonnen!");
            window.location.reload();
            return;
        }

        // Gegner spawnen
        const count = this.level * 3;
        for(let i=0;i<count;i++){
            const pos = new THREE.Vector3(
                (Math.random()-0.5)*50,
                1,
                (Math.random()-0.5)*50
            );
            this.enemies.push(new Enemy(this.scene, pos));
        }
    }

    nextLevel() {
        this.level++;
        this.startLevel();
    }
}
