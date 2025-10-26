import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';


export class Ability {
    constructor(player, scene) {
        this.player = player;
        this.scene = scene;
        this.active = false;
        this.cooldown = 0;
    }

    use(enemies) {
        if(this.active || this.cooldown > 0) return;

        switch(this.player.ability){
            case "Granate":
                this.throwGrenade(enemies);
                break;
            case "Schild":
                this.activateShield();
                break;
            case "Turret":
                this.deployTurret(enemies);
                break;
            case "Tarnung":
                this.activateStealth();
                break;
            case "Heilung":
                this.healPlayer();
                break;
        }
        this.cooldown = 10; // 10 Sekunden Abklingzeit
    }

    throwGrenade(enemies){
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5,8,8),
            new THREE.MeshBasicMaterial({color:0xffff00})
        );
        sphere.position.copy(this.player.position);
        this.scene.add(sphere);
        // Explosion nach 1s
        setTimeout(()=>{
            enemies.forEach(e=>{
                const dist = e.mesh.position.distanceTo(this.player.position);
                if(dist<10) e.health -= 80;
            });
            this.scene.remove(sphere);
        },1000);
    }

    activateShield(){
        this.active = true;
        // visuelles Schild
        const shield = new THREE.Mesh(
            new THREE.SphereGeometry(2,16,16),
            new THREE.MeshBasicMaterial({color:0x00ffff, transparent:true, opacity:0.3})
        );
        shield.position.copy(this.player.position);
        this.scene.add(shield);
        setTimeout(()=>{
            this.scene.remove(shield);
            this.active = false;
        },5000);
    }

    deployTurret(enemies){
        const turret = new THREE.Mesh(
            new THREE.BoxGeometry(1,1,1),
            new THREE.MeshBasicMaterial({color:0x00ff00})
        );
        turret.position.copy(this.player.position);
        this.scene.add(turret);
        // Schießt alle Gegner in Reichweite
        const interval = setInterval(()=>{
            enemies.forEach(e=>{
                if(e.mesh.position.distanceTo(turret.position)<15) e.health -= 20;
            });
        },500);
        setTimeout(()=>{
            clearInterval(interval);
            this.scene.remove(turret);
        },8000);
    }

    activateStealth(){
        this.active = true;
        // Spieler unsichtbar
        this.player.mesh.visible = false;
        setTimeout(()=>{
            this.player.mesh.visible = true;
            this.active = false;
        },5000);
    }

    healPlayer(){
        this.player.health = Math.min(this.player.health+50,this.player.maxHealth);
    }

    updateCooldown(delta){
        if(this.cooldown>0) this.cooldown -= delta;
    }
}
