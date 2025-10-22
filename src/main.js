// ============================================================
//   BREACHER BROS — 3D FPS BROWSERGAME (VOLLSTÄNDIG)
//   main.js mit echten Modulen, PointerLock nach Start, HUD,
//   Gegner, Abilities, Projektile, Map, Audio, LevelSystem
// ============================================================

// ==========================
// IMPORTS
// ==========================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/PointerLockControls.js';

import { Weapon } from './weapons.js';
import { Enemy } from './enemy.js';
import { EnemyAI } from './enemyAI.js';
import { Ability } from './abilities.js';
import { Map } from './map.js';
import { AudioManager } from './audio.js';
import { LevelManager } from './levels.js';
import { HUD } from './hud.js';
import { Projectile } from './physics.js';

// ==========================
// 1. Klassen-Definitionen + UI-Referenzen
// ==========================
const classes = {
  "Stürmer":     { health: 120, speed: 1.2, ammo: 30, reloadTime: 1.5, ability: "Granate" },
  "Verteidiger": { health: 180, speed: 0.9, ammo: 40, reloadTime: 2.0, ability: "Schild" },
  "Sanitäter":   { health: 150, speed: 1.0, ammo: 25, reloadTime: 1.2, ability: "Heilung" },
  "Techniker":   { health: 130, speed: 1.1, ammo: 35, reloadTime: 1.6, ability: "Turret" },
  "Späher":      { health: 100, speed: 1.4, ammo: 20, reloadTime: 1.0, ability: "Tarnung" }
};

let selectedClass = null;
let player = {};

// HTML-Elemente
const menu       = document.getElementById('menu');
const briefing   = document.getElementById('briefing');
const classBtns  = document.querySelectorAll('.class-btn');
const hud        = document.getElementById('hud');
const healthEl   = document.getElementById('health');
const ammoEl     = document.getElementById('ammo');
const abilityEl  = document.getElementById('ability');
const levelEl    = document.getElementById('level');

// ==========================
// 2. PointerLock (erst nach Spielstart)
// ==========================
let controls;
function initPointerLock(){
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    document.body.addEventListener('click', ()=>{
        if(!menuVisible()) controls.lock();
    });

    controls.addEventListener('lock', ()=>{ console.log("PointerLock aktiviert"); });
    controls.addEventListener('unlock', ()=>{ console.log("PointerLock deaktiviert"); });
}

function menuVisible(){ return menu.style.display!=='none' || briefing.style.display!=='none'; }

// ==========================
// 3. Klassenauswahl Buttons
// ==========================
classBtns.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
        selectedClass = btn.dataset.class;
        const cls = classes[selectedClass];

        menu.style.display = 'none';
        briefing.style.display = 'block';
        briefing.innerHTML = `
          <h2>${selectedClass}</h2>
          <p><strong>Fähigkeit:</strong> ${cls.ability}</p>
          <p><strong>Gesundheit:</strong> ${cls.health}</p>
          <p><strong>Tempo:</strong> ${cls.speed}</p>
          <p><strong>Munition:</strong> ${cls.ammo}</p>
          <button id="startGame">Los geht’s!</button>
        `;

        document.getElementById('startGame').addEventListener('click', (ev)=>{
            ev.stopPropagation();
            startGame(selectedClass);
            initPointerLock();
        });
    });
});

// ==========================
// 4. Variablen für Spieler, Gegner, Level
// ==========================
let scene, camera, renderer, floor;
let move = { forward:false, backward:false, left:false, right:false };
let prevTime = performance.now();
let projectiles = [];
let enemies = [];
let levelManager;
let gameMap;
let audioManager;

// ==========================
// 5. Spielstart
// ==========================
function startGame(clsName){
    const cls = classes[clsName];
    player = {
        ...cls,
        position: new THREE.Vector3(0,2,0),
        velocity: new THREE.Vector3(),
        canJump:false,
        weapon:null,
        abilityObj:null,
        mesh:null
    };

    briefing.style.display = 'none';
    hud.style.display = 'block';

    initScene();
    initPlayer();
    animate();
}

// ==========================
// 6. Szene + Renderer + Licht
// ==========================
function initScene(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight,0.1,1000);
    camera.position.set(0,2,5);

    const ambientLight = new THREE.AmbientLight(0xffffff,0.3);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff,1);
    dirLight.position.set(10,20,10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer({canvas:document.getElementById('gameCanvas'),antialias:true});
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.shadowMap.enabled = true;

    window.addEventListener('resize',onWindowResize);

    const geometry = new THREE.PlaneGeometry(50,50);
    const material = new THREE.MeshPhongMaterial({color:0x333333});
    floor = new THREE.Mesh(geometry,material);
    floor.rotation.x=-Math.PI/2;
    floor.receiveShadow=true;
    scene.add(floor);
}

// ==========================
// 7. Player + Map + Gegner Initialisierung
// ==========================
function initPlayer(){
    gameMap = new Map(scene);

    player.mesh = new THREE.Mesh(new THREE.BoxGeometry(1,2,1), new THREE.MeshPhongMaterial({color:0x00aaff}));
    player.mesh.position.copy(player.position);
    player.mesh.castShadow = true;
    scene.add(player.mesh);

    player.weapon = new Weapon(player,scene,{ammo:ammoEl});
    player.abilityObj = new Ability(player,scene);

    audioManager = new AudioManager(new THREE.AudioListener());
    audioManager.load('shoot','./assets/sounds/shoot.wav');

    levelManager = new LevelManager(scene,gameMap,player);
    levelManager.startLevel();

    enemies = levelManager.enemies;
}

// ==========================
// 8. Player Bewegung
// ==========================
function playerMovement(delta){
    const speed = 5 * player.speed;
    const direction = new THREE.Vector3();
    direction.z = Number(move.backward)-Number(move.forward);
    direction.x = Number(move.right)-Number(move.left);
    direction.normalize();

    if(move.forward || move.backward) player.velocity.z -= direction.z*speed*delta;
    if(move.left || move.right) player.velocity.x -= direction.x*speed*delta;

    // Gravitation
    player.velocity.y -= 9.8*10*delta;

    controls.moveRight(-player.velocity.x*delta);
    controls.moveForward(-player.velocity.z*delta);
    controls.getObject().position.y += player.velocity.y*delta;

    if(controls.getObject().position.y<2){
        player.velocity.y=0;
        controls.getObject().position.y=2;
        player.canJump=true;
    }

    // Spieler-Mesh synchronisieren
    player.mesh.position.copy(controls.getObject().position);
}

// ==========================
// 9. Animate Loop
// ==========================
function animate(){
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time-prevTime)/1000;
    prevTime = time;

    if(controls?.isLocked && !menuVisible()){
        playerMovement(delta);

        // Gegner AI
        enemies.forEach(e=>{
            const ai = new EnemyAI(e,gameMap,player);
            ai.update(delta);
        });

        // Projektile Update
        projectiles.forEach(p=>p.update?.(delta,enemies));

        // Ability Cooldown
        player.abilityObj.updateCooldown(delta);
    }

    updateHUD();
    renderer.render(scene,camera);
}

// ==========================
// 10. HUD Update
// ==========================
function updateHUD(){
    if(!player) return;
    healthEl.innerText = `Leben: ${Math.max(player.health,0)}`;
    ammoEl.innerText = player.weapon?.reloading ? "Nachladen..." : `Munition: ${player.weapon?.ammo}/${player.weapon?.maxAmmo}`;
    abilityEl.innerText = `Fähigkeit: ${player.ability} (${Math.max(player.abilityObj?.cooldown.toFixed(1),0)}s)`;
    levelEl.innerText = `Level: ${levelManager?.level}`;
}

// ==========================
// 11. Fenstergröße ändern
// ==========================
function onWindowResize(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
}

// ==========================
// 12. Tastatur Events
// ==========================
document.addEventListener('keydown', e=>{
    switch(e.code){
        case 'KeyW': move.forward=true; break;
        case 'KeyA': move.left=true; break;
        case 'KeyS': move.backward=true; break;
        case 'KeyD': move.right=true; break;
        case 'Space': if(player.canJump){player.velocity.y+=5;player.canJump=false;} break;
        case 'KeyR': player.weapon.reload(); break;
        case 'KeyF': player.abilityObj.use(enemies); break;
    }
});
document.addEventListener('keyup', e=>{
    switch(e.code){
        case 'KeyW': move.forward=false; break;
        case 'KeyA': move.left=false; break;
        case 'KeyS': move.backward=false; break;
        case 'KeyD': move.right=false; break;
    }
});

// ==========================
// 13. Maus Events
// ==========================
document.addEventListener('mousedown', e=>{
    if(controls?.isLocked && e.button===0) {
        player.weapon.shoot(enemies);
        audioManager.play('shoot');
    }
});

// ==========================
// 14. Start Hinweis
// ==========================
console.log("Breacher Bros FPS ready! Wähle zuerst eine Klasse im Menü.");

// ==========================
// 15. Zusatz Funktionen / Explosionen / Treffereffekte
// ==========================
function createExplosion(scene, position){
    const particles = new THREE.BufferGeometry();
    const count = 50;
    const positions=[];
    for(let i=0;i<count;i++) positions.push(position.x,position.y,position.z);
    particles.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    const material = new THREE.PointsMaterial({color:0xffaa00,size:0.2});
    const points = new THREE.Points(particles, material);
    scene.add(points);
    let frame=0;
    const interval = setInterval(()=>{
        const posAttr = points.geometry.attributes.position.array;
        for(let i=0;i<posAttr.length;i+=3){
            posAttr[i]+=(Math.random()-0.5)*0.5;
            posAttr[i+1]+=(Math.random()-0.5)*0.5;
            posAttr[i+2]+=(Math.random()-0.5)*0.5;
        }
        points.geometry.attributes.position.needsUpdate=true;
        frame++;
        if(frame>20){scene.remove(points); clearInterval(interval);}
    },16);
}

// ============================================================
// END OF main.js
// ============================================================
