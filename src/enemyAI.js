import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';


export class EnemyAI {
    constructor(enemy, map, player) {
        this.enemy = enemy;
        this.map = map;
        this.player = player;
        this.speed = 2.5;
        this.attackRange = 2.0;
    }

    update(delta) {
        if (!this.enemy || !this.enemy.body || !this.enemy.mesh) return;
        if (!this.player || !this.player.body) return;

        const enemyPos = this.enemy.body.position;
        const playerPos = this.player.body.position;

        if (!enemyPos || !playerPos) return;

        // Richtung zum Spieler berechnen
        const direction = new THREE.Vector3(
            playerPos.x - enemyPos.x,
            playerPos.y - enemyPos.y,
            playerPos.z - enemyPos.z
        );

        const distance = direction.length();

        if (distance > this.attackRange) {
            direction.normalize();
            this.enemy.body.velocity.x = direction.x * this.speed;
            this.enemy.body.velocity.z = direction.z * this.speed;
        } else {
            // im Nahkampf oder stoppen
            this.enemy.body.velocity.x = 0;
            this.enemy.body.velocity.z = 0;
        }

        // Optional: Gegner drehen, damit er "schaut"
        if (distance > 0) {
            const quaternion = new THREE.Quaternion();
            quaternion.setFromRotationMatrix(
                new THREE.Matrix4().lookAt(
                    new THREE.Vector3(enemyPos.x, enemyPos.y, enemyPos.z),
                    new THREE.Vector3(playerPos.x, enemyPos.y, playerPos.z),
                    new THREE.Vector3(0,1,0)
                )
            );
            this.enemy.mesh.quaternion.copy(quaternion);
        }
    }
}

