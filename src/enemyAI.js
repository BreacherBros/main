import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

export class EnemyAI {
    constructor(enemy, map, player) {
        this.enemy = enemy;
        this.map = map;
        this.player = player;
        this.state = "seek"; // "seek" | "cover" | "attack"
        this.targetCover = null;
        this.attackCooldown = 0;
    }

    update(delta) {
        const playerPos = this.player.position;
        const dir = new THREE.Vector3().subVectors(playerPos, this.enemy.mesh.position);
        const dist = dir.length();

        // Attack oder Cover
        if(dist < 10){
            if(Math.random()<0.3){
                this.state = "cover";
                this.targetCover = this.findNearestCover();
            }else{
                this.state = "attack";
            }
        }else{
            this.state = "seek";
        }

        switch(this.state){
            case "seek":
                dir.normalize();
                this.enemy.mesh.position.add(dir.multiplyScalar(2*delta));
                break;
            case "cover":
                if(this.targetCover){
                    const coverDir = new THREE.Vector3().subVectors(this.targetCover.position,this.enemy.mesh.position);
                    if(coverDir.length()>0.5){
                        coverDir.normalize();
                        this.enemy.mesh.position.add(coverDir.multiplyScalar(2*delta));
                    }
                }
                break;
            case "attack":
                if(this.attackCooldown <= 0){
                    this.player.health -= 5; // Schaden
                    this.attackCooldown = 2;
                }
                break;
        }

        if(this.attackCooldown>0) this.attackCooldown -= delta;
    }

    findNearestCover(){
        let nearest = null;
        let minDist = Infinity;
        this.map.cover.forEach(c=>{
            const d = this.enemy.mesh.position.distanceTo(c.position);
            if(d<minDist){ nearest = c; minDist=d; }
        });
        return nearest;
    }
}
