// ============================================================
// BREACHER BROS — 3D FPS BROWSERGAME (MIT PHYSICS, KAMERA- & WAFFEN-FIX)
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

    // kleine Geschwindigkeitsanpassung (1.0 = default, >1 = schneller)
    const SPEED_MULTIPLIER = 1.15;

    // Projektil-Parameter
    const BULLET_SPEED = 60; // initialgeschwindigkeit der Kugeln
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
        // nicht fest setzen — Kamera wird an Player-Body gebunden
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
        renderer.physicallyCorrectLights = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.outputEncoding = THREE.sRGBEncoding;

        window.addEventListener('resize', onWindowResize);

        // Boden-Mesh (PBR-ready)
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // Hinweis: für wirklich hochwertige Grafik lade HDR-Environment & hochwertige GLTF-Modelle.
        // Beispiel (auskommentiert — benötigt RGBELoader + HDR file):
        // import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/RGBELoader.js';
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

        // Player Mesh (placeholder — ersetzen durch GLTF-Charakter für realistischen Look)
        player.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.6,1.8,0.5),
            new THREE.MeshStandardMaterial({ color: 0x00aaff })
        );
        player.mesh.castShadow = true;
        player.mesh.visible = false; // in FP normalerweise nicht sichtbar; setze true für debug
        scene.add(player.mesh);

        // Player Physics (Kapsel-ähnlich via Cylinder)
        const playerShape = new CANNON.Cylinder(0.35, 0.35, 1.8, 8);
        const playerBody = new CANNON.Body({
            mass: 80,
            shape: playerShape,
            position: new CANNON.Vec3(0, 2, 0),
            fixedRotation: true
        });
        // optional: etwas Dämpfung
        playerBody.linearDamping = 0.1;
        world.addBody(playerBody);
        player.body = playerBody;

        // Position initial abgleichen
        player.mesh.position.copy(player.body.position);

        // Weapon
        player.weapon = new Weapon(player, scene, { ammo: ammoEl });
        // Falls Weapon eine mesh-Eigenschaft hat, parenten wir sie an die Kamera (FirstPerson)
        // Viele Implementationen nennen es "mesh" oder "model" — wir prüfen beides.
        const weaponMesh = player.weapon?.mesh || player.weapon?.model || null;
        if (weaponMesh) {
            // mache die Waffe zur Kamera-Child, damit sie immer in Sicht bleibt
            camera.add(weaponMesh);
            // relative Position (leicht rechts/unten vor der Kamera)
            weaponMesh.position.set(0.25, -0.35, -0.6);
            weaponMesh.rotation.set(0, 0, 0);
            weaponMesh.castShadow = true;
        } else {
            // Fallback-Gun anzeigen (falls Weapon-Klasse keine Mesh erzeugt)
            const gunGeom = new THREE.BoxGeometry(0.1,0.06,0.5);
            const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 });
            const gunMesh = new THREE.Mesh(gunGeom, gunMat);
            gunMesh.position.set(0.25, -0.35, -0.6);
            gunMesh.castShadow = true;
            camera.add(gunMesh);
            // Minimal-API für Weapon: set weapon.fallbackMesh falls nötig
            player.weapon.fallbackMesh = gunMesh;
        }

        player.abilityObj = new Ability(player, scene);

        audioManager = new AudioManager(new THREE.AudioListener());
        audioManager.load('shoot', './assets/sounds/shoot.wav');

        levelManager = new LevelManager(scene, gameMap, player);
        levelManager.startLevel();

        // Gegner: falls levelManager.enemies bereits gefüllt ist, physik bodies anlegen
        enemies = levelManager.enemies || [];
        enemies.forEach(enemy => {
            // falls enemy.mesh existiert, setzen wir physik-box auf die mesh-position
            const shape = new CANNON.Box(new CANNON.Vec3(0.4, 0.9, 0.4));
            const body = new CANNON.Body({ mass: 50, shape });
            const pos = enemy.mesh ? enemy.mesh.position : new THREE.Vector3(0,1,0);
            body.position.set(pos.x, pos.y, pos.z);
            body.linearDamping = 0.9;
            world.addBody(body);
            enemy.body = body;
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
            // optional: nicht abrupt stoppen, sondern dämpfen
            player.body.velocity.x *= 0.9;
            player.body.velocity.z *= 0.9;
        } else {
            // Rotate input according to camera yaw
            const quat = new THREE.Quaternion();
            // Nutze nur yaw (y-Rotation) der Kamera
            const euler = new THREE.Euler(0, controls.getObject().rotation.y, 0, 'YXZ');
            quat.setFromEuler(euler);
            const worldDir = input.applyQuaternion(quat);

            // Setze horizontale velocity (Y bleibt durch Physics)
            player.body.velocity.x = worldDir.x * speed;
            player.body.velocity.z = worldDir.z * speed;
        }

        // Springen: setze Y-Velocity, nur wenn auf dem Boden (vereinfachte Bodenprüfung)
        // Hier prüfen wir, ob die Spieler-Body nahe am Boden ist
        const onGround = Math.abs(player.body.position.y - 1.0) < 0.6; // grobe Prüfung
        if (move.jump && onGround) {
            player.body.velocity.y = 8;
        }

        // Sync mesh (falls du 3rd person nutzen willst)
        if (player.mesh) player.mesh.position.copy(player.body.position);
    }

    // ==========================
    // 8. Projektile (Fallback sichtbar)
    // ==========================
    function spawnBullet(origin, direction, owner) {
        // Three.js Mesh
        const geom = new THREE.SphereGeometry(0.05, 8, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.3, roughness: 0.2 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.position.copy(origin);
        scene.add(mesh);

        // Cannon Body
        const shape = new CANNON.Sphere(0.05);
        const body = new CANNON.Body({ mass: 0.2, shape });
        body.position.set(origin.x, origin.y, origin.z);
        // set initial velocity
        body.velocity.set(direction.x * BULLET_SPEED, direction.y * BULLET_SPEED, direction.z * BULLET_SPEED);
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
            // Ensures camera uses pointer rotation while position follows physics body
        }

        if (controls?.isLocked && !menuVisible()) {
            playerMovement(delta);

            // Enemy AI + Mesh sync
            enemies.forEach(e=>{
                const ai = new EnemyAI(e, gameMap, player);
                ai.update(delta);
                if (e.body && e.mesh) {
                    e.mesh.position.copy(e.body.position);
                    e.mesh.quaternion.copy(e.body.quaternion || new CANNON.Quaternion().toEuler ? new THREE.Quaternion() : new THREE.Quaternion());
                }
            });

            // Projectiles update & lifetime
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
                } else {
                    // simple collision test with enemies (AABB)
                    enemies.forEach(enemy=>{
                        if (!enemy.body || !enemy.mesh) return;
                        const dist = enemy.body.position.vsub(p.body.position);
                        const d = Math.sqrt(dist.x*dist.x + dist.y*dist.y + dist.z*dist.z);
                        if (d < 0.8) {
                            // Treffer -> reduziere Leben falls vorhanden
                            if (enemy.health !== undefined) enemy.health -= 25;
                            // entferne Projektil
                            scene.remove(p.mesh);
                            try { world.removeBody(p.body); } catch(e){}
                            projectiles.splice(i,1);
                        }
                    });
                }
            }

            projectiles.forEach(p => {
                // optional: trail, sound, etc.
            });

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
    document.addEventListener('mousedown', e=>{
        if(controls?.isLocked && e.button===0){
            // Falls Weapon.shoot() selbst Projektile erzeugt, lasse es laufen
            const shotResult = player.weapon?.shoot?.(enemies);
            audioManager?.play('shoot');

            // Wenn Weapon.shoot nicht sichtbar macht (oder nicht existiert), spawn fallback bullet:
            // Wir erzeugen eine Kugel aus der Kamera-Position in Blickrichtung
            if (!shotResult) {
                // Erzeuge Origin nahe der Kamera (Barrel)
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
