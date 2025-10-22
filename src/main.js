// ============================================================
// BREACHER BROS — 3D FPS BROWSERGAME
// main.js — funktionierende Version mit Klassenauswahl
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
// 1. Klassen + UI-Referenzen
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
// 2. Variablen
// ==========================
let scene, camera, renderer, floor;
let move = { forward:false, backward:false, left:false, right:false };
let prevTime = performance.now();
let projectiles = [];
let enemies = [];
let levelManager;
let gameMap;
let audioManager;
let controls;

// ==========================
// 3. Helper: Menü sichtbar?
// ==========================
function menuVisible(){ 
    return menu.style.display !== 'none' || briefing.style.display !== 'none'; 
}

// ==========================
// 4. PointerLock nach Start
// ==========================
function initPointerLock(){
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    document.body.addEventListener('click', ()=>{
        if(!menuVisible()) controls.lock();
    });

    controls.addEventListener('lock', ()=>console.log("PointerLock aktiviert"));
    controls.addEventListener('unlock', ()=>console.log("PointerLock deaktiviert"));
}

// ==========================
// 5. Klassenauswahl
// ==========================
classBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
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

        // Dynamischer Button Listener
        document.getElementById('startGame').addEventListener('click', ()=>{
            briefing.style.display = 'none';
            hud.style.display = 'block';
            startGame(selectedClass);
            initPointerLock();
        });
    });
});

// ==========================
// 6. Spielstart
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

    initScene();
    initPlayer();
    animate();
}

// ==========================
// 7. Szene + Renderer
// ==========================
function initScene(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
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

    window.addEventListener('resize', onWindowResize);

    // Boden
    const geometry = new THREE.PlaneGeometry(50,50);
    const material = new THREE.MeshPhongMaterial({color:0x333333});
    floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    scene.add(floor);
}

// ==========================
// 8. Spieler Initialisierung
// ==========================
function initPlayer(){
    gameMap = new Map(scene);

    player.mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,2,1),
        new THREE.MeshPhongMaterial({color:0x00aaff})
    );
    player.mesh.position.copy(player.position);
    player.mesh.castShadow = true;
    scene.add(player.mesh);

    player.weapon = new Weapon(player, scene, {ammo:ammoEl});
    player.abilityObj = new Ability(player, scene);

    audioManager = new AudioManager(new THREE.AudioListener());
    audioManager.load('shoot','./assets/sounds/shoot.wav');

    levelManager = new LevelManager(scene, gameMap, player);
    levelManager.startLevel();

    enemies = levelManager.enemies;
}

// ==========================
// 9. Bewegung
// ==========================
function playerMovement(delta){
    const speed = 5 * player.speed;
    const dir = new THREE.Vector3();
    dir.z = Number(move.backward)-Number(move.forward);
    dir.x = Number(move.right)-Number(move.left);
    dir.normalize();

    if(move.forward || move.backward) player.velocity.z -= dir.z*speed*delta;
    if(move.left || move.right) player.velocity.x -= dir.x*speed*delta;

    player.velocity.y -= 9.8*10*delta;

    controls.moveRight(-player.velocity.x*delta);
    controls.moveForward(-player.velocity.z*delta);
    controls.getObject().position.y += player.velocity.y*delta;

    if(controls.getObject().position.y<2){
        player.velocity.y = 0;
        controls.getObject().position.y = 2;
        player.canJump = true;
    }

    player.mesh.position.copy(controls.getObject().position);
}

// ==========================
// 10. Animate Loop
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
            const ai = new EnemyAI(e, gameMap, player);
            ai.update(delta);
        });

        // Projektile
        projectiles.forEach(p=>p.update?.(delta, enemies));

        // Ability
        player.abilityObj.updateCooldown(delta);
    }

    updateHUD();
    renderer.render(scene, camera);
}

// ==========================
// 11. HUD Update
// ==========================
function updateHUD(){
    if(!player) return;
    healthEl.innerText = `Leben: ${Math.max(player.health,0)}`;
    ammoEl.innerText = player.weapon?.reloading ? "Nachladen..." : `Munition: ${player.weapon?.ammo}/${player.weapon?.maxAmmo}`;
    abilityEl.innerText = `Fähigkeit: ${player.ability} (${Math.max(player.abilityObj?.cooldown.toFixed(1),0)}s)`;
    levelEl.innerText = `Level: ${levelManager?.level}`;
}

// ==========================
// 12. Fenstergröße
// ==========================
function onWindowResize(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================
// 13. Tastatur & Maus
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
document.addEventListener('mousedown', e=>{
    if(controls?.isLocked && e.button===0){
        player.weapon.shoot(enemies);
        audioManager.play('shoot');
    }
});

// ==========================
// 14. Start Hinweis
// ==========================
console.log("Breacher Bros FPS ready! Wähle zuerst eine Klasse im Menü.");
