import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

export class Projectile {
    constructor(scene, origin, direction, speed = 50, damage = 25) {
        this.scene = scene;
        this.speed = speed;
        this.damage = damage;

        // Mesh
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 6, 6),
            new THREE.MeshBasicMaterial({color:0xffaa00})
        );
        this.mesh.position.copy(origin);
        scene.add(this.mesh);

        this.direction = direction.clone().normalize();
        this.alive = true;
    }

    update(delta, enemies) {
        if(!this.alive) return;

        this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed*delta));

        // Trefferabfrage
        enemies.forEach(enemy=>{
            const dist = enemy.mesh.position.distanceTo(this.mesh.position);
            if(dist < 1){
                enemy.health -= this.damage;
                this.alive = false;
                this.scene.remove(this.mesh);
            }
        });

        // Aus der Map entfernen
        if(this.mesh.position.y < 0 || this.mesh.position.length() > 200){
            this.alive = false;
            this.scene.remove(this.mesh);
        }
    }
}
