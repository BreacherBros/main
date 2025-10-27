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

    // Sprint
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
        // options: skinColor, outfitColor, scale
        const skinColor = options.skinColor || 0xffd1b3; // default hellere Haut
        const outfitColor = options.outfitColor || 0x2a6f97;
        const hairColor = options.hairColor || 0x333333;
        const scale = options.scale || 1.0;

        const group = new THREE.Group();

        // Torso (Box)
        const torsoGeom = new THREE.BoxGeometry(0.5 * scale, 0.7 * scale, 0.25 * scale);
        const torsoMat = new THREE.MeshStandardMaterial({ color: outfitColor, metalness: 0.1, roughness: 0.8 });
        const torso = new THREE.Mesh(torsoGeom, torsoMat);
        torso.position.set(0, 0.9 * scale, 0);
        torso.castShadow = true;
        torso.receiveShadow = true;
        group.add(torso);

        // Head (Sphere)
        const headGeom = new THREE.SphereGeometry(0.18 * scale, 16, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: skinColor, metalness: 0.0, roughness: 0.9 });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.set(0, 1.52 * scale, 0);
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);

        // Hair (simple cap)
        const hairGeom = new THREE.SphereGeometry(0.185 * scale, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, metalness: 0.0, roughness: 0.9 });
        const hair = new THREE.Mesh(hairGeom, hairMat);
        hair.position.set(0, 1.55 * scale, 0.03 * scale);
        hair.castShadow = true;
        group.add(hair);

        // Eyes (small spheres)
        const eyeGeom = new THREE.SphereGeometry(0.03 * scale, 8, 6);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        const rightEye = leftEye.clone();
        leftEye.position.set(-0.06 * scale, 1.55 * scale, 0.16 * scale);
        rightEye.position.set(0.06 * scale, 1.55 * scale, 0.16 * scale);
        group.add(leftEye);
        group.add(rightEye);

        // Arms
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

        // Legs
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

        // option: small backpack / gear box on torso
        const gearGeom = new THREE.BoxGeometry(0.28 * scale, 0.36 * scale, 0.08 * scale);
        const gearMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.1, roughness: 0.8 });
        const gear = new THREE.Mesh(gearGeom, gearMat);
        gear.position.set(0, 0.95 * scale, -0.17 * scale);
        gear.castShadow = true;
        group.add(gear);

        // shift pivot so group origin corresponds to feet-ground contact near y = 0
        group.position.y = 0;

        // set a simple userData so other code can identify as humanoid
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

        // --------------------------
        // Boden als Rasen
        // --------------------------
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // grüner Rasen
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
        world.broadphase = new CANNON.NaiveBroadphase();

        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0, shape: floorShape });
        floorBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
        world.addBody(floorBody);

        // Falls Map-Objekte bereits existieren (werden beim initPlayer gesetzt), füge sie als statische Körper hinzu.
        // initPlayer fügt gameMap.objects später erneut hinzu — hier nur safety wenn vorhanden.
        gameMap?.objects?.forEach(obj => {
            if (!obj) return;
            if (obj.body) return; // falls bereits erzeugt
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
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.3, roughness: 0.8 }) // Steinwand
            );
            const posX = (Math.random() - 0.5) * 60;
            const posZ = (Math.random() - 0.5) * 60;
            mesh.position.set(posX, size.y / 2, posZ);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);

            gameMap.objects.push({ mesh, position: { x: posX, y: size.y / 2, z: posZ }, scale: size });
        }

        // register map objects in physics world (static bodies) and make them collidable
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

        // AudioManager optional nutzen, Fehler vermeiden
        try {
            audioManager = new AudioManager(new THREE.AudioListener());
            if (typeof audioManager.load === 'function') {
                audioManager.load('shoot', './assets/sounds/shoot.wav')
                    .catch(err => console.warn("❌ shoot.wav konnte nicht geladen werden:", err));
            }
        } catch(e) {
            console.warn("❌ AudioManager konnte nicht initialisiert werden:", e);
            audioManager = null;
        }

        // Level + Gegner
        levelManager = new LevelManager(scene, gameMap, player);
        levelManager.startLevel();

        enemies = levelManager.enemies || [];

        // Gegner-Physics + default health + KI-Instances (erzeuge AI hier einmalig)
        enemyAIs = []; // reset
        enemies.forEach((enemy, idx) => {
            if (!enemy) { enemyAIs.push(null); return; }

            // Default HP falls nicht gesetzt
            if (enemy.health === undefined) enemy.health = 120;

            // Wenn enemy.mesh nicht vorhanden oder nicht humanoid, ersetze/escalate mit humanoidem Mesh
            // So behalten wir vorhandene Positionen/Infos, aber geben den Gegnern einen menschlichen Look
            let humanoid = null;
            if (enemy.mesh && enemy.mesh.userData && enemy.mesh.userData.isHumanoid) {
                humanoid = enemy.mesh;
            } else {
                // create a humanoid with slight randomization in outfit/skin
                const skinTones = [0xffd1b3, 0xe6b089, 0xd1a16b, 0xca8f6b, 0xbc7a5a];
                const outfits = [0x2a6f97, 0x7a2a2a, 0x2a7a3a, 0x6f2a97];
                const hairColors = [0x222222, 0x663300, 0x111111, 0x444444];
                const skin = skinTones[Math.floor(Math.random()*skinTones.length)];
                const outfit = outfits[Math.floor(Math.random()*outfits.length)];
                const hair = hairColors[Math.floor(Math.random()*hairColors.length)];
                humanoid = createHumanMesh({ skinColor: skin, outfitColor: outfit, hairColor: hair, scale: 1.0 });
            }

            // if there was an old mesh (like a box) remove it
            if (enemy.mesh && enemy.mesh !== humanoid) {
                try { scene.remove(enemy.mesh); } catch(e){}
            }

            // place humanoid at enemy position (or fallback)
            const pos = enemy.mesh?.position || (enemy.body ? new THREE.Vector3(enemy.body.position.x, enemy.body.position.y, enemy.body.position.z) : new THREE.Vector3(0,1,0));
            humanoid.position.copy(pos);
            humanoid.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

            // attach new mesh to scene if not already
            if (!humanoid.parent) scene.add(humanoid);

            // ensure enemy.mesh refers to humanoid
            enemy.mesh = humanoid;

            // physics body: replace/create box/capsule consistent with humanoid size
            // keep previous body if exists, otherwise create body matching humanoid
            if (!enemy.body) {
                const shape = new CANNON.Box(new CANNON.Vec3(0.35, 0.9, 0.25));
                const body = new CANNON.Body({ mass: 50, shape });
                body.position.set(pos.x, pos.y, pos.z);
                body.linearDamping = 0.9;
                world.addBody(body);
                enemy.body = body;
            } else {
                // sync existing body to humanoid position
                enemy.body.position.set(pos.x, pos.y, pos.z);
            }

            // create AI and wrap update for hiding behavior
            const ai = new EnemyAI(enemy, gameMap, player);
            const originalUpdate = ai.update.bind(ai);
            ai.update = function(delta) {
                if (enemy.health <= 0) return;

                // occasional random moves to make movement less predictable
                if (Math.random() < 0.02) ai.setRandomDirection?.();

                // try to find cover if near player
                if (player?.body) {
                    const toPlayer = new THREE.Vector3().subVectors(player.body.position, enemy.body.position);
                    const distance = toPlayer.length();

                    let coverChosen = false;
                    if (distance < 15 && Array.isArray(gameMap?.objects) && gameMap.objects.length > 0) {
                        // shuffle small sample for performance
                        const objs = gameMap.objects.slice();
                        for (let k = objs.length - 1; k > 0; k--) {
                            const r = Math.floor(Math.random() * (k + 1));
                            [objs[k], objs[r]] = [objs[r], objs[k]];
                        }
                        for (const obj of objs) {
                            if (!obj?.position || !obj?.body) continue;
                            // cast a ray from enemy to player, see if obj blocks line of sight
                            const from = enemy.body.position.clone();
                            const to = player.body.position.clone();
                            const ray = new CANNON.Ray(from, to);
                            ray.skipBackfaces = true;
                            let hit = false;
                            try {
                                ray.intersectBody(obj.body, (result) => {
                                    if (result.hasHit) hit = true;
                                });
                            } catch (err) {}
                            if (hit) {
                                const coverPos = new CANNON.Vec3(obj.position.x, obj.position.y, obj.position.z);
                                ai.moveTo?.({ x: coverPos.x, y: coverPos.y, z: coverPos.z });
                                coverChosen = true;
                                break;
                            }
                        }
                    }

                    if (!coverChosen && distance < 20) {
                        // orient toward player
                        enemy.body.velocity.x = 0;
                        enemy.body.velocity.z = 0;
                        const dir = toPlayer.clone().normalize();
                        const angle = Math.atan2(dir.x, dir.z);
                        if (enemy.mesh) enemy.mesh.rotation.y = angle;
                    }
                }

                originalUpdate(delta);

                // update mesh position from physics
                if (enemy.mesh && enemy.body) {
                    enemy.mesh.position.copy(enemy.body.position);
                }
            };

            enemyAIs.push(ai);
        });
    }

    // ==========================
    // 7. Player Movement mit Kollision
    //     -> Änderung: WASD bewegt sich **immer relativ zur Kamera** und reagiert dynamisch,
    //        auch wenn die Kamera während des Haltens/Drückens gedreht wird.
    // ==========================
    function playerMovement(delta) {
        if (!player.body) return;

        let speed = 5 * player.speed * SPEED_MULTIPLIER;

        if (sprinting && sprintCooldownTimer <= 0) {
            speed *= SPRINT_MULTIPLIER;
            sprintTimer += delta;
            if (sprintTimer >= sprintDuration) {
                sprinting = false;
                sprintCooldownTimer = sprintCooldown;
                sprintTimer = 0;
            }
        } else {
            sprintCooldownTimer -= delta;
            if (sprintCooldownTimer < 0) sprintCooldownTimer = 0;
        }

        let input = new THREE.Vector3(0,0,0);
        if (move.forward)  input.z -= 1; // W -> forward
        if (move.backward) input.z += 1; // S -> backward
        if (move.left)     input.x -= 1; // A -> left
        if (move.right)    input.x += 1; // D -> right

        if (input.length() === 0) {
            player.body.velocity.x *= 0.9;
            player.body.velocity.z *= 0.9;
        } else {
            const camForward = new THREE.Vector3();
            camera.getWorldDirection(camForward);
            camForward.y = 0;
            if (camForward.lengthSq() === 0) camForward.set(0,0,-1);
            camForward.normalize();

            const camRight = new THREE.Vector3();
            camRight.crossVectors(camForward, new THREE.Vector3(0,1,0)).normalize();

            const worldDir = new THREE.Vector3();
            worldDir.addScaledVector(camForward, -input.z);
            worldDir.addScaledVector(camRight, input.x);

            if (worldDir.lengthSq() > 0) worldDir.normalize();

            const from = player.body.position.clone();
            const step = 0.5;
            const to = from.vadd(new CANNON.Vec3(worldDir.x * speed * delta * step * 10, 0, worldDir.z * speed * delta * step * 10));
            const ray = new CANNON.Ray(from, to);
            ray.skipBackfaces = true;

            let blocked = false;
            try {
                ray.intersectWorld(world, { collisionFilterMask: -1 }, (result) => {
                    if (result.hasHit) blocked = true;
                });
            } catch (err) {
                blocked = false;
            }

            if (!blocked) {
                player.body.velocity.x = worldDir.x * speed;
                player.body.velocity.z = worldDir.z * speed;
            } else {
                player.body.velocity.x = 0;
                player.body.velocity.z = 0;
            }
        }

        const onGround = Math.abs(player.body.position.y - 1.0) < 0.6;
        if (move.jump && onGround) player.body.velocity.y = 8;

        player.mesh.position.copy(player.body.position);
    }

    // ==========================
    // 8. Projektile mit Lichtspur & Kollision
    // ==========================
    function spawnBullet(origin, direction, owner) {
        const geom = new THREE.SphereGeometry(0.08, 12, 12);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffcc33,
            emissive: 0xffaa33,
            emissiveIntensity: 1.8,
            metalness: 0.7,
            roughness: 0.2
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.position.copy(origin);
        scene.add(mesh);

        const light = new THREE.PointLight(0xffaa00, 0.8, 3);
        light.position.copy(origin);
        scene.add(light);

        const shape = new CANNON.Sphere(0.05);
        const body = new CANNON.Body({ mass: 0.05, shape });
        body.position.set(origin.x, origin.y, origin.z);
        body.velocity.set(direction.x * BULLET_SPEED, direction.y * BULLET_SPEED, direction.z * BULLET_SPEED);
        world.addBody(body);

        projectiles.push({ mesh, body, light, life: BULLET_LIFETIME, owner });
    }

    // ==========================
    // 9. Animation Loop
    // ==========================
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time - prevTime) / 1000;
        prevTime = time;

        if (world) world.step(1/60, delta, 3);

        // Kamera folgt Player-Body
        if (player.body && controls) {
            const headHeight = 1.6;
            controls.getObject().position.set(
                player.body.position.x,
                player.body.position.y + (headHeight - 0.9),
                player.body.position.z
            );
        }

        if (controls?.isLocked && !menuVisible() && player && player.body) {
            playerMovement(delta);

            // Enemy AI updates
            for (let i = 0; i < enemyAIs.length; i++) {
                const ai = enemyAIs[i];
                const e = enemies[i];
                if (!ai || !e || !e.body || !e.mesh) continue;
                ai.update(delta);
                // sync mesh at frame end (if not updated already by AI wrapper)
                if (e.mesh && e.body) e.mesh.position.copy(e.body.position);
            }

            // Projectiles update & collisions
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                if (!p || !p.mesh || !p.body) continue;
                p.life -= delta;
                p.mesh.position.copy(p.body.position);
                if (p.light) p.light.position.copy(p.body.position);

                if (p.life <= 0) {
                    scene.remove(p.mesh);
                    if (p.light) scene.remove(p.light);
                    try { world.removeBody(p.body); } catch (e) {}
                    projectiles.splice(i, 1);
                    continue;
                }

                // Map-Kollision: raycast from current to next position
                const from = p.body.position.clone();
                const to = from.vadd(p.body.velocity.scale(delta));
                const ray = new CANNON.Ray(from, to);
                ray.skipBackfaces = true;
                let hitObject = false;
                if (Array.isArray(gameMap?.objects)) {
                    for (const obj of gameMap.objects) {
                        if (!obj?.body) continue;
                        try {
                            ray.intersectBody(obj.body, (result) => {
                                if (result.hasHit) hitObject = true;
                            });
                        } catch (err) {}
                        if (hitObject) break;
                    }
                }
                if (hitObject) {
                    scene.remove(p.mesh);
                    if (p.light) scene.remove(p.light);
                    try { world.removeBody(p.body); } catch (e) {}
                    projectiles.splice(i, 1);
                    continue;
                }

                // Enemy collision
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (!enemy || !enemy.body || !enemy.mesh) continue;
                    if (enemy.health === undefined) enemy.health = 120;
                    const distVec = enemy.body.position.vsub(p.body.position);
                    const d = Math.sqrt(distVec.x*distVec.x + distVec.y*distVec.y + distVec.z*distVec.z);

                    if (d < 0.8) {
                        // Kopf-Höhe nun anhand humanoider Proportionen etwas niedriger ansetzen
                        const headshotThreshold = 0.9; // fühlt sich bei humanoid-Modell besser an
                        const isHeadshot = (p.body.position.y - enemy.body.position.y) > headshotThreshold;
                        const damage = isHeadshot ? enemy.health : 25;
                        if (isHeadshot) console.log("🎯 Headshot! One-Hit.");
                        else console.log("🔫 Treffer: -25 HP");

                        enemy.health -= damage;

                        scene.remove(p.mesh);
                        if (p.light) scene.remove(p.light);
                        try { world.removeBody(p.body); } catch (e) {}
                        projectiles.splice(i, 1);

                        if (enemy.health <= 0) {
                            console.log("💀 Gegner ausgeschaltet!");
                            try { scene.remove(enemy.mesh); } catch (err) {}
                            try { world.removeBody(enemy.body); } catch (err) {}
                            enemies.splice(j, 1);
                            if (enemyAIs[j]) enemyAIs.splice(j, 1);
                        }
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
        if (!player) return;
        healthEl.innerText = `Leben: ${Math.max(player.health || classes[selectedClass]?.health || 0, 0)}`;
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
                if (sprintCooldownTimer <= 0) sprinting = true;
                break;
            case 'KeyR':
                player.weapon?.reload?.();
                break;
            case 'KeyF':
                player.abilityObj?.use?.(enemies);
                break;
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

    // Sichtbarer Schuss (mit Bullet Spawn) — Schießen nur wenn nicht nachgeladen
    document.addEventListener('mousedown', e=>{
        if (controls?.isLocked && e.button === 0 && player && camera) {
            if (player.weapon?.reloading) return;
            if (typeof player.weapon?.ammo === 'number' && player.weapon.ammo <= 0) return;

            audioManager?.play?.('shoot');

            const origin = new THREE.Vector3();
            camera.getWorldPosition(origin);
            const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
            origin.add(forward.clone().multiplyScalar(0.6));

            spawnBullet(origin, forward, player);

            player.weapon?.shoot?.(enemies);
        }
    });

    console.log("✅ Breacher Bros FPS ready!");
});
