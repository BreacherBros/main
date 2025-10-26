// ============================================================
// BREACHER BROS — 3D FPS BROWSERGAME (MIT DEBUG FIX)
// ============================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/PointerLockControls.js';

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
  let move = { forward:false, backward:false, left:false, right:false };
  let prevTime = performance.now();
  let projectiles = [];
  let enemies = [];
  let levelManager;
  let gameMap;
  let audioManager;
  let controls;

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
    if (!cls) {
      console.error("❌ Unbekannte Klasse:", clsName);
      return;
    }

    console.log("🟢 Spielinitialisierung:", clsName);

    player = {
      ...cls,
      position: new THREE.Vector3(0, 2, 0),
      velocity: new THREE.Vector3(),
      canJump: false,
      weapon: null,
      abilityObj: null,
      mesh: null
    };

    initScene();
    initPlayer();
    initPointerLock();
    animate();
  }

  // ==========================
  // 4. Szene
  // ==========================
  function initScene() {
    console.log("🌌 Szene wird erstellt...");
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

    const geometry = new THREE.PlaneGeometry(50, 50);
    const material = new THREE.MeshPhongMaterial({ color: 0x333333 });
    floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  // ==========================
  // 5. PointerLock
  // ==========================
  function initPointerLock() {
    console.log("🎯 PointerLockControls initialisiert");
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    const lockHandler = () => {
      if (!menuVisible()) {
        controls.lock();
      }
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
  // 6. Player & Gegner
  // ==========================
  function initPlayer() {
    console.log("🧍 Spieler wird erstellt...");
    gameMap = new Map(scene);
    player.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshPhongMaterial({ color: 0x00aaff }));
    player.mesh.position.copy(player.position);
    player.mesh.castShadow = true;
    scene.add(player.mesh);

    player.weapon = new Weapon(player, scene, { ammo: ammoEl });
    player.abilityObj = new Ability(player, scene);

    audioManager = new AudioManager(new THREE.AudioListener());
    audioManager.load('shoot', './assets/sounds/shoot.wav');

    levelManager = new LevelManager(scene, gameMap, player);
    levelManager.startLevel();

    enemies = levelManager.enemies;
  }

  // ==========================
  // 7. Bewegung
  // ==========================
  function playerMovement(delta) {
    if (!controls) return;

    const speed = 5 * player.speed;
    const direction = new THREE.Vector3();
    direction.z = Number(move.backward) - Number(move.forward);
    direction.x = Number(move.right) - Number(move.left);
    direction.normalize();

    if (move.forward || move.backward) player.velocity.z -= direction.z * speed * delta;
    if (move.left || move.right) player.velocity.x -= direction.x * speed * delta;

    player.velocity.y -= 9.8 * 10 * delta;

    controls.moveRight(-player.velocity.x * delta);
    controls.moveForward(-player.velocity.z * delta);
    controls.getObject().position.y += player.velocity.y * delta;

    if (controls.getObject().position.y < 2) {
      player.velocity.y = 0;
      controls.getObject().position.y = 2;
      player.canJump = true;
    }

    player.mesh.position.copy(controls.getObject().position);
  }

  // ==========================
  // 8. Animation
  // ==========================
  function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    prevTime = time;

    if (controls?.isLocked && !menuVisible()) {
      playerMovement(delta);
      enemies.forEach(e => {
        const ai = new EnemyAI(e, gameMap, player);
        ai.update(delta);
      });
      projectiles.forEach(p => p.update?.(delta, enemies));
      player.abilityObj.updateCooldown(delta);
    }

    updateHUD();
    renderer.render(scene, camera);
  }

  function updateHUD() {
    if (!player) return;
    healthEl.innerText = `Leben: ${Math.max(player.health, 0)}`;
    ammoEl.innerText = player.weapon?.reloading ? "Nachladen..." : `Munition: ${player.weapon?.ammo}/${player.weapon?.maxAmmo}`;
    abilityEl.innerText = `Fähigkeit: ${player.ability} (${Math.max(player.abilityObj?.cooldown.toFixed(1), 0)}s)`;
    levelEl.innerText = `Level: ${levelManager?.level}`;
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ==========================
  // 9. Steuerung
  // ==========================
  document.addEventListener('keydown', e => {
    switch (e.code) {
      case 'KeyW': move.forward = true; break;
      case 'KeyA': move.left = true; break;
      case 'KeyS': move.backward = true; break;
      case 'KeyD': move.right = true; break;
      case 'Space': if (player.canJump) { player.velocity.y += 5; player.canJump = false; } break;
      case 'KeyR': player.weapon?.reload(); break;
      case 'KeyF': player.abilityObj?.use(enemies); break;
    }
  });
  document.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': move.forward = false; break;
      case 'KeyA': move.left = false; break;
      case 'KeyS': move.backward = false; break;
      case 'KeyD': move.right = false; break;
    }
  });

  document.addEventListener('mousedown', e => {
    if (controls?.isLocked && e.button === 0) {
      player.weapon?.shoot(enemies);
      audioManager?.play('shoot');
    }
  });

  console.log("✅ Breacher Bros FPS ready! Wähle zuerst eine Klasse im Menü.");
});
