// ============================================================
//   BREACHER BROS — 3D FPS BROWSERGAME
//   Komplette Main.js (über 500 Zeilen)
// ============================================================

// Import Three.js & PointerLockControls
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/PointerLockControls.js';

// ============================================================
//   1  Klassen-Definitionen & UI
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

// UI Referenzen
const menu       = document.getElementById('menu');
const briefing   = document.getElementById('briefing');
const classBtns  = document.querySelectorAll('.class-btn');
const hud        = document.getElementById('hud');
const healthEl   = document.getElementById('health');
const ammoEl     = document.getElementById('ammo');
const abilityEl  = document.getElementById('ability');
const levelEl    = document.getElementById('level');

// ============================================================
//   2  PointerLock erst nach Start
// ============================================================
let controls;
function initPointerLock() {
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    document.body.addEventListener('click', () => {
        if(!menuVisible()) controls.lock();
    });

    controls.addEventListener('lock',   () => console.log("PointerLock aktiviert"));
    controls.addEventListener('unlock', () => console.log("PointerLock deaktiviert"));
}

function menuVisible() {
    return menu.style.display !== 'none' || briefing.style.display !== 'none';
}

// ============================================================
//   3  Klassenwahl & Briefing
// ============================================================
classBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
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

        document.getElementById('startGame').addEventListener('click', (ev) => {
            ev.stopPropagation();
            startGame(selectedClass);
            initPointerLock();
        });
    });
});

// ============================================================
//   4  Spielstart
// ============================================================
function startGame(clsName) {
  const cls = classes[clsName];
  player = {
    ...cls,
    position: new THREE.Vector3(0,2,0),
    velocity: new THREE.Vector3(),
    canJump: false
  };
  briefing.style.display = 'none';
  hud.style.display = 'block';
  initScene();
  animate();
}

// ============================================================
//   5  Module & Entitäten
// ============================================================
import { Weapon } from './weapons.js';
import { Enemy } from './enemy.js';
import { HUD } from './hud.js';
import { Map } from './map.js';
import { Ability } from './abilities.js';
import { Projectile } from './physics.js';
import { EnemyAI } from './enemyAI.js';
import { AudioManager } from './audio.js';

let scene, camera, renderer, floor;
let gameMap, levelManager;
let enemies = [];
let enemyAIs = [];
let projectiles = [];

// ============================================================
//   6  HUD Update
// ============================================================
function updateHUD() {
    if(!player) return;
    healthEl.innerText = `Leben: ${Math.max(player.health,0)}`;
    ammoEl.innerText = player.weapon?.reloading ? "Nachladen..." : `Munition: ${player.weapon.ammo}/${player.weapon.maxAmmo}`;
    abilityEl.innerText = `Fähigkeit: ${player.ability} (${Math.max(player.abilityObj?.cooldown?.toFixed(1)||0,0)}s)`;
    levelEl.innerText = `Level: ${levelManager?.level || 1}`;
}

// ============================================================
//   7  Gegner
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

function spawnEnemies(level){
    enemies.forEach(e => scene.remove(e.mesh));
    enemies = [];
    for(let i=0;i<level*3;i++){
        const pos = new THREE.Vector3((Math.random()-0.5)*50,1,(Math.random()-0.5)*50);
        const e = new Enemy(scene,pos);
        enemies.push(e);
    }
    enemyAIs = enemies.map(e=>new EnemyAI(e,gameMap,player));
}

// ============================================================
//   8  Bewegung & Steuerung
// ============================================================
const move = { forward:false, backward:false, left:false, right:false };
let prevTime = performance.now();

function playerMovement(delta){
    const speed = 400 * player.speed;
    const dir = new THREE.Vector3();
    dir.z = Number(move.backward)-Number(move.forward);
    dir.x = Number(move.right)-Number(move.left);
    dir.normalize();

    if(move.forward||move.backward) player.velocity.z -= dir.z*speed*delta;
    if(move.left||move.right) player.velocity.x -= dir.x*speed*delta;

    player.velocity.y -= 9.8*10*delta;

    controls.moveRight(-player.velocity.x*delta);
    controls.moveForward(-player.velocity.z*delta);
    controls.getObject().position.y += player.velocity.y*delta;

    if(controls.getObject().position.y<2){
        player.velocity.y=0;
        controls.getObject().position.y=2;
        player.canJump=true;
    }
}

// Tastatureingaben
function bindKeys(){
    document.addEventListener('keydown',(e)=>{
        switch(e.code){
            case 'KeyW': move.forward=true; break;
            case 'KeyA': move.left=true; break;
            case 'KeyS': move.backward=true; break;
            case 'KeyD': move.right=true; break;
            case 'Space':
                if(player.canJump) player.velocity.y+=5;
                player.canJump=false;
                break;
        }
    });
    document.addEventListener('keyup',(e)=>{
        switch(e.code){
            case 'KeyW': move.forward=false; break;
            case 'KeyA': move.left=false; break;
            case 'KeyS': move.backward=false; break;
            case 'KeyD': move.right=false; break;
        }
    });
}

// ============================================================
//   9  Three.js Grundszene
// ============================================================
function initScene(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);

    camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
    camera.position.set(0,2,5);

    // Licht
    const ambientLight = new THREE.AmbientLight(0xffffff,0.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff,1);
    dirLight.position.set(50,50,50);
    dirLight.castShadow=true;
    scene.add(dirLight);

    // Boden
    const floorGeo = new THREE.PlaneGeometry(200,200);
    const floorMat = new THREE.MeshPhongMaterial({color:0x333333});
    floor = new THREE.Mesh(floorGeo,floorMat);
    floor.rotation.x=-Math.PI/2;
    floor.receiveShadow=true;
    scene.add(floor);

    // Map, Spieler & HUD
    gameMap = new Map(scene);
    levelManager = new LevelManager(scene,gameMap,player);
    levelManager.startLevel();
    spawnEnemies(levelManager.level);

    player.mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,2,1),
        new THREE.MeshBasicMaterial({color:0x00aaff})
    );
    player.mesh.position.copy(player.position);
    scene.add(player.mesh);

    player.abilityObj = new Ability(player,scene);

    player.weapon = new Weapon(player,scene,{ammo:ammoEl});

    bindKeys();

    renderer = new THREE.WebGLRenderer({canvas:document.getElementById('gameCanvas'),antialias:true});
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.shadowMap.enabled=true;

    window.addEventListener('resize',onWindowResize);
}

// ============================================================
//   10  Rendering-Loop
// ============================================================
function animate(){
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time-prevTime)/1000;
    prevTime=time;

    if(controls?.isLocked && !menuVisible()){
        playerMovement(delta);
        enemyAIs.forEach(ai=>ai.update(delta));
        projectiles.forEach(p=>p.update(delta,enemies));
    }

    updateHUD();
    renderer.render(scene,camera);
}

// ============================================================
//   11  Fenstergröße
// ============================================================
function onWindowResize(){
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
}

// ============================================================
//   12  Projektil-Schüsse
// ============================================================
document.addEventListener('mousedown',(e)=>{
    if(controls?.isLocked && e.button===0){
        const dir = new THREE.Vector3(0,0,-1).applyQuaternion(player.mesh.quaternion);
        projectiles.push(new Projectile(scene,player.position.clone(),dir));
        player.weapon.shoot(enemies);
    }
});

document.addEventListener('keydown',(e)=>{
    if(e.code==='KeyR') player.weapon.reload();
    if(e.code==='KeyF') player.abilityObj.use(enemies);
});

// ============================================================
//   13  Audio
// ============================================================
const listener = new THREE.AudioListener();
camera.add(listener);
const audioManager = new AudioManager(listener);
audioManager.load('shoot','./assets/sounds/shoot.wav');

// ============================================================
//   14  Explosion
// ============================================================
import { Points, PointsMaterial, BufferGeometry, Float32BufferAttribute } from 'three';
export function createExplosion(scene,position){
    const particles = new BufferGeometry();
    const count=50;
    const positions=[];
    for(let i=0;i<count;i++){
        positions.push(position.x,position.y,position.z);
    }
    particles.setAttribute('position',new Float32BufferAttribute(positions,3));
    const material = new PointsMaterial({color:0xffaa00,size:0.2});
    const points = new Points(particles,material);
    scene.add(points);

    let frame=0;
    const interval=setInterval(()=>{
        const posAttr = points.geometry.attributes.position.array;
        for(let i=0;i<posAttr.length;i+=3){
            posAttr[i]+=(Math.random()-0.5)*0.5;
            posAttr[i+1]+=(Math.random()-0.5)*0.5;
            posAttr[i+2]+=(Math.random()-0.5)*0.5;
        }
        points.geometry.attributes.position.needsUpdate=true;
        frame++;
        if(frame>20){
            scene.remove(points);
            clearInterval(interval);
        }
    },16);
}

// ============================================================
//   15  Level-Up & Gegner-Reset
// ============================================================
function checkLevelUp(){
    if(enemies.length===0){
        levelManager.nextLevel();
        spawnEnemies(levelManager.level);
    }
}

// ============================================================
//   16  Alles initialisiert
// ============================================================
console.log("BREACHER BROS — Main.js geladen");
