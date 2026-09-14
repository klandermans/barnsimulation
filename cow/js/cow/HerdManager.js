/**
 * HerdManager.js — Kuddebeheer & Sociale Interacties tussen 4 Koeien
 * Onderzoekskader: Bouissou et al. (2001), Broom & Fraser (2015), Laister et al. (2011), Rook & Huckle (1997)
 * 
 * Beheert 4 individuele melkkoeien met unieke fenotypen (vachten), sociale rangorde,
 * en interactieve choreografieën (allogrooming, dominantiedreiging, kuddesynchronisatie,
 * en simultane klinische gangwerkvergelijking).
 */

import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CowBehavior } from './CowBehavior.js';
import { BreedingManager } from './BreedingValues.js';
import { ProceduralSkinGenerator } from './ProceduralSkinGenerator.js';

export class HerdManager {
    constructor(scene, baseModel, animClips, textures, poseTemplates = {}) {
        this.scene = scene;
        this.baseModel = baseModel;
        this.animClips = animClips;
        this.textures = textures;
        this.poseTemplates = poseTemplates;
        this.time = 0;

        this.cows = [];
        this.selectedCowIndex = 0;
        this.currentInteraction = 'free';
        this.displayMode = 'solo';
        this.skeletonVisible = false;
        this.pbrEnabled = true;

        this.skinGenerator = new ProceduralSkinGenerator();

        this._initHerd();
    }

    _initHerd() {
        const cowConfigs = [
            {
                id: 0,
                name: 'Bertha (Zwartbont)',
                breed: 'Holstein-Friesian Zwartbont',
                role: 'All-Round Melkkoe',
                pos: new THREE.Vector3(0, 0, 0),
                rotY: 0,
                texture: this.textures.baseBlackWhite,
                defaultGait: 'walk',
                defaultScore: 1.0,
                parity: 3,           // Volwassen 3e kalfs
                gestationDays: 140,  // Midden-dracht (5 maanden)
                bcs: 3.0,            // Optimaal
                hasHorns: true,      // Gehoornd (standaard)
                hornScale: 1.0,
            },
            {
                id: 1,
                name: 'Clara (Roodbont)',
                breed: 'Maas-Rijn-IJssel (MRIJ) Roodbont',
                role: 'Keurings- & Exterieurkoe',
                pos: new THREE.Vector3(0, 0, 0),
                rotY: 0,
                texture: this.textures.brown,
                defaultGait: 'walk',
                defaultScore: 1.0,
                parity: 2,           // 2e kalfs (vroege lactatie)
                gestationDays: 45,   // Vroege dracht
                bcs: 2.75,          // Melktypisch
                hasHorns: true,      // Gehoornd
                hornScale: 1.0,
            },
            {
                id: 2,
                name: 'Mina (Blaarkop)',
                breed: 'Groninger Blaarkop',
                role: 'Robuuste Weidekoe',
                pos: new THREE.Vector3(0, 0, 0),
                rotY: 0,
                texture: this.textures.blaarkop || this.textures.baseBlackWhite,
                defaultGait: 'grazing',
                defaultScore: 1.0,
                parity: 4,           // Oudere meerkalfs
                gestationDays: 240,  // Hoogdrachtig
                bcs: 3.5,            // Weideconditie
                hasHorns: true,      // Authentiek gehoornd Groninger weideras
                hornScale: 1.0,
            },
            {
                id: 3,
                name: 'Emma (Vaars)',
                breed: 'Holstein-Friesian Vaars',
                role: 'Jonge 1e Kalfs Vaars',
                pos: new THREE.Vector3(0, 0, 0),
                rotY: 0,
                texture: this.textures.black,
                defaultGait: 'idle',
                defaultScore: 1.0,
                parity: 0,           // Vaars / Pink (strak vaarzenuier)
                gestationDays: 0,    // Niet drachtig
                bcs: 3.25,          // Jeugdig compact
                hasHorns: false,     // Onthoorn
                hornScale: 0.0,
            },
        ];

        cowConfigs.forEach((cfg, idx) => {
            // Container groep voor deze koe
            const cowGroup = new THREE.Group();
            cowGroup.name = `CowGroup_${idx}`;
            this.scene.add(cowGroup);

            // 1. Geanimeerd loop- en bewegingsmodel (cow_walk.glb)
            const walkModel = SkeletonUtils.clone(this.baseModel);
            cowGroup.add(walkModel);

            // Kloon geometrie en materialen zodat elke koe een unieke vachttextuur en onafhankelijke anatomische BCS-sculptuur heeft
            walkModel.traverse(obj => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                    if (obj.geometry) {
                        const origBase = obj.geometry.userData.basePositions;
                        obj.geometry = obj.geometry.clone();
                        if (origBase) {
                            obj.geometry.userData.basePositions = new Float32Array(origBase);
                        } else if (obj.geometry.attributes.position) {
                            obj.geometry.userData.basePositions = new Float32Array(obj.geometry.attributes.position.array);
                        }
                    }
                    if (obj.material) {
                        obj.material = Array.isArray(obj.material)
                            ? obj.material.map(m => m.clone())
                            : obj.material.clone();
                    }
                }
            });
            if (cfg.texture) {
                this._applyTextureToModel(walkModel, cfg.texture);
            }
            walkModel.position.set(0, 0.005, 0);

            // Plaatsing in de wereld (container groep)
            cowGroup.position.copy(cfg.pos);
            cowGroup.position.y = 0.005;
            cowGroup.rotation.y = cfg.rotY;

            // Mixer & Gedrag op de authentieke Melkkoe
            const mixer = new THREE.AnimationMixer(walkModel);
            const behavior = new CowBehavior(mixer, this.animClips, walkModel, idx, {
                group: cowGroup
            });
            behavior.isSelected = (idx === 0);

            // Stel zoötechnische kenmerken in
            behavior.state.parity = cfg.parity;
            behavior.state.gestationDays = cfg.gestationDays;
            behavior.state.bcs = cfg.bcs;
            behavior.setHorns(cfg.hornScale !== undefined ? cfg.hornScale : (cfg.hasHorns ? 1.0 : 0.0));

            // Fokkerij (NVI / CRV)
            const breedingManager = new BreedingManager();
            const presets = ['delta_framework_red', 'delta_framework_red', 'pasture_health', 'show_conformation'];
            breedingManager.setPreset(presets[idx] || 'delta_framework_red');
            behavior.breedingManager = breedingManager;

            // Stel initiële toestand in
            behavior.setGait(cfg.defaultGait);
            if (cfg.id === 2) {
                // Koe 3 herkauwt vredig in de wei
                behavior.state.ruminating = true;
                behavior.state.ruminateRate = 58;
            }

            // Skelet-helper voor deze koe
            const skeletonHelper = new THREE.SkeletonHelper(walkModel);
            skeletonHelper.visible = false;
            this.scene.add(skeletonHelper);

            this.cows.push({
                id: cfg.id,
                name: cfg.name,
                breed: cfg.breed,
                role: cfg.role,
                group: cowGroup,
                model: walkModel,
                mixer: mixer,
                behavior: behavior,
                skeletonHelper: skeletonHelper,
                basePos: cfg.pos.clone(),
                targetPos: cfg.pos.clone(),
                baseRotY: cfg.rotY,
                targetRotY: cfg.rotY,
            });
        });

        // Focus op 1 koe: verberg direct alle andere koeien
        this.cows.forEach((c, i) => {
            c.group.visible = (i === 0);
            if (c.skeletonHelper) c.skeletonHelper.visible = false;
        });
    }

    _applyTextureToModel(model, tex, resetTint = true) {
        if (!tex || !model) return;
        model.traverse(obj => {
            if (obj.isMesh && obj.material) {
                if (obj.geometry && obj.geometry.attributes.uv && !obj.geometry.attributes.uv2) {
                    obj.geometry.attributes.uv2 = obj.geometry.attributes.uv;
                }
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach(m => {
                    m.map = tex;
                    if (resetTint) m.color.setHex(0xffffff);
                    if (this.textures && this.textures.pbr && this.pbrEnabled !== false) {
                        m.normalMap = this.textures.pbr.normal;
                        if (!m.normalScale) m.normalScale = new THREE.Vector2(0.85, 0.85);
                        else m.normalScale.set(0.85, 0.85);
                        m.aoMap = this.textures.pbr.ao;
                        m.aoMapIntensity = 0.75;
                        m.roughnessMap = this.textures.pbr.roughness;
                        m.roughness = 0.75;
                        m.metalness = 0.05;
                    }
                    m.needsUpdate = true;
                });
            }
        });
    }

    /**
     * Genereert een nieuwe procedurale vacht voor de geselecteerde koe (of alle koeien)
     */
    generateProceduralSkin(options = {}) {
        const cow = (this.selectedCowIndex === 'all') ? this.cows[0] : this.getSelectedCow();
        if (!cow) return;

        const res = this.skinGenerator.generateSkin(options);
        if (res && res.texture) {
            if (this.selectedCowIndex === 'all') {
                this.cows.forEach(c => this._applyTextureToModel(c.model, res.texture));
            } else {
                this._applyTextureToModel(cow.model, res.texture);
            }
        }
        return res;
    }

    /**
     * Randomizeert de gehele kudde (4 unieke procedurale vachten, variërende body scales en BCS)
     */
    randomizeEntireHerd() {
        const patterns = ['holstein', 'roodbont', 'blaarkop', 'lakenvelder'];
        this.cows.forEach((cow, i) => {
            const pat = patterns[i % patterns.length];
            const density = 0.25 + Math.random() * 0.55;
            const res = this.skinGenerator.generateSkin({
                pattern: pat,
                seed: Math.floor(Math.random() * 999999),
                density: density,
                spotSize: 0.8 + Math.random() * 0.5
            });
            if (res && res.texture) {
                this._applyTextureToModel(cow.model, res.texture);
            }
            this.skinGenerator.randomizeConformation(cow);
        });
    }

    /**
     * Past snelle domain randomization (kleurtint) toe op de geselecteerde koe of hele kudde
     */
    applyDomainRandomization(breedType = 'random') {
        if (this.selectedCowIndex === 'all') {
            this.cows.forEach(c => this.skinGenerator.applyDomainRandomization(c.model, breedType));
        } else {
            const cow = this.getSelectedCow();
            if (cow) this.skinGenerator.applyDomainRandomization(cow.model, breedType);
        }
    }

    /**
     * Randomizeert morfologie (girth, lengte, schofthoogte, BCS)
     */
    randomizeConformation(cowIndex) {
        const idx = cowIndex !== undefined ? cowIndex : this.selectedCowIndex;
        if (idx === 'all') {
            this.cows.forEach(c => this.skinGenerator.randomizeConformation(c));
        } else {
            const cow = this.cows[idx] || this.getSelectedCow();
            if (cow) this.skinGenerator.randomizeConformation(cow);
        }
    }

    /**
     * Stelt hoornstatus in voor een specifieke koe of de gehele kudde
     * @param {number|'all'} cowIndex
     * @param {boolean|number} enabledOrScale - true/false of numerieke schaal (0.0=onthoorn, 1.0=gehoornd)
     */
    setHorns(cowIndex, enabledOrScale) {
        const idx = cowIndex !== undefined ? cowIndex : this.selectedCowIndex;
        if (idx === 'all') {
            this.cows.forEach(c => {
                if (c && c.behavior) c.behavior.setHorns(enabledOrScale);
            });
        } else {
            const cow = this.cows[idx] || this.getSelectedCow();
            if (cow && cow.behavior) {
                cow.behavior.setHorns(enabledOrScale);
            }
        }
    }

    /**
     * Schakelt PBR-reliëflagen (normalMap, aoMap, roughnessMap) in of uit
     */
    setPBREnabled(enabled) {
        this.pbrEnabled = enabled;
        this.cows.forEach(cow => {
            cow.model.traverse(obj => {
                if (obj.isMesh && obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach(m => {
                        if (enabled && this.textures && this.textures.pbr) {
                            m.normalMap = this.textures.pbr.normal;
                            m.aoMap = this.textures.pbr.ao;
                            m.roughnessMap = this.textures.pbr.roughness;
                            m.roughness = 0.75;
                            m.metalness = 0.05;
                        } else {
                            m.normalMap = null;
                            m.aoMap = null;
                            m.roughnessMap = null;
                            m.roughness = 0.6;
                            m.metalness = 0.0;
                        }
                        m.needsUpdate = true;
                    });
                }
            });
        });
    }

    /**
     * Stel weergavemodus in: 'solo' (1 koe) of 'herd' (alle 4 koeien)
     */
    setDisplayMode(mode) {
        this.displayMode = mode;
        if (mode === 'solo') {
            const idx = (this.selectedCowIndex === 'all') ? 0 : this.selectedCowIndex;
            this.selectedCowIndex = idx;
            this.cows.forEach((c, i) => {
                const isTarget = (i === idx);
                c.group.visible = isTarget;
                if (c.skeletonHelper) c.skeletonHelper.visible = (isTarget && this.skeletonVisible);
                if (isTarget) {
                    c.targetPos.set(0, 0, 0);
                    c.targetRotY = 0;
                    c.group.position.x = 0;
                    c.group.position.z = 0;
                    c.group.rotation.y = 0;
                }
            });
        } else {
            this.cows.forEach(c => {
                c.group.visible = true;
                if (c.skeletonHelper) c.skeletonHelper.visible = this.skeletonVisible;
            });
            this.setInteraction(this.currentInteraction || 'free');
        }
    }

    /**
     * Selecteer een koe om te bedienen via het hoofdpaneel
     */
    selectCow(index) {
        if (index === 'all') {
            if (this.displayMode === 'solo') {
                index = 0;
            } else {
                this.selectedCowIndex = 'all';
                return this.cows[0].behavior;
            }
        }

        const idx = Math.max(0, Math.min(this.cows.length - 1, parseInt(index)));
        this.selectedCowIndex = idx;
        this.cows.forEach((c, i) => {
            c.behavior.isSelected = (i === idx);
            if (this.displayMode === 'solo') {
                const isTarget = (i === idx);
                c.group.visible = isTarget;
                if (c.skeletonHelper) c.skeletonHelper.visible = (isTarget && this.skeletonVisible);
                if (isTarget) {
                    c.targetPos.set(0, 0, 0);
                    c.targetRotY = 0;
                    c.group.position.x = 0;
                    c.group.position.z = 0;
                    c.group.rotation.y = 0;
                }
            }
        });
        return this.cows[idx].behavior;
    }

    getSelectedCow() {
        if (this.selectedCowIndex === 'all') return this.cows[0];
        return this.cows[this.selectedCowIndex] || this.cows[0];
    }

    getSelectedBehavior() {
        return this.getSelectedCow().behavior;
    }

    /**
     * Stel een sociale interactie of kudde-choreografie in
     */
    setInteraction(mode) {
        this.currentInteraction = mode;

        // Als we in solo waren en een interactie starten, toon dan weer alle 4 de dieren
        if (this.displayMode === 'solo') {
            this.displayMode = 'herd';
            this.cows.forEach(c => {
                c.group.visible = true;
                if (c.skeletonHelper) c.skeletonHelper.visible = this.skeletonVisible;
            });
        }

        // Reset specifieke sociale flags op alle koeien
        this.cows.forEach(c => {
            c.behavior.state.allogroomingActive = false;
            c.behavior.state.allogroomingReceiver = false;
            c.behavior.state.headAversion = false;
            c.behavior.state.socialSniffing = false;
            c.behavior.state.headButtThreat = false;
            c.behavior.state.flehmen = false;
        });

        switch(mode) {
            case 'allogrooming':
                this._setupAllogrooming();
                break;
            case 'dominance':
                this._setupDominance();
                break;
            case 'greeting':
                this._setupGreeting();
                break;
            case 'sync_grazing':
                this._setupSyncGrazing();
                break;
            case 'sync_resting':
                this._setupSyncResting();
                break;
            case 'clinical_comparison':
                this._setupClinicalComparison();
                break;
            case 'free':
            default:
                this._setupFreeHerd();
                break;
        }
    }

    // ── 1. Allogrooming (Sociaal Likken) ──────────────────────────────────────
    // Laister et al. (2011): Onderling likken van hals/schoft verlaagt meetbaar de hartslag
    _setupAllogrooming() {
        // Koe 1 (Ontvanger) staat stil
        const cow1 = this.cows[0];
        cow1.targetPos.set(0, 0, 0.2);
        cow1.targetRotY = 0.1;
        cow1.behavior.setGait('idle');
        cow1.behavior.state.allogroomingReceiver = true;

        // Koe 4 (Likker) nadert de hals/schoft van Koe 1
        const cow4 = this.cows[3];
        cow4.targetPos.set(0.72, 0, 1.25);
        cow4.targetRotY = 2.45; // Schuin naar de schoft van Koe 1
        cow4.behavior.setGait('idle');
        cow4.behavior.state.allogroomingActive = true;

        // Koe 2 graast rustig op de achtergrond
        const cow2 = this.cows[1];
        cow2.targetPos.set(-3.2, 0, -0.8);
        cow2.targetRotY = 0.35;
        cow2.behavior.setGait('grazing');

        // Koe 3 ligt en herkauwt
        const cow3 = this.cows[2];
        cow3.targetPos.set(3.0, 0, -1.0);
        cow3.targetRotY = -0.7;
        cow3.behavior.setGait('lyingSternal');
        cow3.behavior.state.ruminating = true;
    }

    // ── 2. Dominantie & Agonistisch Dreigen ───────────────────────────────────
    // Bouissou et al. (2001): Dominante koe toont dreighouding; ondergeschikte wendt de kop af en wijkt uit
    _setupDominance() {
        // Koe 1 (Dominante leidingkoe) toont dreighouding
        const cow1 = this.cows[0];
        cow1.targetPos.set(-0.6, 0, 0);
        cow1.targetRotY = -1.57; // Frontaal gericht op Koe 2
        cow1.behavior.setGait('idle');
        cow1.behavior.state.headButtThreat = true;

        // Koe 2 (Ondergeschikt) wendt kop zijdelings af en stapt achteruit
        const cow2 = this.cows[1];
        cow2.targetPos.set(-2.8, 0, 0);
        cow2.targetRotY = 1.57; // Naar Koe 1 gericht maar kop afgewend
        cow2.behavior.setGait('backingUp');
        cow2.behavior.state.headAversion = true;

        // Overige koeien houden afstand
        const cow3 = this.cows[2];
        cow3.targetPos.set(2.4, 0, -1.5);
        cow3.targetRotY = -0.5;
        cow3.behavior.setGait('grazing');

        const cow4 = this.cows[3];
        cow4.targetPos.set(1.6, 0, 1.8);
        cow4.targetRotY = 2.2;
        cow4.behavior.setGait('idleRest');
    }

    // ── 3. Neus-aan-Neus Snuffelen & Begroeting ───────────────────────────────
    // Olfactorische herkenning via het vomeronasale orgaan
    _setupGreeting() {
        const cow1 = this.cows[0];
        cow1.targetPos.set(0, 0, -0.75);
        cow1.targetRotY = 0;
        cow1.behavior.setGait('idle');
        cow1.behavior.state.socialSniffing = true;

        const cow4 = this.cows[3];
        cow4.targetPos.set(0, 0, 0.75);
        cow4.targetRotY = Math.PI; // Frontaal neus-aan-neus
        cow4.behavior.setGait('idle');
        cow4.behavior.state.socialSniffing = true;
        cow4.behavior.state.flehmen = true;

        const cow2 = this.cows[1];
        cow2.targetPos.set(-3.2, 0, 0);
        cow2.targetRotY = 0.5;
        cow2.behavior.setGait('grazing');

        const cow3 = this.cows[2];
        cow3.targetPos.set(3.2, 0, 0);
        cow3.targetRotY = -0.5;
        cow3.behavior.setGait('grazing');
    }

    // ── 4. Kudde Synchroon Grazen (Rook & Huckle 1997) ───────────────────────
    _setupSyncGrazing() {
        const coords = [
            { pos: new THREE.Vector3(-1.8, 0, 1.4), rot: 0.1 },
            { pos: new THREE.Vector3(-3.6, 0, -0.6), rot: 0.2 },
            { pos: new THREE.Vector3(1.6, 0, -1.0), rot: -0.15 },
            { pos: new THREE.Vector3(3.6, 0, 1.0), rot: 0.05 },
        ];
        this.cows.forEach((c, idx) => {
            c.targetPos.copy(coords[idx].pos);
            c.targetRotY = coords[idx].rot;
            c.behavior.setGait('grazing');
            c.behavior.setLamenessPreset('healthy');
        });
    }

    // ── 5. Kudde Rust & Herkauwen ─────────────────────────────────────────────
    _setupSyncResting() {
        // Koe 1 waakt
        this.cows[0].targetPos.set(0, 0, 2.0);
        this.cows[0].targetRotY = 0;
        this.cows[0].behavior.setGait('idle');

        // Koe 2 en 3 liggen in borstligging en herkauwen
        this.cows[1].targetPos.set(-2.8, 0, -0.6);
        this.cows[1].targetRotY = 0.4;
        this.cows[1].behavior.setGait('lyingSternal');
        this.cows[1].behavior.state.ruminating = true;
        this.cows[1].behavior.state.ruminateRate = 60;

        this.cows[2].targetPos.set(2.6, 0, -1.0);
        this.cows[2].targetRotY = -0.6;
        this.cows[2].behavior.setGait('lyingSternal');
        this.cows[2].behavior.state.ruminating = true;
        this.cows[2].behavior.state.ruminateRate = 56;

        // Koe 4 rust op 3 poten
        this.cows[3].targetPos.set(0.6, 0, -2.4);
        this.cows[3].targetRotY = 1.9;
        this.cows[3].behavior.setGait('idleRest');
    }

    // ── 6. Simultane Klinische Gangvergelijking (4 Looppatronen) ─────────────
    // Directe veterinaire benchmark: 4 koeien lopen naast elkaar
    _setupClinicalComparison() {
        const comparisonSetups = [
            { x: -4.5, preset: 'healthy',        desc: 'Gezond (Score 1.0)' },
            { x: -1.5, preset: 'single_fl',      desc: 'Linksvoor (LV 3.5 — Kop OMHOOG)' },
            { x:  1.5, preset: 'single_hl',      desc: 'Linksachter (LA 4.0 — Abductie & Kop OMLAAG)' },
            { x:  4.5, preset: 'bilateral_hind', desc: 'Bilateraal Achter (LA+RA 3.5 — Breedsporig)' },
        ];

        this.cows.forEach((c, idx) => {
            const cfg = comparisonSetups[idx];
            c.targetPos.set(cfg.x, 0, 0);
            c.targetRotY = 0; // Allemaal voorwaarts gericht
            c.behavior.setGait('walk');
            c.behavior.setLamenessPreset(cfg.preset);
        });
    }

    // ── 7. Vrije Autonome Kudde ──────────────────────────────────────────────
    _setupFreeHerd() {
        const defaultPositions = [
            { pos: new THREE.Vector3(0.3, 0, 0.6),   rot: 0,    gait: 'walk',         ruminate: false },
            { pos: new THREE.Vector3(-2.6, 0, -0.4), rot: 0.4,  gait: 'grazing',      ruminate: false },
            { pos: new THREE.Vector3(-0.6, 0, -1.8), rot: -0.4, gait: 'lyingSternal',  ruminate: true },
            { pos: new THREE.Vector3(0.9, 0, 2.6),   rot: 2.5,  gait: 'idle',         ruminate: false },
        ];

        this.cows.forEach((c, idx) => {
            const def = defaultPositions[idx];
            c.targetPos.copy(def.pos);
            c.targetRotY = def.rot;
            c.behavior.setGait(def.gait);
            c.behavior.state.ruminating = def.ruminate;
            c.behavior.setLamenessPreset('healthy');
        });
    }

    // ── Update per animatiefilmpje (elke frame in animate loop) ──────────────
    update(dt) {
        this.time += dt;

        // In solo-modus: focus 100% op de geselecteerde koe (centraal op 0,0,0)
        if (this.displayMode === 'solo') {
            const activeCow = this.cows[this.selectedCowIndex] || this.cows[0];
            if (activeCow) {
                activeCow.group.position.set(0, 0.005, 0);
                if (activeCow.targetRotY === undefined) activeCow.targetRotY = 0;
                let diffRot = activeCow.targetRotY - activeCow.group.rotation.y;
                while (diffRot < -Math.PI) diffRot += Math.PI * 2;
                while (diffRot > Math.PI) diffRot -= Math.PI * 2;
                activeCow.group.rotation.y += diffRot * Math.min(1.0, dt * 3.5);

                if (activeCow.mixer) activeCow.mixer.update(dt);
                if (activeCow.behavior) activeCow.behavior.update(dt);
            }
            return;
        }

        // Vloeiende interpolatie (lerp) naar de doelposities en rotaties van de containergroepen
        this.cows.forEach(cow => {
            // Lerp positie in X en Z van de container groep
            cow.group.position.x = THREE.MathUtils.lerp(cow.group.position.x, cow.targetPos.x, dt * 2.5);
            cow.group.position.z = THREE.MathUtils.lerp(cow.group.position.z, cow.targetPos.z, dt * 2.5);
            cow.group.position.y = 0.005; // Klauwen en lichaam blijven rotsvast op maaiveld Y=0!

            // Sferische rotatie interpolatie om de Y-as
            let diffRot = cow.targetRotY - cow.group.rotation.y;
            while (diffRot < -Math.PI) diffRot += Math.PI * 2;
            while (diffRot > Math.PI) diffRot -= Math.PI * 2;
            cow.group.rotation.y += diffRot * Math.min(1.0, dt * 3.0);

            // Update mixer & biologische gedragsmachine
            if (cow.mixer) cow.mixer.update(dt);
            if (cow.behavior) cow.behavior.update(dt);
        });
    }

    // ── Display & Weergave Toggles ───────────────────────────────────────────
    toggleSkeleton(visible) {
        this.skeletonVisible = visible;
        this.cows.forEach((c, i) => {
            if (c.skeletonHelper) {
                if (this.displayMode === 'solo') {
                    c.skeletonHelper.visible = visible && (i === this.selectedCowIndex);
                } else {
                    c.skeletonHelper.visible = visible;
                }
            }
        });
    }

    setWireframe(enabled) {
        this.cows.forEach(c => {
            const models = [c.model, c.lyingModel, c.eatingModel].filter(Boolean);
            models.forEach(m => {
                m.traverse(obj => {
                    if (obj.isMesh && obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach(mat => mat.wireframe = enabled);
                        else obj.material.wireframe = enabled;
                    }
                });
            });
        });
    }

    applyTexture(texKey) {
        if (['lakenvelder', 'witrug', 'jersey', 'simmentaler', 'charolais', 'angus'].includes(texKey)) {
            return this.generateProceduralSkin({ pattern: texKey });
        }
        const tex = (texKey === 'redwhite') ? this.textures.brown :
                    (texKey === 'black') ? this.textures.black :
                    (texKey === 'blaarkop') ? this.textures.blaarkop : this.textures.baseBlackWhite;

        if (this.selectedCowIndex === 'all') {
            this.cows.forEach(c => {
                this._applyTextureToModel(c.model, tex);
                if (c.lyingModel) this._applyTextureToModel(c.lyingModel, tex);
                if (c.eatingModel) this._applyTextureToModel(c.eatingModel, tex);
            });
        } else {
            const cow = this.getSelectedCow();
            if (cow) {
                this._applyTextureToModel(cow.model, tex);
                if (cow.lyingModel) this._applyTextureToModel(cow.lyingModel, tex);
                if (cow.eatingModel) this._applyTextureToModel(cow.eatingModel, tex);
            }
        }
    }

    getIKTargets() {
        return this.getSelectedBehavior().getIKTargets();
    }
}
