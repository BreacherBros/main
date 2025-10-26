// ============================================================
// BREACHER BROS — 3D FPS BROWSERGAME (FPV-MODELLE, PHYSICS, ANIMATION)
// ============================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
window.THREE = THREE; // Safari: globaler THREE-Workaround

import { PointerLockControls } from './PointerLockControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

// GLTF Loader für Modelle + (optional) RGBELoader für HDR
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
// import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/RGBELoader.js';

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
    // move.jump benutzt für Physics-Sprung
    let move = { forward:false, backward:false, left:false, right:false, jump:false };
    let prevTime = performance.now();
    let projectiles = []; // enthält sichtbare Projektile mit update()
    let enemies = [];
    let levelManager;
    let gameMap;
    let audioManager;
    let controls;
    let world; // Physics World
    let mixers = []; // AnimationMixers (Arms, Enemies, etc.)

    // kleine Geschwindigkeitsanpassung (1.0 = default, >1 = schneller)
    const SPEED_MULTIPLIER = 1.15;

    // Projektil-Parameter
    const BULLET_SPEED = 70; // initialgeschwindigkeit der Kugeln
    const BULLET_LIFETIME = 4.0; // Sekunden bis zur Entsorgung

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
            canJump: false,
            mixer: null,
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
        // Kamera sitzt in den Controls (First Person). Initial Position wird in animate an Player gebunden.
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

        // Neuer API (Three r155+)
        // remove old properties - use recommended replacements
        try {
          renderer.useLegacyLights = false; // ersetzt physicallyCorrectLights
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.outputColorSpace = THREE.SRGBColorSpace; // ersetzt outputEncoding
        } catch (e) {
          // In älteren Three-Versionen diese props fehlen eventuell
          console.warn("Renderer property set failed:", e);
        }

        window.addEventListener('resize', onWindowResize);

        // Boden-Mesh (PBR-ready)
        const geometry = new THREE.PlaneGeometry(200, 200);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // Optional: HDRI-Umgebung (auskommentiert)
        // const pmremGen = new THREE.PMREMGenerator(renderer);
        // new RGBELoader().load('assets/hdr/studio_small_03_4k.hdr', (tex) => {
        //    const env = pmremGen.fromEquirectangular(tex).texture;
        //    scene.environment = env;
        // });
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
    // 5. PointerLock (erst nach Scene + Camera)
    // ==========================
    function initPointerLock() {
        controls = new PointerLockControls(camera, document.body);
        scene.add(controls.getObject()); // Controls setzen (Camera ist intern referenziert)

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
    // 6. Player + Gegner (Modelle + Physik + Animation)
    // ==========================
    function initPlayer() {
        gameMap = new Map(scene);
        const loader = new GLTFLoader();

        // --- Player FirstPerson-Arms (GLTF) ---
        loader.load(
            './assets/models/arms.glb',
            (gltf) => {
                const arms = gltf.scene;
                // arms usually contain skinned meshes and animations (Idle/Fire)
                arms.traverse(obj=>{
                    if(obj.isMesh){
                        obj.castShadow = true;
                        obj.frustumCulled = false;
                    }
                });
                // Attach arms to camera so they move with camera rotation
                camera.add(arms);
                arms.position.set(0.05, -0.35, -0.45); // tweak for correct FP placement
                arms.rotation.set(0, 0, 0);
                player.armModel = arms;

                // Animation mixer for arms
                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(arms);
                    mixers.push(mixer);
                    player.mixer = mixer;
                    // play first animation (often "Idle")
                    const idle = mixer.clipAction(gltf.animations[0]);
                    idle.play();
                    // store fire clip if exists (gltf.animations[1] maybe)
                    player.armFireClip = gltf.animations[1] || null;
                }
            },
            undefined,
            (err) => {
                console.warn('Arms model load failed — using fallback weapon mesh.', err);
                // fallback handled below via weapon fallback
            }
        );

        // --- Player placeholder mesh (invisible in FP, useful for collisions/3rd-person) ---
        player.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.6,1.8,0.5),
            new THREE.MeshStandardMaterial({ color: 0x00aaff })
        );
        player.mesh.castShadow = true;
        player.mesh.visible = false; // FP -> hide body
        scene.add(player.mesh);

        // --- Player Physics Body (capsule-like using cylinder) ---
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

        // --- Weapon (try use Weapon class mesh, else load weapon model or fallback) ---
        player.weapon = new Weapon(player, scene, { ammo: ammoEl });

        // if Weapon supplies a mesh/model property, attach it to camera (so visible in FP)
        const weaponMesh = player.weapon?.mesh || player.weapon?.model || null;
        if (weaponMesh) {
            camera.add(weaponMesh);
            weaponMesh.position.set(0.22, -0.35, -0.55);
            weaponMesh.rotation.set(0, 0, 0);
            weaponMesh.castShadow = true;
            player.weaponMesh = weaponMesh;
        } else {
            // try load a weapon GLTF and parent to camera
            loader.load(
                './assets/models/weapon.glb',
                (gltf) => {
                    const weap = gltf.scene;
                    weap.traverse(o=>{ if(o.isMesh){ o.castShadow=true; }});
                    camera.add(weap);
                    weap.position.set(0.22, -0.35, -0.55);
                    weap.rotation.set(0,0,0);
                    player.weaponMesh = weap;
                    // optional animation mixer for weapon (recoil)
                    if (gltf.animations && gltf.animations.length) {
                        const wm = new THREE.AnimationMixer(weap);
                        mixers.push(wm);
                        player.weaponMixer = wm;
                        // don't auto-play recoil
                    }
                },
                undefined,
                (err) => {
                    // fallback simple gun
                    const gunGeom = new THREE.BoxGeometry(0.12,0.07,0.5);
                    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 });
                    const gunMesh = new THREE.Mesh(gunGeom, gunMat);
                    gunMesh.position.set(0.22, -0.35, -0.55);
                    gunMesh.castShadow = true;
                    camera.add(gunMesh);
                    player.weaponMesh = gunMesh;
                    player.weapon.fallbackMesh = gunMesh;
                }
            );
        }

        // Abilities & Audio
        player.abilityObj = new Ability(player, scene);
        audioManager = new AudioManager(new THREE.AudioListener());
        // try loading shoot sound but don't crash if missing
        try {
            audioManager.load('shoot', './assets/sounds/shoot.wav');
        } catch (e) {
            console.warn("shoot.wav load failed (will continue without sound).", e);
        }

        // Levels & enemies
        levelManager = new LevelManager(scene, gameMap, player);
        levelManager.startLevel();

        enemies = levelManager.enemies || [];

        // load enemy models (GLTF) and create phys bodies; play idle animation if present
        enemies.forEach((enemy, idx) => {
            // spawn positions — if enemy.mesh exists from levelManager, use pos; else random
            const pos = (enemy.mesh && enemy.mesh.position) ? enemy.mesh.position.clone() : new THREE.Vector3(Math.random()*6-3,0,Math.random()*6-3);
            const shape = new CANNON.Box(new CANNON.Vec3(0.4, 0.9, 0.4));
            const body = new CANNON.Body({ mass: 50, shape });
            body.position.set(pos.x, pos.y+1, pos.z);
            body.linearDamping = 0.9;
            world.addBody(body);
            enemy.body = body;

            // load model
            loader.load(
                './assets/models/enemy.glb',
                (gltf) => {
                    const model = gltf.scene.clone();
                    model.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; }});
                    model.position.set(pos.x, pos.y, pos.z);
                    scene.add(model);
                    enemy.mesh = model;

                    // animation mixer for enemy
                    if (gltf.animations && gltf.animations.length) {
                        const mixer = new THREE.AnimationMixer(model);
                        mixers.push(mixer);
                        enemy.mixer = mixer;
                        // try play idle anim
                        const idle = mixer.clipAction(gltf.animations[0]);
                        idle.play();
                        // store walk/attack if available
                        enemy.animations = gltf.animations;
                    }
                },
                undefined,
                (err) => {
                    console.warn("Enemy model failed to load; using box fallback.", err);
                    const fallback = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.8,0.6), new THREE.MeshStandardMaterial({ color: 0x884444 }));
                    fallback.position.set(pos.x, pos.y, pos.z);
                    fallback.castShadow = true;
                    scene.add(fallback);
                    enemy.mesh = fallback;
                }
            );
        });
    }

    // ==========================
    // 7. Player Movement
    // ==========================
    function playerMovement(delta) {
        if (!player.body) return;

        // leichte Beschleunigungsanpassung: SPEED_MULTIPLIER
        const speed = 5 * player.speed * SPEED_MULTIPLIER;

        // Input-Vektor (lokal z nach vorne)
        let input = new THREE.Vector3(0,0,0);
        if (move.forward)  input.z -= 1;
        if (move.backward) input.z += 1;
        if (move.left)     input.x -= 1;
        if (move.right)    input.x += 1;
        input.normalize();

        // Wenn kein Input -> langsames Abbremsen (nicht Autorun)
        if (input.length() === 0) {
            player.body.velocity.x *= 0.9;
            player.body.velocity.z *= 0.9;
        } else {
            // Rotate input according to camera yaw (use controls rotation)
            // controls.getObject().rotation.y is used by PointerLockControls to track yaw/pitch
            const yaw = controls.getObject().rotation.y;
            const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
            const worldDir = input.applyQuaternion(quat);

            // Setze horizontale velocity (Y bleibt durch Physics)
            player.body.velocity.x = worldDir.x * speed;
            player.body.velocity.z = worldDir.z * speed;
        }

        // Springen: setze Y-Velocity, nur wenn auf dem Boden (vereinfachte Bodenprüfung)
        const onGround = Math.abs(player.body.position.y - 1.0) < 0.7;
        if (move.jump && onGround) {
            player.body.velocity.y = 8;
        }

        // Sync mesh (falls 3rd person)
        if (player.mesh) player.mesh.position.copy(player.body.position);
    }

    // ==========================
    // 8. Projektile (sichtbar + physisch)
    // ==========================
    function spawnBullet(origin, direction, owner) {
        // Three.js Mesh
        const geom = new THREE.SphereGeometry(0.04, 8, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.2, roughness: 0.2 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.position.copy(origin);
        scene.add(mesh);

        // Cannon Body
        const shape = new CANNON.Sphere(0.04);
        const body = new CANNON.Body({ mass: 0.2, shape });
        body.position.set(origin.x, origin.y, origin.z);
        body.velocity.set(direction.x * BULLET_SPEED, direction.y * BULLET_SPEED, direction.z * BULLET_SPEED);
        body.linearDamping = 0;
        world.addBody(body);

        const proj = {
            mesh,
            body,
            life: BULLET_LIFETIME,
            owner
        };
        projectiles.push(proj);
    }

    // ==========================
    // 9. Animation Loop
    // ==========================
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time - prevTime)/1000;
        prevTime = time;

        // Physics step
        if (world) world.step(1/60, delta, 3);

        // Kamera-zu-Player-Sync: setze PointerLockControls Position auf Player-Body (First-Person)
        if (player.body && controls) {
            // position the controls' object (camera parent) at player's head height
            const headHeight = 1.6; // Augenhöhe
            controls.getObject().position.set(player.body.position.x, player.body.position.y + (headHeight - 0.9), player.body.position.z);
        }

        // update mixers (arms/enemies/weapons)
        if (mixers.length) {
            mixers.forEach(m => m.update(delta));
        }

        if (controls?.isLocked && !menuVisible()) {
            playerMovement(delta);

            // Enemy AI + Mesh sync (guard against missing objects)
            enemies.forEach(e=>{
                if (!e) return;
                if (!e.body) return;
                // run AI only if e.mesh and player exist
                try {
                    if (typeof EnemyAI === 'function' && e.mesh && player) {
                        const ai = new EnemyAI(e, gameMap, player);
                        ai.update?.(delta);
                    }
                } catch (err) {
                    // safe guard — avoid breaking render loop
                    // console.warn("EnemyAI update failed:", err);
                }
                if (e.body && e.mesh) {
                    e.mesh.position.copy(e.body.position);
                    // try to copy quaternion (convert CANNON quaternion to THREE)
                    if (e.body.quaternion) {
                        e.mesh.quaternion.set(e.body.quaternion.x, e.body.quaternion.y, e.body.quaternion.z, e.body.quaternion.w);
                    }
                }
            });

            // Projectiles update & lifetime + simple enemy hit detection
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                p.life -= delta;
                if (p.mesh && p.body) {
                    p.mesh.position.copy(p.body.position);
                }
                if (p.life <= 0) {
                    // cleanup
                    scene.remove(p.mesh);
                    try { world.removeBody(p.body); } catch(e) {}
                    projectiles.splice(i,1);
                    continue;
                }
                // collision with enemies (distance check)
                for (const enemy of enemies) {
                    if (!enemy || !enemy.body) continue;
                    const dx = enemy.body.position.x - p.body.position.x;
                    const dy = enemy.body.position.y - p.body.position.y;
                    const dz = enemy.body.position.z - p.body.position.z;
                    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    if (dist < 1.0) {
                        // hit
                        if (typeof enemy.health === 'number') {
                            enemy.health -= 25;
                        } else {
                            enemy.health = (enemy.health || 100) - 25;
                        }
                        // remove projectile
                        scene.remove(p.mesh);
                        try { world.removeBody(p.body); } catch(e) {}
                        projectiles.splice(i,1);
                        break;
                    }
                }
            }

            // Abklingzeit der Fähigkeit
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

    // Mausklick -> schießen (Weapon.shoot preferred, else fallback projectile)
    document.addEventListener('mousedown', e=>{
        if(controls?.isLocked && e.button===0){
            // Versuche die Weapon-Klasse zu verwenden (sie könnte bereits Effekte/Proj. erzeugen)
            let shotResult = null;
            try {
                shotResult = player.weapon?.shoot?.(enemies);
            } catch (err) {
                console.warn("player.weapon.shoot threw:", err);
                shotResult = null;
            }

            // Play sound if available
            try { audioManager?.play('shoot'); } catch (err) { /* noop */ }

            if (!shotResult) {
                // spawn fallback bullet from camera forward
                const origin = new THREE.Vector3();
                camera.getWorldPosition(origin);
                const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
                origin.add(forward.clone().multiplyScalar(0.6));
                spawnBullet(origin, forward, player);

                // play arm fire animation if exists
                if (player.mixer && player.armFireClip) {
                    const action = player.mixer.clipAction(player.armFireClip);
                    action.reset().play();
                }
                // weapon recoil animation if exists
                player.weaponMixer?.clipAction?.(player.weaponMixer._actions?.[0])?.play?.();
            }
        }
    });

    console.log("✅ Breacher Bros FPS ready!");
});


