// ============================================================
// BREACHER BROS — 3D FPS BROWSERGAME (MIT PHYSICS, KAMERA- & WAFFEN-FIX + SPRINT + KOLLISIONEN + HEADSHOT)
// (angepasst: Gegner sehen menschlich aus (low-poly humanoid))
// ============================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
window.THREE = THREE;

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
    let enemyAIs = [];
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

    let sprinting = false;
    let sprintDuration = 2.0;
    let sprintCooldown = 3.0;
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
    // Hilfsfunktion: Erzeuge simples humanoides Mesh (low-poly)
    // ==========================
    function createHumanMesh(options = {}) {
        const skinColor = options.skinColor || 0xffd1b3;
        const outfitColor = options.outfitColor || 0x2a6f97;
        const hairColor = options.hairColor || 0x333333;
        const scale = options.scale || 1.0;

        const group = new THREE.Group();

        const torsoGeom = new THREE.BoxGeometry(0.5 * scale, 0.7 * scale, 0.25 * scale);
        const torsoMat = new THREE.MeshStandardMaterial({ color: outfitColor, metalness: 0.1, roughness: 0.8 });
        const torso = new THREE.Mesh(torsoGeom, torsoMat);
        torso.position.set(0, 0.9 * scale, 0);
        torso.castShadow = true;
        torso.receiveShadow = true;
        group.add(torso);

        const headGeom = new THREE.SphereGeometry(0.18 * scale, 16, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: skinColor, metalness: 0.0, roughness: 0.9 });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.set(0, 1.52 * scale, 0);
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);

        const hairGeom = new THREE.SphereGeometry(0.185 * scale, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, metalness: 0.0, roughness: 0.9 });
        const hair = new THREE.Mesh(hairGeom, hairMat);
        hair.position.set(0, 1.55 * scale, 0.03 * scale);
        hair.castShadow = true;
        group.add(hair);

        const eyeGeom = new THREE.SphereGeometry(0.03 * scale, 8, 6);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        const rightEye = leftEye.clone();
        leftEye.position.set(-0.06 * scale, 1.55 * scale, 0.16 * scale);
        rightEye.position.set(0.06 * scale, 1.55 * scale, 0.16 * scale);
        group.add(leftEye);
        group.add(rightEye);

        const armGeom = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 0.6 * scale, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: outfitColor, metalness: 0.05, roughness: 0.85 });
        const leftArm = new THREE.Mesh(armGeom, armMat);
        const rightArm = leftArm.clone();
        leftArm.position.set(-0.37 * scale, 0.95 * scale, 0);
        leftArm.rotation.z = Math.PI / 8;
        rightArm.position.set(0.37 * scale, 0.95 * scale, 0);
        rightArm.rotation.z = -Math.PI / 8;
        leftArm.castShadow = true;
        rightArm.castShadow = true;
        group.add(leftArm);
        group.add(rightArm);

        const legGeom = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.8 * scale, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.05, roughness: 0.9 });
        const leftLeg = new THREE.Mesh(legGeom, legMat);
        const rightLeg = leftLeg.clone();
        leftLeg.position.set(-0.14 * scale, 0.3 * scale, 0);
        rightLeg.position.set(0.14 * scale, 0.3 * scale, 0);
        leftLeg.castShadow = true;
        rightLeg.castShadow = true;
        group.add(leftLeg);
        group.add(rightLeg);

        const gearGeom = new THREE.BoxGeometry(0.28 * scale, 0.36 * scale, 0.08 * scale);
        const gearMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.1, roughness: 0.8 });
        const gear = new THREE.Mesh(gearGeom, gearMat);
        gear.position.set(0, 0.95 * scale, -0.17 * scale);
        gear.castShadow = true;
        group.add(gear);

        group.position.y = 0;
        group.userData.isHumanoid = true;

        return group;
    }

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
    }

    // ==========================
    // 4a. Physics World + Boden
    // ==========================
    function initPhysics() {
        world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);
        world.solver.iterations = 10;
        world.broadphase = new CANNON.NaiveBroadphase();

        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0, shape: floorShape });
        floorBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
        world.addBody(floorBody);

        gameMap?.objects?.forEach(obj => {
            if (!obj) return;
            if (obj.body) return;
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
        if (!gameMap.objects) gameMap.objects = [];

        // --- Map-Objekte als Steinwände ---
        for (let i = 0; i < 12; i++) {
            const size = { x: 1 + Math.random() * 3, y: 1 + Math.random() * 2, z: 1 + Math.random() * 3 };
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(size.x, size.y, size.z),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.3, roughness: 0.8 })
            );
            const posX = (Math.random() - 0.5) * 60;
            const posZ = (Math.random() - 0.5) * 60;
            mesh.position.set(posX, size.y / 2, posZ);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);

            gameMap.objects.push({ mesh, position: { x: posX, y: size.y / 2, z: posZ }, scale: size });
        }

        gameMap.objects.forEach(obj => {
            if (!obj) return;
            if (obj.body) return;
            const size = obj.scale || { x:1, y:1, z:1 };
            const shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
            const body = new CANNON.Body({ mass: 0, shape });
            body.position.set(obj.position.x, obj.position.y, obj.position.z);
            world.addBody(body);
            obj.body = body;
        });

        player.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.6,1.8,0.5),
            new THREE.MeshStandardMaterial({ color: 0x00aaff })
        );
        player.mesh.castShadow = true;
        player.mesh.visible = false;
        scene.add(player.mesh);

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

        player.mesh.position.copy(player.body.position);

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

        try {
            audioManager = new AudioManager(new THREE.AudioListener());
            if (typeof audioManager.load === 'function') {
                audioManager.load('shoot', './assets/sfx/shoot.wav');
            }
        } catch(e) { console.warn(e); }

        for (let i = 0; i < 5; i++) {
            const enemy = new Enemy(scene, createHumanMesh());
            enemies.push(enemy);
            const ai = new EnemyAI(enemy, player);
            enemyAIs.push(ai);
        }
    }

    // ==========================
    // 7. Eingaben
    // ==========================
    document.addEventListener('keydown', e => {
        switch(e.code) {
            case 'KeyW': move.forward = true; break;
            case 'KeyS': move.backward = true; break;
            case 'KeyA': move.left = true; break;
            case 'KeyD': move.right = true; break;
            case 'Space': move.jump = true; break;
            case 'ShiftLeft': sprinting = true; break;
            case 'KeyR': player.weapon?.reload(); break;
            case 'KeyF': player.abilityObj?.activate(); break;
        }
    });

    document.addEventListener('keyup', e => {
        switch(e.code) {
            case 'KeyW': move.forward = false; break;
            case 'KeyS': move.backward = false; break;
            case 'KeyA': move.left = false; break;
            case 'KeyD': move.right = false; break;
            case 'Space': move.jump = false; break;
            case 'ShiftLeft': sprinting = false; break;
        }
    });

    document.addEventListener('mousedown', e => {
        if (e.button === 0) player.weapon?.shoot();
    });

    // ==========================
    // 8. Fenstergröße
    // ==========================
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ==========================
    // 9. Haupt-Loop
    // ==========================
    function animate() {
        requestAnimationFrame(animate);

        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        if (world) world.step(1/60, delta, 3);

        if (player?.body) {
            const velocity = player.body.velocity;
            let speed = player.speed;
            if (sprinting && sprintCooldownTimer <= 0) speed *= SPRINT_MULTIPLIER;

            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

            let moveDir = new THREE.Vector3();
            if (move.forward) moveDir.add(forward);
            if (move.backward) moveDir.add(forward.clone().negate());
            if (move.left) moveDir.add(right.clone().negate());
            if (move.right) moveDir.add(right);

            if (moveDir.length() > 0) {
                moveDir.normalize().multiplyScalar(speed);
                player.body.velocity.x = moveDir.x;
                player.body.velocity.z = moveDir.z;
            } else {
                player.body.velocity.x *= 0.8;
                player.body.velocity.z *= 0.8;
            }

            if (move.jump && player.canJump) {
                player.body.velocity.y = 8;
                player.canJump = false;
            }

            player.mesh.position.copy(player.body.position);
        }

        projectiles.forEach(p => p.update(delta));
        enemyAIs.forEach(ai => ai.update(delta));

        renderer.render(scene, camera);
        prevTime = time;
    }

});
