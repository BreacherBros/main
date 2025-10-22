// ============================================================
//   BREACHER BROS — 3D FPS BROWSERGAME (TEIL 1)
//   Grundgerüst : Szene + Menü + Kamera + Steuerung
//   Überarbeitet: Klassenauswahl funktioniert
// ============================================================

// Importiere Three.js & PointerLock
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/PointerLockControls.js';

// ============================================================
//   1  Klassen-Definitionen + UI-Referenzen
// ============================================================
const classes = {
  "Stürmer":    { health: 120, speed: 1.2, ammo: 30, reloadTime: 1.5, ability: "Granate" },
  "Verteidiger":{ health: 180, speed: 0.9, ammo: 40, reloadTime: 2.0, ability: "Schild" },
  "Sanitäter":  { health: 150, speed: 1.0, ammo: 25, reloadTime: 1.2, ability: "Heilung" },
  "Techniker":  { health: 130, speed: 1.1, ammo: 35, reloadTime: 1.6, ability: "Turret" },
  "Späher":     { health: 100, speed: 1.4, ammo: 20, reloadTime: 1.0, ability: "Tarnung" }
};

let selectedClass = null;
let player = {};
let scene, camera, renderer, controls, floor;
let prevTime = performance.now();
const move = { forward: false, backward: false, left: false, right: false };
let enemies = [];
let enemyAIs = [];
const projectiles = [];

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
// PointerLock erst nach Start
// ==========================
function initPointerLock() {
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    // PointerLock erst beim Spielstart
    document.body.addEventListener('click', () => {
        if(!menuVisible()) controls.lock();
    });

    // Event: lock/unlock
    controls.addEventListener('lock', () => {
        console.log("PointerLock aktiviert");
    });
    controls.addEventListener('unlock', () => {
        console.log("PointerLock deaktiviert");
    });
}

// ==========================
// Helper: Menü sichtbar?
// ==========================
function menuVisible() {
    return menu.style.display !== 'none' || briefing.style.display !== 'none';
}

// ==========================
// Update animate-Loop
// ==========================
function animate(){
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time-prevTime)/1000;
    prevTime = time;

    // Nur bewegen wenn PointerLock aktiv und Menü weg
    if(controls?.isLocked && !menuVisible()){
        playerMovement(delta);

        // Gegner AI
        enemyAIs.forEach(ai=>ai.update(delta));

        // Projektile
        projectiles.forEach(p=>p.update(delta, enemies));
    }

    updateHUD();
    renderer.render(scene,camera);
}

// ==========================
// Menü-Klicks funktionieren jetzt
// ==========================

// Klassenauswahl Buttons
classBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // verhindert, dass PointerLock klick blockiert
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

        const startBtn = document.getElementById('startGame');
        startBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            startGame(selectedClass);
            initPointerLock(); // PointerLock erst jetzt aktivieren
        });
    });
});

// ============================================================
//   2  Menülogik – Klassenwahl & Briefing
// ============================================================

classBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedClass = btn.dataset.class;
    const cls = classes[selectedClass];

    // Menü ausblenden, Briefing zeigen
    menu.style.display = 'none';
    briefing.style.display = 'block';

    // Briefing-Inhalt
    briefing.innerHTML = `
      <h2>${selectedClass}</h2>
      <p><strong>Fähigkeit:</strong> ${cls.ability}</p>
      <p><strong>Gesundheit:</strong> ${cls.health}</p>
      <p><strong>Tempo:</strong> ${cls.speed}</p>
      <p><strong>Munition:</strong> ${cls.ammo}</p>
      <button id="startGame">Los geht’s!</button>
    `;

    // Start-Button korrekt aktivieren
    const startBtn = document.getElementById('startGame');
    startBtn.addEventListener('click', () => startGame(selectedClass));
  });
});

// ============================================================
//   3  Spielstart
// ============================================================

function startGame(clsName) {
  const cls = classes[clsName];
  player = {
    ...cls,
    position: new THREE.Vector3(0, 2, 0),
    velocity: new THREE.Vector3(),
    canJump: false
  };

  briefing.style.display = 'none';
  hud.style.display = 'block';

  initScene();
  spawnEnemies(1); // Level 1 initial
  initEnemyAIs();
  animate();
}

// ============================================================
//   4  Imports externer Module
// ============================================================
import { Weapon } from './weapons.js';
import { Enemy } from './enemy.js';
import { HUD } from './hud.js';
import { Map } from './map.js';
import { Ability } from './abilities.js';
import { Projectile } from './physics.js';
import { EnemyAI } from './enemyAI.js';
import { AudioManager } from './audio.js';

// ============================================================
//   5  HUD Update Funktion
// ============================================================
function updateHUD(){
    if(!player.weapon) return;
    healthEl.innerText = `Leben: ${Math.max(player.health,0)}`;
    ammoEl.innerText = player.weapon.reloading
        ? "Nachladen..."
        : `Munition: ${player.weapon.ammo}/${player.weapon.maxAmmo}`;
    abilityEl.innerText = `Fähigkeit: ${player.ability} (${Math.max(player.abilityObj?.cooldown?.toFixed(1)||0,0)}s)`;
    levelEl.innerText = `Level: ${levelManager?.level || 1}`;
}

// ============================================================
//   6  Gegner-Funktionen
// ============================================================

function removeEnemy(enemy){
    const mesh = enemy.mesh;
    const tween = { y: mesh.position.y };
    const interval = setInterval(()=>{
        tween.y -= 0.1;
        mesh.position.y = tween.y;
        if(mesh.position.y < 0){
            clearInterval(interval);
            scene.remove(mesh);
        }
    },16);
}

// ============================================================
//   7  Map & Level-Manager
// ============================================================

const gameMap = new Map(scene);

class LevelManagerClass{
    constructor(scene, map, player){
        this.scene = scene;
        this.map = map;
        this.player = player;
        this.enemies = [];
        this.level = 1;
    }
    startLevel(){
        this.enemies = [];
        spawnEnemies(this.level);
        initEnemyAIs();
    }
    nextLevel(){
        this.level++;
        this.startLevel();
    }
}
const levelManager = new LevelManagerClass(scene, gameMap, player);

// ============================================================
//   8  Gegner und AIs initialisieren
// ============================================================

function spawnEnemies(level){
    enemies.forEach(e => scene.remove(e.mesh));
    enemies = [];
    const count = level*3;
    for(let i=0;i<count;i++){
        const pos = new THREE.Vector3((Math.random()-0.5)*50,1,(Math.random()-0.5)*50);
        const enemy = new Enemy(scene, pos);
        enemies.push(enemy);
    }
}

function initEnemyAIs(){
    enemyAIs = enemies.map(e => new EnemyAI(e, gameMap, player));
}

// ============================================================
//   9  Spieler-Setup
// ============================================================

player.mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1,2,1),
    new THREE.MeshBasicMaterial({color:0x00aaff})
);
player.mesh.position.copy(player.position);
scene?.add(player.mesh);

player.abilityObj = new Ability(player, scene);
player.weapon = new Weapon(player, scene, { ammo: ammoEl });

// ============================================================
//   10 Three.js Grundszene
// ============================================================

function initScene(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,2,5);

    // Licht
    const ambient = new THREE.AmbientLight(0xffffff,0.3);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff,0.8);
    dirLight.position.set(50,100,50);
    scene.add(dirLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({canvas: document.getElementById('gameCanvas'), antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Controls
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());
    document.body.addEventListener('click',()=>{controls.lock();});

    // Boden
    const floorGeo = new THREE.PlaneGeometry(200,200);
    const floorMat = new THREE.MeshPhongMaterial({color:0x333333});
    floor = new THREE.Mesh(floorGeo,floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Fenstergröße
    window.addEventListener('resize', onWindowResize);

    // Bewegung
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

// ============================================================
//   11  Player Movement
// ============================================================

function playerMovement(delta){
    const speed = 400*player.speed;
    const dir = new THREE.Vector3();
    dir.z = Number(move.backward)-Number(move.forward);
    dir.x = Number(move.right)-Number(move.left);
    dir.normalize();

    if(move.forward||move.backward) player.velocity.z -= dir.z*speed*delta;
    if(move.left||move.right) player.velocity.x -= dir.x*speed*delta;

    player.velocity.y -= 9.8*10*delta; // Gravitation

    controls.moveRight(-player.velocity.x*delta);
    controls.moveForward(-player.velocity.z*delta);
    controls.getObject().position.y += player.velocity.y*delta;

    if(controls.getObject().position.y<2){
        player.velocity.y=0;
        controls.getObject().position.y=2;
        player.canJump=true;
    }
}

// ============================================================
//   12 Key Events
// ============================================================
function onKeyDown(e){
    switch(e.code){
        case 'KeyW': move.forward=true; break;
        case 'KeyA': move.left=true; break;
        case 'KeyS': move.backward=true; break;
        case 'KeyD': move.right=true; break;
        case 'Space':
            if(player.canJump) player.velocity.y+=5;
            player.canJump=false;
            break;
        case 'KeyR': player.weapon.reload(); break;
        case 'KeyF': player.abilityObj.use(enemies); break;
    }
}

function onKeyUp(e){
    switch(e.code){
        case 'KeyW': move.forward=false; break;
        case 'KeyA': move.left=false; break;
        case 'KeyS': move.backward=false; break;
        case 'KeyD': move.right=false; break;
    }
}

// ============================================================
//   13  Animate Loop
// ============================================================

function animate(){
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time-prevTime)/1000;
    prevTime = time;

    if(controls.isLocked){
        playerMovement(delta);

        // Gegner AI
        enemyAIs.forEach(ai=>ai.update(delta));

        // Projektile
        projectiles.forEach(p=>p.update(delta, enemies));
    }

    updateHUD();

    renderer.render(scene,camera);
}

// ============================================================
//   14  Fenstergröße
// ============================================================
function onWindowResize(){
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
}
