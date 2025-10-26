// ============================================================
// BREACHER BROS — 3D FPS BROWSERGAME (MIT PHYSICS, KAMERA- & WAFFEN-FIX + SPRINT + KOLLISIONEN + HEADSHOT)
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
    let enemyAIs = []; // <-- KI-Instanzen einmalig erzeugt
    let levelManager;
    let gameMap;
    let audioManager;
    let controls;
    let world;

    // ==========================
    // Geschwindigkeits-Parameter
    // ==========================
    const SPEED_MULTIPLIER = 1.15;
    const BULLET_SPEED = 60;
    const BULLET_LIFETIME = 4.0;

    // Sprint
    let sprinting = false;
    let sprintDuration = 2.0;      // Sekunden maximal sprinten
    let sprintCooldown = 3.0;      // Sekunden Abklingzeit
    let sprintTimer = 0;
    let sprintCooldownTimer = 0;
    const SPRINT_MULTIPLIER = 1.5;

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
            body: null,
            canJump: false
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
        camera.position.set(0, 1.6, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;

        window.addEventListener('resize', onWindowResize);

        const geometry = new THREE.PlaneGeometry(100, 100);
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

        // Boden
        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0, shape: floorShape });
        floorBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
        world.addBody(floorBody);

        // Map-Kollisionskörper hinzufügen (falls gameMap schon existiert)
        // Hinweis: gameMap wird in initPlayer neu initialisiert; falls du externe map-Objekte hast,
        // stelle sicher, dass gameMap.objects beim Start gesetzt ist.
        gameMap?.objects?.forEach(obj => {
            if (!obj) return;
            const size = obj.scale || { x:1, y:1, z:1 };
            const shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
            const body = new CANNON.Body({ mass: 0, shape });
            body.position.set(obj.position.x, obj.position.y, obj.position.z);
            world.addBody(body);
            obj.body = body;
        });
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

        // Player Mesh (placeholder — FP nicht sichtbar)
        player.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.6,1.8,0.5),
            new THREE.MeshStandardMaterial({ color: 0x00aaff })
        );
        player.mesh.castShadow = true;
        player.mesh.visible = false;
        scene.add(player.mesh);

        // Player Physics (Kapsel-ähnlich via Cylinder)
        const playerShape = new CANNON.Cylinder(0.35, 0.35, 1.8, 8);
        const playerBody = new CANNON.Body({
            mass: 80,
            shape: playerShape,
            position: new CANNON.Vec3(0, 2, 0),
            fixedRotation: true
        });
        playerBody.linearDamping = 0.1;
        world.addBody(playerBody);
        player.body = playerBody;

        // Position initial abgleichen
        player.mesh.position.copy(player.body.position);

        // Weapon
        player.weapon = new Weapon(player, scene, { ammo: ammoEl });
        const weaponMesh = player.weapon?.mesh || player.weapon?.model || null;
        if (weaponMesh) {
            camera.add(weaponMesh);
            weaponMesh.position.set(0.25, -0.35, -0.6);
            weaponMesh.rotation.set(0, 0, 0);
            weaponMesh.castShadow = true;
        } else {
            const gunGeom = new THREE.BoxGeometry(0.1,0.06,0.5);
            const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 });
            const gunMesh = new THREE.Mesh(gunGeom, gunMat);
            gunMesh.position.set(0.25, -0.35, -0.6);
            gunMesh.castShadow = true;
            camera.add(gunMesh);
            player.weapon.fallbackMesh = gunMesh;
        }

        player.abilityObj = new Ability(player, scene);

        // Audio (lade, falls vorhanden)
        audioManager = new AudioManager(new THREE.AudioListener());
        audioManager.load('shoot', './assets/sounds/shoot.wav');

        // Level + Gegner
        levelManager = new LevelManager(scene, gameMap, player);
        levelManager.startLevel();

        enemies = levelManager.enemies || [];

        // Gegner-Physics + default health + KI-Instances (erzeuge AI hier einmalig)
        enemyAIs = []; // reset
        enemies.forEach(enemy => {
            if (!enemy) { enemyAIs.push(null); return; }

            // Default HP falls nicht gesetzt
            if (enemy.health === undefined) enemy.health = 120;

            // physics body
            const shape = new CANNON.Box(new CANNON.Vec3(0.4, 0.9, 0.4));
            const body = new CANNON.Body({ mass: 50, shape });
            const pos = enemy.mesh ? enemy.mesh.position : new THREE.Vector3(0,1,0);
            body.position.set(pos.x, pos.y, pos.z);
            body.linearDamping = 0.9;
            world.addBody(body);
            enemy.body = body;

            // create AI once
            const ai = new EnemyAI(enemy, gameMap, player);
            enemyAIs.push(ai);
        });
    }

    // ==========================
    // 7. Player Movement mit Sprint + Kollisions-Logik
    // ==========================
    function playerMovement(delta) {
        if (!player.body) return;

        let speed = 5 * player.speed * SPEED_MULTIPLIER;

        if(sprinting && sprintCooldownTimer <= 0) {
            speed *= SPRINT_MULTIPLIER;
            sprintTimer += delta;
            if(sprintTimer >= sprintDuration){
                sprinting = false;
                sprintCooldownTimer = sprintCooldown;
                sprintTimer = 0;
            }
        } else {
            sprintCooldownTimer -= delta;
            if(sprintCooldownTimer < 0) sprintCooldownTimer = 0;
        }

        let input = new THREE.Vector3(0,0,0);
        if(move.forward)  input.z -= 1;
        if(move.backward) input.z += 1;
        if(move.left)     input.x -= 1;
        if(move.right)    input.x += 1;
        input.normalize();

        if(input.length() === 0) {
            player.body.velocity.x *= 0.9;
            player.body.velocity.z *= 0.9;
        } else {
            const quat = new THREE.Quaternion();
            const euler = new THREE.Euler(0, controls.getObject().rotation.y, 0, 'YXZ');
            quat.setFromEuler(euler);
            const worldDir = input.applyQuaternion(quat);
            const vel = new CANNON.Vec3(worldDir.x * speed, player.body.velocity.y, worldDir.z * speed);
            player.body.velocity.copy(vel);
        }

        const onGround = Math.abs(player.body.position.y - 1.0) < 0.6;
        if(move.jump && onGround) player.body.velocity.y = 8;

        player.mesh.position.copy(player.body.position);
    }

    // ==========================
    // 8. Projektile
    // ==========================
    function spawnBullet(origin, direction, owner) {
        const geom = new THREE.SphereGeometry(0.05, 8, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.3, roughness: 0.2 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.position.copy(origin);
        scene.add(mesh);

        const shape = new CANNON.Sphere(0.05);
        const body = new CANNON.Body({ mass: 0.2, shape });
        body.position.set(origin.x, origin.y, origin.z);
        body.velocity.set(direction.x * BULLET_SPEED, direction.y * BULLET_SPEED, direction.z * BULLET_SPEED);
        world.addBody(body);

        projectiles.push({ mesh, body, life: BULLET_LIFETIME, owner });
    }

    // ==========================
    // 9. Animation Loop
    // ==========================
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time - prevTime)/1000;
        prevTime = time;

        if (world) world.step(1/60, delta, 3);

        // Kamera folgt Player-Body
        if (player.body && controls) {
            const headHeight = 1.6;
            controls.getObject().position.set(player.body.position.x, player.body.position.y + (headHeight - 0.9), player.body.position.z);
        }

        if (controls?.isLocked && !menuVisible()) {
            playerMovement(delta);

            // Enemy AI + Mesh sync (verwende die einmal erzeugten AI-Instanzen)
            for (let i = 0; i < enemyAIs.length; i++) {
                const ai = enemyAIs[i];
                const e = enemies[i];
                if (!ai || !e || !e.body || !e.mesh) continue;
                ai.update(delta);
                e.mesh.position.copy(e.body.position);
                // Rotation: falls EnemyAI setzt, belasse es; ansonsten null quaternion
            }

            // Projectiles update & collision with enemies
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                p.life -= delta;
                if (p.mesh && p.body) p.mesh.position.copy(p.body.position);

                if (p.life <= 0) {
                    // cleanup projectile
                    scene.remove(p.mesh);
                    try { world.removeBody(p.body); } catch(e) {}
                    projectiles.splice(i,1);
                    continue;
                }

                // Check collisions with enemies (iterate backwards safe removal)
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (!enemy || !enemy.body || !enemy.mesh) continue;

                    // ensure enemy has health
                    if (enemy.health === undefined) enemy.health = 120;

                    const distVec = enemy.body.position.vsub(p.body.position);
                    const d = Math.sqrt(distVec.x*distVec.x + distVec.y*distVec.y + distVec.z*distVec.z);

                    if (d < 0.8) {
                        // Kopf-Check: wenn Projektil deutlich über Körpermitte trifft (Tweak 1.4)
                        const headshotThreshold = 1.4;
                        const isHeadshot = (p.body.position.y - enemy.body.position.y) > headshotThreshold;
                        const damage = isHeadshot ? enemy.health : 25; // headshot = instant kill (set to remaining HP)
                        if (isHeadshot) {
                            console.log("🎯 Headshot! One-Hit.");
                        } else {
                            console.log("🔫 Treffer: -25 HP");
                        }

                        enemy.health -= damage;

                        // Entferne Projektil
                        scene.remove(p.mesh);
                        try { world.removeBody(p.body); } catch(e) {}
                        projectiles.splice(i,1);

                        // Wenn Gegner tot -> entferne Mesh + Body + AI + Array-Eintrag
                        if (enemy.health <= 0) {
                            console.log("💀 Gegner ausgeschaltet!");
                            try { scene.remove(enemy.mesh); } catch (err) {}
                            try { world.removeBody(enemy.body); } catch (err) {}
                            enemies.splice(j,1);
                            // korrespondierende AI entfernen
                            if (enemyAIs[j]) {
                                enemyAIs.splice(j,1);
                            }
                        }

                        // wichtig: wenn projectile getroffen hat, breche die enemy-loop
                        break;
                    }
                }
            }

            player.abilityObj.updateCooldown?.(delta);
        }

        updateHUD();
        renderer.render(scene, camera);
    }

    // ==========================
    // 10. HUD Update
    // ==========================
    function updateHUD() {
        if(!player) return;
        healthEl.innerText = `Leben: ${Math.max(player.health || classes[selectedClass]?.health || 0,0)}`;
        ammoEl.innerText = player.weapon?.reloading ? "Nachladen..." : `Munition: ${player.weapon?.ammo || classes[selectedClass]?.ammo || 0}/${player.weapon?.maxAmmo || classes[selectedClass]?.ammo || 0}`;
        abilityEl.innerText = `Fähigkeit: ${player.ability || classes[selectedClass]?.ability || '-'} (${Math.max(player.abilityObj?.cooldown?.toFixed?.(1) || 0,0)}s)`;
        levelEl.innerText = `Level: ${levelManager?.level || 1}`;
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ==========================
    // 11. Input Handling
    // ==========================
    document.addEventListener('keydown', e=>{
        switch(e.code){
            case 'KeyW': move.forward=true; break;
            case 'KeyS': move.backward=true; break;
            case 'KeyA': move.left=true; break;
            case 'KeyD': move.right=true; break;
            case 'Space': move.jump=true; break;
            case 'ShiftLeft':
            case 'ShiftRight':
                if(sprintCooldownTimer <= 0) sprinting = true;
                break;
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
            case 'ShiftLeft':
            case 'ShiftRight': sprinting = false; break;
        }
    });
    document.addEventListener('mousedown', e=>{
        if(controls?.isLocked && e.button===0){
            const shotResult = player.weapon?.shoot?.(enemies);
            audioManager?.play('shoot');

            if (!shotResult) {
                const origin = new THREE.Vector3();
                camera.getWorldPosition(origin);
                const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
                // kleine Verschiebung vor der Kamera
                origin.add(forward.clone().multiplyScalar(0.6));
                spawnBullet(origin, forward, player);
            }
        }
    });

    console.log("✅ Breacher Bros FPS ready!");
});
