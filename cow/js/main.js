/**
 * main.js — Three.js Koe Simulator & Kuddebeheer
 * Scène-setup, renderer, camera, lichten, animatie-lus.
 * Laadt cow_rigged.glb + animaties en initialiseert de 4-koeien kudde via HerdManager.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import { HerdManager } from './cow/HerdManager.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { PastureEnvironment } from './env/PastureEnvironment.js';

// ─────────────────────────────────────────────────────────────────────────────
// SceneController — beheert de gehele Three.js scène
// ─────────────────────────────────────────────────────────────────────────────
class SceneController {
    constructor() {
        this.clock = new THREE.Clock();
        this.frameCount = 0;
        this.fpsTime = 0;
        this.cameraMode = 'solo';
        this.displayMode = 'solo';
        window.app = this;
        window.THREE = THREE;

        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.initEnvironment();
        this.initIKTargetHelpers();

        this.loadCow().then(() => {
            this.initUI();
            this.hideLoading();
            this.animate();
        });

        window.addEventListener('resize', this.onResize.bind(this));
    }

    // ── Renderer ───────────────────────────────────────────────────────────
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    // ── Scène ───────────────────────────────────────────────────────────────
    initScene() {
        this.scene = new THREE.Scene();
    }

    // ── Omgeving (Realistisch Weiland + Studio Back-up) ─────────────────────
    initEnvironment() {
        this.env = new PastureEnvironment(this.scene);
    }

    // ── Camera — strak op de koe gericht ──────────────────────────────────
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            38, window.innerWidth / window.innerHeight, 0.05, 500
        );
        // Fraaie 3/4 blik op de geselecteerde koe
        this.camera.position.set(-4.5, 1.6, 3.6);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0.9, 0);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.07;
        this.controls.maxPolarAngle = Math.PI * 0.52; // geen onderkant
        this.controls.minDistance = 1.0;
        this.controls.maxDistance = 25;
        this.controls.update();
    }

    // ── IK-target helpers ──────────────────────────────────────────────────
    initIKTargetHelpers() {
        this.ikTargetMeshes = {};
        const geo = new THREE.SphereGeometry(0.04, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
            const sphere = new THREE.Mesh(geo, mat);
            sphere.visible = false;
            this.scene.add(sphere);
            this.ikTargetMeshes[leg] = sphere;
        });
    }

    // ── Koe laden & 4-Koeien Kudde initialiseren ────────────────────────────
    async loadCow() {
        const gltfLoader = new GLTFLoader();

        const setProgress = (pct, text) => {
            const bar = document.getElementById('loading-bar');
            const txt = document.getElementById('loading-text');
            if (bar) bar.style.width = pct + '%';
            if (txt) txt.textContent = text;
        };

        const gltfCow = await gltfLoader.loadAsync('models/cow_melkkoe.glb');
        this.cowModel = gltfCow.scene;
        this.cowModel.traverse(obj => {
            if (obj.isMesh && obj.geometry && obj.geometry.attributes.position) {
                obj.geometry.userData.basePositions = new Float32Array(obj.geometry.attributes.position.array);
            }
        });

        this.animClips = {};
        if (gltfCow.animations && gltfCow.animations.length > 0) {
            this.sanitizeLocomotionClips(gltfCow.animations);
            gltfCow.animations.forEach(clip => {
                this.animClips[clip.name] = clip;
            });
        }

        // 1b. Gevalideerde GLTF-animatiesuite gereedmelden
        setProgress(60, 'Gevalideerde animatiesuite voorbereiden...');

        setProgress(70, 'Fotorealistische PBR-lagen & rassen laden...');
        const textureLoader = new THREE.TextureLoader();
        this.textures = {
            baseBlackWhite: textureLoader.load('textures/cow_f_blackwhite.jpg', (t) => {
                t.flipY = false;
                t.colorSpace = THREE.SRGBColorSpace;
            }),
            brown: textureLoader.load('textures/cow_f_roodbont.jpg', (t) => {
                t.flipY = false;
                t.colorSpace = THREE.SRGBColorSpace;
            }),
            blaarkop: textureLoader.load('textures/cow_f_blaarkop.jpg', (t) => {
                t.flipY = false;
                t.colorSpace = THREE.SRGBColorSpace;
            }),
            black: textureLoader.load('textures/cow_f_blackwhite.jpg', (t) => {
                t.flipY = false;
                t.colorSpace = THREE.SRGBColorSpace;
            }),
            pbr: {
                normal: textureLoader.load('textures/cow_f_normal.jpg', t => { t.flipY = false; }),
                ao: textureLoader.load('textures/cow_f_ao.jpg', t => { t.flipY = false; }),
                roughness: textureLoader.load('textures/cow_f_roughness.jpg', t => { t.flipY = false; }),
            }
        };

        // 2. Initialiseer Kudde van 4 Melkkoeien
        setProgress(90, 'Melkkoe-kudde initialiseren...');
        this.herd = new HerdManager(this.scene, this.cowModel, this.animClips, this.textures);
        this.behavior = this.herd.getSelectedBehavior();

        setProgress(100, 'Klaar!');
        return true;
    }

    /**
     * Symmetriseert de loopgangen (walk, trot):
     * In de bronanimatie bezat RigLBLegAnkle een rotatie-offset waardoor linksachter over de grond sleepte.
     * Deze methode spiegelt de foutloze RigRBLeg-sporen naar RigLBLeg met een halve cyclus faseverschuiving.
     */
    sanitizeLocomotionClips(clips) {
        if (!clips) return;
        clips.forEach(clip => {
            if (!clip || !clip.name) return;

            // 1. Sanitizeer wortelpositie: zet RigRoot.position op (0,0,0) in alle clips zodat
            // alle animaties exact dezelfde stationaire oorsprong delen zonder teleportatiesprongen
            const rootPos = clip.tracks.find(t => t.name === 'RigRoot.position');
            if (rootPos) {
                for (let i = 0; i < rootPos.values.length; i++) {
                    rootPos.values[i] = 0;
                }
            }

            const name = clip.name.toLowerCase();
            const isLoco = name.includes('walk') || name.includes('trot');
            if (!isLoco) return;

            const halfDur = clip.duration * 0.5;
            const bonesToMirror = [
                // Achterbenen (RigLBLegAnkle bezat in de bronanimatie een offset waardoor linksachter sleepte)
                { r: 'RigRBLeg1', l: 'RigLBLeg1' },
                { r: 'RigRBLeg2', l: 'RigLBLeg2' },
                { r: 'RigRBLeg3', l: 'RigLBLeg3' },
                { r: 'RigRBLegAnkle', l: 'RigLBLegAnkle' }
            ];

            bonesToMirror.forEach(pair => {
                // Rotatiespoor (quaternion) spiegelen over sagittale vlak (X -> -X, Y -> -Y, Z -> Z, W -> W)
                const rQuat = clip.tracks.find(t => t.name === `${pair.r}.quaternion`);
                const lQuat = clip.tracks.find(t => t.name === `${pair.l}.quaternion`);
                if (rQuat && lQuat) {
                    const interp = new THREE.QuaternionLinearInterpolant(
                        rQuat.times, rQuat.values, 4, new Float32Array(4)
                    );
                    const newVals = new Float32Array(lQuat.values.length);
                    for (let i = 0; i < lQuat.times.length; i++) {
                        const t = lQuat.times[i];
                        const tMirrored = (t + halfDur) % clip.duration;
                        const q = interp.evaluate(tMirrored);
                        newVals[i * 4 + 0] = -q[0];
                        newVals[i * 4 + 1] = -q[1];
                        newVals[i * 4 + 2] =  q[2];
                        newVals[i * 4 + 3] =  q[3];
                    }
                    lQuat.values.set(newVals);
                }
            });
        });
    }

    // ── UI ─────────────────────────────────────────────────────────────────
    initUI() {
        this.ui = new ControlPanel('control-panel', this.behavior, this);
    }

    // ── Verberg laadscherm ─────────────────────────────────────────────────
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 600);
    }

    // ── Weergavemodus: Solo (1 Koe) vs Kudde (4 Koeien) ───────────────────
    setDisplayMode(mode) {
        this.displayMode = mode;
        if (this.herd) {
            this.herd.setDisplayMode(mode);
            this.behavior = this.herd.getSelectedBehavior();
        }
        if (mode === 'solo') {
            this.setCameraMode('solo');
        } else {
            this.setCameraMode('orbit');
        }
    }

    // ── Kudde & Koe Selectie ────────────────────────────────────────────────
    selectCow(cowIndex) {
        if (!this.herd) return null;
        this.behavior = this.herd.selectCow(cowIndex);

        if (this.displayMode === 'solo') {
            this.controls.target.set(0, 0.9, 0);
            this.camera.position.set(-4.5, 1.6, 3.6);
            this.controls.update();
        } else if (this.cameraMode === 'focus' || this.cameraMode === 'follow') {
            const cow = this.herd.getSelectedCow();
            if (cow) {
                const pos = cow.model.position;
                this.controls.target.set(pos.x, pos.y + 1.0, pos.z);
                this.camera.position.set(pos.x - 3.5, pos.y + 1.6, pos.z - 3.5);
                this.controls.update();
            }
        }
        return this.behavior;
    }

    setHerdInteraction(mode) {
        if (!this.herd) return;
        if (this.displayMode === 'solo') {
            this.displayMode = 'herd';
            if (this.ui && this.ui.setDisplayMode) {
                this.ui.setDisplayMode('herd', false);
            }
        }
        this.herd.setInteraction(mode);

        if (mode === 'clinical_comparison') {
            this.setCameraMode('comparison');
        } else if (mode === 'allogrooming') {
            this.setCameraMode('interaction');
        }
    }

    // ── Publieke weergave methoden ──────────────────────────────────────────
    toggleSkeleton(visible) {
        if (this.herd) this.herd.toggleSkeleton(visible);
    }

    toggleGrid(visible) {
        if (this.env) this.env.toggleGrid(visible);
    }

    setEnvironment(mode) {
        if (this.env) this.env.setMode(mode);
    }

    toggleIKTargets(visible) {
        Object.values(this.ikTargetMeshes).forEach(m => m.visible = visible);
    }

    setWireframe(enabled) {
        if (this.herd) this.herd.setWireframe(enabled);
    }

    applyTexture(type) {
        if (this.herd) this.herd.applyTexture(type);
    }

    generateProceduralSkin(options) {
        if (this.herd) return this.herd.generateProceduralSkin(options);
    }

    randomizeEntireHerd() {
        if (this.herd) this.herd.randomizeEntireHerd();
    }

    applyDomainRandomization(breedType) {
        if (this.herd) this.herd.applyDomainRandomization(breedType);
    }

    randomizeConformation(cowIndex) {
        if (this.herd) this.herd.randomizeConformation(cowIndex);
    }

    togglePBR(enabled) {
        if (this.herd) this.herd.setPBREnabled(enabled);
    }

    turnSelectedCow(direction = 'left') {
        const cow = this.herd ? this.herd.getSelectedCow() : null;
        if (cow) {
            const delta = direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
            if (cow.targetRotY === undefined) cow.targetRotY = cow.group.rotation.y;
            cow.targetRotY += delta;
            if (cow.behavior && cow.behavior.onTurn) {
                cow.behavior.onTurn(direction);
            }
        }
    }

    setDownerCow(enable = true) {
        const cow = this.herd ? this.herd.getSelectedCow() : null;
        if (cow && cow.behavior && cow.behavior.setDownerCow) {
            cow.behavior.setDownerCow(enable);
        }
    }

    setHorns(enabledOrScale) {
        if (this.herd) {
            this.herd.setHorns(this.herd.selectedCowIndex, enabledOrScale);
        }
    }

    setCameraMode(mode) {
        this.cameraMode = mode;
        switch(mode) {
            case 'solo': // Studio focus op individuele koe
                this.controls.enabled = true;
                this.camera.position.set(-4.5, 1.6, 3.6);
                this.controls.target.set(0, 0.9, 0);
                this.controls.update();
                break;
            case 'orbit':
                this.controls.enabled = true;
                this.camera.position.set(-6.5, 4.0, -6.0);
                this.controls.target.set(0, 0.8, 0.4);
                break;
            case 'herd': // Totaaloverzicht van alle 4 de koeien
                this.controls.enabled = true;
                this.camera.position.set(-8.5, 5.5, -8.0);
                this.controls.target.set(0, 0.8, 0.4);
                break;
            case 'focus': // Focus op actueel geselecteerde koe
                this.controls.enabled = true;
                if (this.herd) {
                    const cow = this.herd.getSelectedCow();
                    const pos = cow ? cow.model.position : new THREE.Vector3(0, 0, 0);
                    this.camera.position.set(pos.x - 3.2, pos.y + 1.6, pos.z - 3.2);
                    this.controls.target.set(pos.x, pos.y + 0.9, pos.z);
                }
                break;
            case 'interaction': // Close-up van allogrooming & kopinteracties
                this.controls.enabled = true;
                this.camera.position.set(0.5, 1.8, 4.2);
                this.controls.target.set(0.4, 1.1, 0.9);
                break;
            case 'comparison': // Frontaal panorama voor de 4 lopende koeien
                this.controls.enabled = true;
                this.camera.position.set(-1.0, 2.5, 9.5);
                this.controls.target.set(-1.0, 0.9, 0);
                break;
            case 'side': // Ganganalyse & rugboog
                this.controls.enabled = false;
                this.camera.position.set(-6.5, 1.4, 0);
                this.camera.lookAt(0, 1.1, 0);
                break;
            case 'front': // Kopknik & abductie aanzicht
                this.controls.enabled = false;
                this.camera.position.set(0, 1.5, 6.5);
                this.camera.lookAt(0, 1.1, 0);
                break;
            case 'top': // Wervelkolom & bekkenkanteling (bovenaanzicht)
                this.controls.enabled = false;
                this.camera.position.set(0, 7.5, 0.1);
                this.camera.lookAt(0, 0.8, 0);
                break;
            case 'head': // Close-up herkauwen, oren, bek & oogleden
                this.controls.enabled = false;
                this.camera.position.set(-1.4, 1.35, 1.8);
                this.camera.lookAt(0, 1.2, 1.2);
                break;
        }
        this.controls.update();
    }

    // ── Resize ─────────────────────────────────────────────────────────────
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ── Animatie-lus ───────────────────────────────────────────────────────
    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const dt = Math.min(this.clock.getDelta(), 0.05); // max 50ms

        // Update gehele kudde (mixers, posities, rotaties, en sociale interacties)
        if (this.herd) {
            this.herd.update(dt);
            this.behavior = this.herd.getSelectedBehavior();

            // Bijwerk IK-target helpers van geselecteerde koe
            const targets = this.herd.getIKTargets();
            if (targets) {
                ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
                    if (this.ikTargetMeshes[leg] && targets[leg]) {
                        this.ikTargetMeshes[leg].position.copy(targets[leg]);
                    }
                });
            }

            // Update live research telemetrie in UI
            if (this.ui && this.ui.updateTelemetry && this.behavior) {
                this.ui.updateTelemetry(this.behavior.telemetry);
            }
        }

        // OrbitControls damping
        if (this.controls.enabled) this.controls.update();

        // Update weiland / polder omgevingsanimatie (wind, wolken)
        if (this.env) this.env.update(dt);

        // FPS meten
        this.frameCount++;
        this.fpsTime += dt;
        if (this.fpsTime >= 0.5) {
            const fps = Math.round(this.frameCount / this.fpsTime);
            const fpsEl = document.getElementById('fps-counter');
            if (fpsEl) fpsEl.textContent = `FPS: ${fps}`;
            this.frameCount = 0;
            this.fpsTime = 0;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hulpfunctie: retarget een FBX AnimationClip naar de botten van het model
// ─────────────────────────────────────────────────────────────────────────────
function retargetClipToModel(clip, model) {
    const boneNames = new Set();
    model.traverse(obj => { if (obj.isBone) boneNames.add(obj.name); });
    if (boneNames.size === 0) return clip;

    const validTracks = clip.tracks.filter(track => {
        const boneName = track.name.split('.')[0];
        return boneNames.has(boneName);
    });

    if (validTracks.length === 0) return clip;
    return new THREE.AnimationClip(clip.name, clip.duration, validTracks);
}

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    new SceneController();
});
