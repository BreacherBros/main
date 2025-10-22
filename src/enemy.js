import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

export class Enemy {
    constructor(scene, position) {
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshPhongMaterial({ color: 0xff0000 })
        );
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        this.health = 100;
        this.attackCooldown = 0;
    }

    update(player, delta) {
        // Richtung zum Spieler
        const dir = new THREE.Vector3().subVectors(player.position, this.mesh.position);
        const dist = dir.length();

        if(dist > 1){
            dir.normalize();
            this.mesh.position.add(dir.multiplyScalar(1.5 * delta));
        }

        // Angriff
        if(dist < 2 && this.attackCooldown <= 0){
            player.health -= 10;
            this.attackCooldown = 2; // 2 Sekunden Abklingzeit
        }

        if(this.attackCooldown > 0) this.attackCooldown -= delta;
    }
}
