// ============================================================
// BREACHER BROS — 3D FPS BROWSERGAME (FPV-MODELLE, PHYSICS, ANIMATION)
// ============================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
window.THREE = THREE; // Safari: globaler THREE-Workaround

import { PointerLockControls } from './PointerLockControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';

import { Weapon } from './weapons.js';
import { EnemyAI } from './enemyAI.js';
import { Ability } from './abilities.js';
import { Map } from './map.js';
import { AudioManager } from './audio.js';
import { LevelManager } from './levels.js';

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
    let levelManager, gameMap, audioManager, controls, world;
    let mixers = [];

    const SPEED_MULTIPLIER = 1.15;
    const BULLET_SPEED = 70;
    const BULLET_LIFETIME = 4.0;

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
            armModel: null,
            mixer: null,
            armFireClip: null,
            weaponMixer: null,
            weaponMesh: null,
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

        try {
            renderer.useLegacyLights = false;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        } catch (e) { console.warn("Renderer props fallback", e); }

        window.addEventListener('resize', onWindowResize);

        const geometry = new THREE.PlaneGeometry(200, 200);
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
    // 6. Player + Gegner (Modelle + Physik + Animation)
    // ==========================
    function initPlayer() {
        gameMap = new Map(scene);
        const loader = new GLTFLoader();

        // --- Player FP-Arms ---
        loader.load('./assets/models/arms.glb', (gltf)=>{
            const arms = gltf.scene;
            arms.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.frustumCulled=false;} });
            camera.add(arms);
            arms.position.set(0.05,-0.35,-0.45);
            player.armModel = arms;

            if(gltf.animations.length){
                const mixer = new THREE.AnimationMixer(arms);
                mixers.push(mixer);
                player.mixer = mixer;
                const idle = mixer.clipAction(gltf.animations[0]);
                idle.play();
                player.armFireClip = gltf.animations[1] || null;
            }
        });

        // --- Player Mesh (invisible FP placeholder) ---
        player.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.6,1.8,0.5),
            new THREE.MeshStandardMaterial({ color: 0x00aaff })
        );
        player.mesh.visible = false;
        scene.add(player.mesh);

        // --- Player Physics ---
        const shape = new CANNON.Cylinder(0.35,0.35,1.8,8);
        const body = new CANNON.Body({ mass:80, shape, position:new CANNON.Vec3(0,2,0), fixedRotation:true });
        body.linearDamping = 0.1;
        world.addBody(body);
        player.body = body;

        // --- Weapon ---
        player.weapon = new Weapon(player, scene, { ammo: ammoEl });
        let weaponMesh = player.weapon.mesh || player.weapon.model || null;
        if(weaponMesh){
            camera.add(weaponMesh);
            weaponMesh.position.set(0.22,-0.35,-0.55);
            weaponMesh.castShadow = true;
            player.weaponMesh = weaponMesh;
        } else {
            loader.load('./assets/models/weapon.glb', (gltf)=>{
                const weap = gltf.scene;
                weap.traverse(o=>{ if(o.isMesh)o.castShadow=true; });
                camera.add(weap);
                weap.position.set(0.22,-0.35,-0.55);
                player.weaponMesh = weap;
                if(gltf.animations.length){
                    const wm = new THREE.AnimationMixer(weap);
                    mixers.push(wm);
                    player.weaponMixer = wm;
                }
            }, undefined, ()=>{
                const gun = new THREE.Mesh(
                    new THREE.BoxGeometry(0.12,0.07,0.5),
                    new THREE.MeshStandardMaterial({ color:0x222222, metalness:0.7, roughness:0.3 })
                );
                gun.position.set(0.22,-0.35,-0.55);
                gun.castShadow = true;
                camera.add(gun);
                player.weaponMesh = gun;
                player.weapon.fallbackMesh = gun;
            });
        }

        // --- Ability & Audio ---
        player.abilityObj = new Ability(player, scene);
        audioManager = new AudioManager(new THREE.AudioListener());
        try { audioManager.load('shoot', './assets/sounds/shoot.wav'); } catch(e){}

        // --- Levels & Enemies ---
        levelManager = new LevelManager(scene, gameMap, player);
        levelManager.startLevel();
        enemies = levelManager.enemies || [];

        enemies.forEach(enemy=>{
            const pos = enemy.mesh?.position?.clone() || new THREE.Vector3(Math.random()*6-3,0,Math.random()*6-3);
            const shape = new CANNON.Box(new CANNON.Vec3(0.4,0.9,0.4));
            const body = new CANNON.Body({ mass:50, shape });
            body.position.set(pos.x,pos.y+1,pos.z);
            body.linearDamping = 0.9;
            world.addBody(body);
            enemy.body = body;

            loader.load('./assets/models/enemy.glb', (gltf)=>{
                const model = gltf.scene.clone();
                model.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
                model.position.copy(pos);
                scene.add(model);
                enemy.mesh = model;

                if(gltf.animations.length){
                    const mixer = new THREE.AnimationMixer(model);
                    mixers.push(mixer);
                    enemy.mixer = mixer;
                    const idle = mixer.clipAction(gltf.animations[0]);
                    idle.play();
                    enemy.animations = gltf.animations;
                }
            }, undefined, ()=>{
                const fallback = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8,1.8,0.6),
                    new THREE.MeshStandardMaterial({ color:0x884444 })
                );
                fallback.position.copy(pos);
                fallback.castShadow=true;
                scene.add(fallback);
                enemy.mesh = fallback;
            });
        });
    }

    // ==========================
    // 7. Player Movement
    // ==========================
    function playerMovement(delta){
        if(!player.body) return;
        const speed = 5 * player.speed * SPEED_MULTIPLIER;

        let input = new THREE.Vector3(
            move.left?-1:move.right?1:0,
            0,
            move.forward?-1:move.backward?1:0
        );
        if(input.length()>0) input.normalize();
        else { player.body.velocity.x*=0.9; player.body.velocity.z*=0.9; }

        if(input.length()>0){
            const yaw = controls.getObject().rotation.y;
            const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0,'YXZ'));
            input.applyQuaternion(quat);
            player.body.velocity.x = input.x*speed;
            player.body.velocity.z = input.z*speed;
        }

        const onGround = Math.abs(player.body.position.y-1.0)<0.7;
        if(move.jump && onGround) player.body.velocity.y = 8;

        if(player.mesh) player.mesh.position.copy(player.body.position);
    }

    // ==========================
    // 8. Projektile
    // ==========================
    function spawnBullet(origin,direction,owner){
        const geom = new THREE.SphereGeometry(0.04,8,8);
        const mat = new THREE.MeshStandardMaterial({ color:0xffcc33, metalness:0.2, roughness:0.2 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow=true;
        mesh.position.copy(origin);
        scene.add(mesh);

        const shape = new CANNON.Sphere(0.04);
        const body = new CANNON.Body({ mass:0.2, shape });
        body.position.copy(origin);
        body.velocity.set(direction.x*BULLET_SPEED, direction.y*BULLET_SPEED, direction.z*BULLET_SPEED);
        world.addBody(body);

        projectiles.push({mesh,body,life:BULLET_LIFETIME,owner});
    }

    // ==========================
    // 9. Animate Loop
    // ==========================
    function animate(){
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time-prevTime)/1000;
        prevTime=time;

        world?.step(1/60,delta,3);

        if(player.body && controls){
            controls.getObject().position.set(
                player.body.position.x,
                player.body.position.y+0.7,
                player.body.position.z
            );
        }

        mixers.forEach(m=>m.update(delta));

        if(controls?.isLocked && !menuVisible()){
            playerMovement(delta);

            enemies.forEach(e=>{
                if(!e||!e.body) return;
                try { new EnemyAI(e,gameMap,player).update?.(delta); } catch{}
                if(e.mesh){ e.mesh.position.copy(e.body.position); e.mesh.quaternion.set(e.body.quaternion.x,e.body.quaternion.y,e.body.quaternion.z,e.body.quaternion.w); }
            });

            for(let i=projectiles.length-1;i>=0;i--){
                const p = projectiles[i];
                p.life-=delta;
                p.mesh.position.copy(p.body.position);
                if(p.life<=0){ scene.remove(p.mesh); try{ world.removeBody(p.body) }catch{}; projectiles.splice(i,1); continue; }

                for(const enemy of enemies){
                    if(!enemy||!enemy.body) continue;
                    const dx = enemy.body.position.x - p.body.position.x;
                    const dy = enemy.body.position.y - p.body.position.y;
                    const dz = enemy.body.position.z - p.body.position.z;
                    if(Math.sqrt(dx*dx+dy*dy+dz*dz)<1.0){
                        enemy.health = (enemy.health||100)-25;
                        if(enemy.health<=0){
                            scene.remove(enemy.mesh);
                            try{ world.removeBody(enemy.body) }catch{};
                            enemies.splice(enemies.indexOf(enemy),1);
                        }
                        scene.remove(p.mesh);
                        try{ world.removeBody(p.body) }catch{};
                        projectiles.splice(i,1);
                        break;
                    }
                }
            }

            player.abilityObj.updateCooldown?.(delta);
        }

        updateHUD();
        renderer.render(scene,camera);
    }

    function updateHUD(){
        healthEl.innerText = `Leben: ${Math.max(player.health||classes[selectedClass]?.health||0,0)}`;
        ammoEl.innerText = player.weapon?.reloading ? "Nachladen..." : `Munition: ${player.weapon?.ammo||classes[selectedClass]?.ammo||0}/${player.weapon?.maxAmmo||classes[selectedClass]?.ammo||0}`;
        abilityEl.innerText = `Fähigkeit: ${player.ability||classes[selectedClass]?.ability||'-'} (${Math.max(player.abilityObj?.cooldown?.toFixed?.(1)||0,0)}s)`;
        levelEl.innerText = `Level: ${levelManager?.level||1}`;
    }

    function onWindowResize(){
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ==========================
    // 11. Input
    // ==========================
    document.addEventListener('keydown',e=>{
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
    document.addEventListener('keyup',e=>{
        switch(e.code){
            case 'KeyW': move.forward=false; break;
            case 'KeyS': move.backward=false; break;
            case 'KeyA': move.left=false; break;
            case 'KeyD': move.right=false; break;
            case 'Space': move.jump=false; break;
        }
    });

    document.addEventListener('mousedown',e=>{
        if(controls?.isLocked && e.button===0){
            let shotResult=null;
            try{ shotResult = player.weapon?.shoot?.(enemies); } catch{}
            try{ audioManager?.play('shoot'); } catch{}

            if(!shotResult){
                const origin = new THREE.Vector3();
                camera.getWorldPosition(origin);
                const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
                origin.add(forward.clone().multiplyScalar(0.6));
                spawnBullet(origin,forward,player);

                if(player.mixer && player.armFireClip){
                    player.mixer.clipAction(player.armFireClip).reset().play();
                }
                player.weaponMixer?.clipAction?.(player.weaponMixer._actions?.[0])?.play?.();
            }
        }
    });

    console.log("✅ Breacher Bros FPS ready!");
});
