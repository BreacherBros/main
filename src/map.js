import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

export class Map {
    constructor(scene) {
        this.scene = scene;
        this.walls = [];
        this.cover = [];
        this.generate();
    }

    generate() {
        // Boden
        const floorGeo = new THREE.PlaneGeometry(200, 200);
        const floorMat = new THREE.MeshPhongMaterial({color:0x222222});
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI/2;
        this.scene.add(floor);

        // Wände
        const wallGeo = new THREE.BoxGeometry(10,5,1);
        const wallMat = new THREE.MeshPhongMaterial({color:0x555555});
        for(let i=0;i<15;i++){
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set((Math.random()-0.5)*100,2.5,(Math.random()-0.5)*100);
            this.scene.add(wall);
            this.walls.push(wall);
        }

        // Deckungen (niedriger)
        const coverGeo = new THREE.BoxGeometry(3,2,3);
        const coverMat = new THREE.MeshPhongMaterial({color:0x888888});
        for(let i=0;i<20;i++){
            const cov = new THREE.Mesh(coverGeo, coverMat);
            cov.position.set((Math.random()-0.5)*100,1,(Math.random()-0.5)*100);
            this.scene.add(cov);
            this.cover.push(cov);
        }
    }
}
