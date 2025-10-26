// ============================================================
// BREACHER BROS — 3D FPS BROWSERGAME (MIT PHYSICS UND DEBUG FIX)
// ============================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
window.THREE = THREE; // Safari braucht manchmal globale THREE

import { PointerLockControls } from './PointerLockControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

import { Weapon } from './weapons.js';
import { Enemy } from './enemy.js';
import { EnemyAI } from './enemyAI.js';
import { Ability } from './abilities.js';
import { Map } from './map.js';
import { AudioManager } from './audio.js';
import { LevelManager } from './levels.js';
import { HUD } from './hud.js';
import { Projectile } from './physics.js';

window.addEventListener('DOMContentLoaded', () => {

    console.log("🟢 DOM geladen – Script gestartet");

    // ==========================
    // 1. Klassen + UI
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
    let scene, camera, renderer, floor;
    let move = { forward:false, backward:false, left:false, right:false, jump:false };
    let prevTime = performance.now();
    let projectiles = [];
    let enemies = [];
    let levelManager;
    let gameMap;
    let audioManager;
    let controls;
    let world; // Physics World

    // ==========================
    // HTML ELEMENTE
    // ==========================
    const menu       = document.getElementById('menu');
    const briefing   = document.getElementById('briefing');
    const classBtns  = document.querySelectorAll('.class-btn');
    const hud        = document.getElementById('hud');
    const healthEl   = document.getElementById('health');
    const ammoEl     = document.getElementById('ammo');
    const abilityEl  = document.getElementById('ability');
    const levelEl    = document.getElementById('level');
    const canvas     = document.getElementById('gameCanvas');

    if (!menu || !classBtns.length || !canvas) {
        console.error("❌ HTML-Elemente nicht gefunden! Prüfe dein HTML.");
        return;
    }

    console.log("✅ UI-Elemente erkannt, bereit für Klicks.");

    // ==========================
    // 2. Menü: Klassenauswahl
    // ==========================
    classBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedClass = btn.dataset.class;
            console.log(`🟡 Klasse gewählt: ${selectedClass}`);

            if (!classes[selectedClass]) {
                console.error("❌ Unbekannte Klasse:", selectedClass);
                return;
            }

            const cls = classes[selectedClass];
            menu.style.display = 'none';
            briefing.style.display = 'block';

            briefing.innerHTML = `
                <h2>${selectedClass}</h2>
                <p>Fähigkeit: ${cls.ability}</p>
                <p>Gesundheit: ${cls.health}</p>
                <p>Tempo: ${cls.speed}</p>
                <p>Munition: ${cls.ammo}</p>
                <button id="startGame">Los geht's!</button>
            `;

            const startBtn = document.getElementById('startGame');
            startBtn.addEventListener('click', () => {
                console.log("🚀 Starte Spiel...");
                briefing.style.display = 'none';
                hud.style.display = 'block';
                startGame(selectedClass);
            });
        });
    });

    // ==========================
    // 3. Spielstart
    // ==========================
    function startGame(clsName) {
        const cls = classes[clsName];
        if (!cls) return;

        player = {
            ...cls,
            weapon: null,
            abilityObj: null,
            mesh: null,
            body: null
        };

        initScene();
        initPhysics();
        initPlayer();
        initPointerLock();
        animate();
    }

    // ==========================
    // 4. Szene + Renderer + Licht
    // ==========================
    function initScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x101010);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2, 5);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        scene.add(dirLight);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;

        window.addEventListener('resize', onWindowResize);

        // Boden-Mesh
        const geometry = new THREE.PlaneGeometry(50, 50);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
    }

    // ==========================
    // 4a. Physics World + Boden
    // ==========================
    function initPhysics() {
        world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);
        world.solver.iterations = 10;

        // Boden-Physics
        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0, shape: floorShape });
        floorBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
        world.addBody(floorBody);
    }

    // ==========================
    // 5. PointerLock
    // ==========================
    function initPointerLock() {
        controls = new PointerLockControls(camera, document.body);
        scene.add(controls.getObject());

        const lockHandler = () => {
            if (!menuVisible()) controls.lock();
        };
        document.body.addEventListener('click', lockHandler);
        canvas.addEventListener('click', lockHandler);

        controls.addEventListener('lock', () => console.log("🔒 PointerLock aktiviert"));
        controls.addEventListener('unlock', () => console.log("🔓 PointerLock deaktiviert"));
    }

    function menuVisible() {
        return menu.style.display !== 'none' || briefing.style.display !== 'none';
    }

    // ==========================
    // 6. Player + Gegner
    // ==========================
    function initPlayer() {
        gameMap = new Map(scene);

        // Player Mesh
        player.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1,2,1),
            new THREE.MeshStandardMaterial({ color: 0x00aaff })
        );
        player.mesh.castShadow = true;
        scene.add(player.mesh);

        // Player Physics
        const playerShape = new CANNON.Cylinder(0.5, 0.5, 2, 8);
        const playerBody = new CANNON.Body({
            mass: 80,
            shape: playerShape,
            position: new CANNON.Vec3(0,2,0),
            fixedRotation: true
        });
        world.addBody(playerBody);
        player.body = playerBody;

        player.weapon = new Weapon(player, scene, { ammo: ammoEl });
        player.abilityObj = new Ability(player, scene);

        audioManager = new AudioManager(new THREE.AudioListener());
        audioManager.load('shoot', './assets/sounds/shoot.wav');

        levelManager = new LevelManager(scene, gameMap, player);
        levelManager.startLevel();

        // Gegner Physics
        enemies.forEach(enemy => {
            const shape = new CANNON.Box(new CANNON.Vec3(0.5,1,0.5));
            const body = new CANNON.Body({ mass: 50, shape });
            body.position.copy(enemy.mesh.position);
            world.addBody(body);
            enemy.body = body;
        });
    }

    // ==========================
    // 7. Player Movement
    // ==========================
    function playerMovement(delta) {
        if (!player.body) return;

        const speed = 5 * player.speed;
        let input = new CANNON.Vec3(0,0,0);
        if(move.forward)  input.z -= speed;
        if(move.backward) input.z += speed;
        if(move.left)     input.x -= speed;
        if(move.right)    input.x += speed;

        // Rotate input according to camera yaw
        const quat = new THREE.Quaternion();
        quat.setFromEuler(new THREE.Euler(0, camera.rotation.y,0,'YXZ'));
        const vec = new THREE.Vector3(input.x,0,input.z).applyQuaternion(quat);

        player.body.velocity.x = vec.x;
        player.body.velocity.z = vec.z;

        // Springen
        if(move.jump && player.canJump){
            player.body.velocity.y = 8;
            player.canJump = false;
        }

        // Sync mesh
        player.mesh.position.copy(player.body.position);
    }

    // ==========================
    // 8. Animation Loop
    // ==========================
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time - prevTime)/1000;
        prevTime = time;

        // Physics step
        world.step(1/60, delta, 3);

        if(controls?.isLocked && !menuVisible()){
            playerMovement(delta);

            enemies.forEach(e=>{
                const ai = new EnemyAI(e, gameMap, player);
                ai.update(delta);
                if(e.body) e.mesh.position.copy(e.body.position);
            });

            projectiles.forEach(p=>p.update?.(delta,enemies));
            player.abilityObj.updateCooldown(delta);
        }

        updateHUD();
        renderer.render(scene,camera);
    }

    // ==========================
    // 9. HUD Update
    // ==========================
    function updateHUD() {
        if(!player) return;
        healthEl.innerText = `Leben: ${Math.max(player.health,0)}`;
        ammoEl.innerText = player.weapon?.reloading ? "Nachladen..." : `Munition: ${player.weapon?.ammo}/${player.weapon?.maxAmmo}`;
        abilityEl.innerText = `Fähigkeit: ${player.ability} (${Math.max(player.abilityObj?.cooldown.toFixed(1),0)}s)`;
        levelEl.innerText = `Level: ${levelManager?.level}`;
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ==========================
    // 10. Input Handling
    // ==========================
    document.addEventListener('keydown', e=>{
        switch(e.code){
            case 'KeyW': move.forward=true; break;
            case 'KeyS': move.backward=true; break;
            case 'KeyA': move.left=true; break;
            case 'KeyD': move.right=true; break;
            case 'Space': move.jump=true; break;
            case 'KeyR': player.weapon?.reload(); break;
            case 'KeyF': player.abilityObj?.use(enemies); break;
        }
    });
    document.addEventListener('keyup', e=>{
        switch(e.code){
            case 'KeyW': move.forward=false; break;
            case 'KeyS': move.backward=false; break;
            case 'KeyA': move.left=false; break;
            case 'KeyD': move.right=false; break;
            case 'Space': move.jump=false; break;
        }
    });
    document.addEventListener('mousedown', e=>{
        if(controls?.isLocked && e.button===0){
            player.weapon?.shoot(enemies);
            audioManager?.play('shoot');
        }
    });

    console.log("✅ Breacher Bros FPS ready!");
});
