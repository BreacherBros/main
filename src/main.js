// ============================================================
//   BREACHER BROS — 3D FPS BROWSERGAME (VOLLSTÄNDIG)
//   Grundgerüst: Szene + Menü + Kamera + Steuerung + Gegner + HUD + Abilities
// ============================================================

// ==========================
// IMPORTS (Platzhalter, Standalone) 
// ==========================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/PointerLockControls.js';

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
// 2. Platzhalter-Klassen für externe Module
// ==========================
class Weapon {
    constructor(player, scene, options){
        this.player = player;
        this.scene = scene;
        this.ammo = player.ammo;
        this.maxAmmo = player.ammo;
        this.reloading = false;
    }
    shoot(enemies){
        if(this.ammo<=0){ this.reload(); return; }
        this.ammo--;
        console.log("Schuss abgegeben!", this.ammo);
        enemies.forEach(e=>{
            const dist = e.mesh.position.distanceTo(this.player.position);
            if(dist<5) e.health -= 20;
        });
    }
    reload(){
        console.log("Nachladen...");
        this.reloading = true;
        setTimeout(()=>{ this.ammo=this.maxAmmo; this.reloading=false; }, this.player.reloadTime*1000);
    }
}

class Enemy {
    constructor(scene, position){
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1,2,1),
            new THREE.MeshBasicMaterial({color:0xff0000})
        );
        this.mesh.position.copy(position);
        this.health = 100;
        scene.add(this.mesh);
    }
    update(player, delta){}
}

class EnemyAI {
    constructor(enemy, map, player){ this.enemy=enemy; this.player=player; }
    update(delta){
        const dir = new THREE.Vector3().subVectors(this.player.position, this.enemy.mesh.position).normalize();
        this.enemy.mesh.position.addScaledVector(dir, 1*delta);
    }
}

class Ability {
    constructor(player, scene){
        this.player = player;
        this.scene = scene;
        this.cooldown = 0;
    }
    use(enemies){
        if(this.cooldown>0) return;
        console.log(`Fähigkeit ${this.player.ability} aktiviert!`);
        enemies.forEach(e=>{
            const dist = e.mesh.position.distanceTo(this.player.position);
            if(dist<5) e.health -= 50;
        });
        this.cooldown = 5;
    }
    updateCooldown(delta){
        if(this.cooldown>0) this.cooldown -= delta;
    }
}

class Map {
    constructor(scene){
        this.scene = scene;
        this.walls = [];
        this.cover = [];
        for(let i=0;i<5;i++){
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(5,3,1),
                new THREE.MeshBasicMaterial({color:0x888888})
            );
            wall.position.set((Math.random()-0.5)*20,1.5,(Math.random()-0.5)*20);
            this.walls.push(wall);
            scene.add(wall);
        }
        this.cover = this.walls; // einfache Abdeckung
    }
}

class AudioManager {
    constructor(listener){ this.listener = listener; this.sounds = {}; }
    load(name, path){ console.log(`Audio geladen: ${name}`); }
    play(name){ console.log(`Audio abgespielt: ${name}`); }
}

class LevelManager {
    constructor(scene, map, player){
        this.scene=scene; this.map=map; this.player=player;
        this.level=1;
        this.enemies=[];
    }
    startLevel(){ this.spawnEnemies(); }
    nextLevel(){ this.level++; this.spawnEnemies(); }
    spawnEnemies(){
        this.enemies.forEach(e=>this.scene.remove(e.mesh));
        this.enemies=[];
        for(let i=0;i<this.level*3;i++){
            const pos = new THREE.Vector3((Math.random()-0.5)*20,1,(Math.random()-0.5)*20);
            this.enemies.push(new Enemy(this.scene,pos));
        }
    }
}

// ==========================
// 3. PointerLock erst nach Start
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
// 4. Klassenauswahl Buttons
// ==========================
classBtns.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
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

        document.getElementById('startGame').addEventListener('click', (ev)=>{
            ev.stopPropagation();
            startGame(selectedClass);
            initPointerLock();
        });
    });
});

// ==========================
// 5. Spielstart
// ==========================
let scene, camera, renderer;
let floor;
let move = {forward:false,backward:false,left:false,right:false};
let prevTime = performance.now();
let projectiles = [];
let enemies = [];
let levelManager;

function startGame(clsName){
    const cls = classes[clsName];
    player = {
        ...cls,
        position: new THREE.Vector3(0,2,0),
        velocity: new THREE.Vector3(),
        canJump:false,
        weapon:null,
        abilityObj:null
    };

    briefing.style.display = 'none';
    hud.style.display = 'block';

    initScene();
    initPlayer();
    animate();
}

// ==========================
// 6. Szene + Renderer
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
// 7. Player Initialisierung
// ==========================
function initPlayer(){
    const map = new Map(scene);
    player.mesh = new THREE.Mesh(new THREE.BoxGeometry(1,2,1), new THREE.MeshBasicMaterial({color:0x00aaff}));
    player.mesh.position.copy(player.position);
    scene.add(player.mesh);

    player.weapon = new Weapon(player,scene,{ammo:ammoEl});
    player.abilityObj = new Ability(player,scene);

    levelManager = new LevelManager(scene,map,player);
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
        projectiles.forEach(p=>p.update?.(delta,enemies));
        levelManager.enemies.forEach(e=>e.mesh.position.add(new THREE.Vector3(0,0,0))); // simple AI placeholder
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
    if(controls?.isLocked && e.button===0) player.weapon.shoot(enemies);
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
