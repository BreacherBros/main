// ============================================================
//   BREACHER BROS — 3D FPS BROWSERGAME (TEIL 1)
//   Grundgerüst : Szene + Menü + Kamera + Steuerung
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

// HTML-Elemente
const menu       = document.getElementById('menu');
const briefing   = document.getElementById('briefing');
const classBtns  = document.querySelectorAll('.class-btn');
const hud        = document.getElementById('hud');
const healthEl   = document.getElementById('health');
const ammoEl     = document.getElementById('ammo');
const abilityEl  = document.getElementById('ability');
const levelEl    = document.getElementById('level');

// ============================================================
//   2  Menülogik – Klassenwahl & Briefing
// ============================================================

// Klick-Event auf jede Klassen-Schaltfläche
classBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedClass = btn.dataset.class;
    const cls = classes[selectedClass];
    // Menü ausblenden, Briefing zeigen
    menu.style.display = 'none';
    briefing.style.display = 'block';
    // Briefing-Inhalt generieren
    briefing.innerHTML = `
      <h2>${selectedClass}</h2>
      <p><strong>Fähigkeit:</strong> ${cls.ability}</p>
      <p><strong>Gesundheit:</strong> ${cls.health}</p>
      <p><strong>Tempo:</strong> ${cls.speed}</p>
      <p><strong>Munition:</strong> ${cls.ammo}</p>
      <button id="startGame">Los geht’s !</button>
    `;
    // Start-Button aktivieren
    document.getElementById('startGame').addEventListener('click', () => {
      startGame(selectedClass);
    });
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

  initScene();     // Szene initialisieren
  animate();       // Rendering-Loop starten
}
import { Weapon } from './weapons.js';
import { Enemy } from './enemy.js';
import { HUD } from './hud.js';
import { Map } from './map.js';
import { Ability } from './abilities.js';
import { Projectile } from './physics.js';
import { EnemyAI } from './enemyAI.js';
import { AudioManager } from './audio.js';

// HUD Update Funktion erweitern
function updateHUD(){
    healthEl.innerText = `Leben: ${Math.max(player.health,0)}`;
    ammoEl.innerText = player.weapon.reloading
        ? "Nachladen..."
        : `Munition: ${player.weapon.ammo}/${player.weapon.maxAmmo}`;
    abilityEl.innerText = `Fähigkeit: ${player.ability} (${Math.max(player.abilityObj.cooldown.toFixed(1),0)}s)`;
    levelEl.innerText = `Level: ${levelManager.level}`;
}

// Animation: Gegner stirbt
function removeEnemy(enemy){
    const mesh = enemy.mesh;
    const tween = { y: mesh.position.y };
    const interval = setInterval(()=>{
        tween.y -= 0.1;
        mesh.position.y = tween.y;
        if(mesh.position.y<0){
            clearInterval(interval);
            scene.remove(mesh);
        }
    },16);
}

// LevelManager initialisieren
const levelManager = new LevelManager(scene, gameMap, player);
levelManager.startLevel();

// Gegner-KI für alle Gegner
let enemyAIs = levelManager.enemies.map(e=>new EnemyAI(e, gameMap, player));

// Im animate-Loop:
function animate(){
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time-prevTime)/1000;
    prevTime = time;

    if(controls.isLocked){
        playerMovement(delta);

        // Gegner-KI
        enemyAIs.forEach(ai=>ai.update(delta));

        // Projectiles
        projectiles.forEach(p=>p.update(delta, levelManager.enemies));

        // Prüfe ob alle Gegner tot
        if(levelManager.enemies.length===0){
            setTimeout(()=>levelManager.nextLevel(), 1000);
        }

        // HUD
        updateHUD();
    }

    renderer.render(scene, camera);
}

// Nach jedem Level
localStorage.setItem('breacherLevel', levelManager.level);

// Beim Start
const savedLevel = parseInt(localStorage.getItem('breacherLevel'));
if(savedLevel) levelManager.level = savedLevel;

const listener = new THREE.AudioListener();
camera.add(listener);
const audioManager = new AudioManager(listener);
audioManager.load('shoot', './assets/sounds/shoot.wav');

document.addEventListener('mousedown', e=>{
    if(controls.isLocked && e.button===0){
        player.weapon.shoot(enemies); // bestehendes Raycast
        audioManager.play('shoot');
        // Alternativ: echte Projektil-Objekte
        const dir = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
        projectiles.push(new Projectile(scene, player.position.clone(), dir));
    }
});

const projectiles = [];
const enemyAIs = enemies.map(e=>new EnemyAI(e, gameMap, player));

function animate(){
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time-prevTime)/1000;
    prevTime = time;

    if(controls.isLocked){
        playerMovement(delta);

        // Projektile
        projectiles.forEach(p=>p.update(delta, enemies));
        // Gegner-KI
        enemyAIs.forEach(ai=>ai.update(delta));
    }

    renderer.render(scene, camera);
}

// === Waffe initialisieren ===
player.weapon = new Weapon(player, scene, {ammo: ammoEl});

// === Gegnerliste initialisieren ===
let enemies = [];
function spawnEnemies(level){
    enemies.forEach(e => scene.remove(e.mesh));
    enemies = [];
    const count = level * 3;
    for(let i=0;i<count;i++){
        const pos = new THREE.Vector3((Math.random()-0.5)*50,1,(Math.random()-0.5)*50);
        enemies.push(new Enemy(scene, pos));
    }
}
let level = 1;
spawnEnemies(level);
updateHUD(player, {health: healthEl, ammo: ammoEl, ability: abilityEl}, level);

document.addEventListener('mousedown', e => {
    if(controls.isLocked && e.button === 0){
        player.weapon.shoot(enemies);
    }
});

document.addEventListener('keydown', e => {
    if(e.code === 'KeyR') player.weapon.reload();
});

enemies.forEach(enemy => enemy.update(player, delta));

// Level-Up wenn alle Gegner weg
if(enemies.length === 0){
    level++;
    spawnEnemies(level);
}
updateHUD(player, {health: healthEl, ammo: ammoEl, ability: abilityEl}, level);

// === Map erstellen ===
const gameMap = new Map(scene);

// Spieler-Mesh (sichtbar für Deckungssystem)
player.mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1,2,1),
    new THREE.MeshBasicMaterial({color:0x00aaff})
);
player.mesh.position.copy(player.position);
scene.add(player.mesh);

// Fähigkeit initialisieren
player.abilityObj = new Ability(player, scene);

// Abklingzeit aktivieren
document.addEventListener('keydown', e=>{
    if(e.code === 'KeyF'){
        player.abilityObj.use(enemies);
    }
});

// Ability cooldown
player.abilityObj.updateCooldown(delta);

// Spieler-Mesh synchronisieren
player.mesh.position.copy(controls.getObject().position);

// ============================================================
//   4  Three.js Grundszene
// ============================================================
let scene, camera, renderer, controls;
let floor;

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 5);

  // Umgebungslicht
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Richtungslicht (Schatten)
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(50,50,50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 200;
scene.add(dirLight);

// Aktivieren für Boden und Wände
floor.receiveShadow = true;
gameMap.walls.forEach(w => w.castShadow = true);
gameMap.walls.forEach(w => w.receiveShadow = true);
player.mesh.castShadow = true;

  import { TextureLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

const loader = new TextureLoader();
const floorTexture = loader.load('./assets/textures/floor.jpg');
floor.material.map = floorTexture;

gameMap.walls.forEach(w => {
    w.material.map = loader.load('./assets/textures/wall.jpg');
});
gameMap.cover.forEach(c => {
    c.material.map = loader.load('./assets/textures/cover.jpg');
});

  import { Points, PointsMaterial, BufferGeometry, Float32BufferAttribute } from 'three';

export function createExplosion(scene, position){
    const particles = new BufferGeometry();
    const count = 50;
    const positions = [];
    for(let i=0;i<count;i++){
        positions.push(position.x, position.y, position.z);
    }
    particles.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const material = new PointsMaterial({color:0xffaa00, size:0.2});
    const points = new Points(particles, material);
    scene.add(points);

    // Explosion animieren
    let frame = 0;
    const interval = setInterval(()=>{
        const posAttr = points.geometry.attributes.position.array;
        for(let i=0;i<posAttr.length;i+=3){
            posAttr[i] += (Math.random()-0.5)*0.5;
            posAttr[i+1] += (Math.random()-0.5)*0.5;
            posAttr[i+2] += (Math.random()-0.5)*0.5;
        }
        points.geometry.attributes.position.needsUpdate = true;
        frame++;
        if(frame>20){
            scene.remove(points);
            clearInterval(interval);
        }
    },16);
}

  setTimeout(()=>{
    createExplosion(this.scene, this.player.position.clone());
    enemies.forEach(e=>{
        const dist = e.mesh.position.distanceTo(this.player.position);
        if(dist<10) e.health -= 80;
    });
    this.scene.remove(sphere);
},1000);

  // Dynamisches Spotlicht für Spieler
const spotLight = new THREE.SpotLight(0xffffff, 0.7);
spotLight.position.set(0,10,0);
spotLight.target = player.mesh;
spotLight.castShadow = true;
scene.add(spotLight);
scene.add(spotLight.target);

  function hitFlash(mesh){
    const originalColor = mesh.material.color.getHex();
    mesh.material.color.set(0xffff00);
    setTimeout(()=>{mesh.material.color.set(originalColor)},100);
}

// Bei Projektil-Treffer oder Granate:
enemy.health -= damage;
hitFlash(enemy.mesh);
if(enemy.health<=0) removeEnemy(enemy);

      
  // === Licht ===
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 100, 50);
  scene.add(dirLight);

  // === Boden ===
  const floorGeo = new THREE.PlaneGeometry(200, 200);
  const floorMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // === Test-Objekte (Wände, Deckungen) ===
  const wallGeo = new THREE.BoxGeometry(10, 5, 1);
  const wallMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
  for (let i = 0; i < 5; i++) {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set((Math.random() - 0.5) * 100, 2.5, (Math.random() - 0.5) * 100);
    scene.add(wall);
  }

  // === Renderer ===
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // === Steuerung ===
  controls = new PointerLockControls(camera, document.body);
  document.body.addEventListener('click', () => {
    controls.lock();
  });
  scene.add(controls.getObject());

  // === Bewegungseingaben ===
  const onKeyDown = (e) => {
    switch (e.code) {
      case 'KeyW': move.forward = true; break;
      case 'KeyA': move.left = true; break;
      case 'KeyS': move.backward = true; break;
      case 'KeyD': move.right = true; break;
      case 'Space':
        if (player.canJump === true) {
          player.velocity.y += 5;
        }
        player.canJump = false;
        break;
    }
  };
  const onKeyUp = (e) => {
    switch (e.code) {
      case 'KeyW': move.forward = false; break;
      case 'KeyA': move.left = false; break;
      case 'KeyS': move.backward = false; break;
      case 'KeyD': move.right = false; break;
    }
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onWindowResize);
}

// ============================================================
//   5  Bewegungs-Logik – Grundsystem
// ============================================================
const move = { forward: false, backward: false, left: false, right: false };
let prevTime = performance.now();

function playerMovement(delta) {
  const speed = 400 * player.speed;
  const direction = new THREE.Vector3();

  direction.z = Number(move.backward) - Number(move.forward);
  direction.x = Number(move.right) - Number(move.left);
  direction.normalize();

  if (move.forward || move.backward) player.velocity.z -= direction.z * speed * delta;
  if (move.left || move.right) player.velocity.x -= direction.x * speed * delta;

  // Gravitation
  player.velocity.y -= 9.8 * 10.0 * delta;

  // Position aktualisieren
  controls.moveRight(-player.velocity.x * delta);
  controls.moveForward(-player.velocity.z * delta);
  controls.getObject().position.y += player.velocity.y * delta;

  if (controls.getObject().position.y < 2) {
    player.velocity.y = 0;
    controls.getObject().position.y = 2;
    player.canJump = true;
  }
}

// ============================================================
//   6  Rendering-Loop
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  if (controls.isLocked === true) {
    playerMovement(delta);
  }

  renderer.render(scene, camera);
}

// ============================================================
//   7  Fenstergröße aktualisieren
// ============================================================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
