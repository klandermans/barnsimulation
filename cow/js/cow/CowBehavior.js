/**
 * CowBehavior.js — Complete Ethologische & Biomechanische Gedragsengine voor Rundvee
 *
 * Bevat de volledige wetenschappelijke taxonomie van rundveegedragingen:
 * 1. Locomotie & Spel (Stap, Draf, Koeiendans/Bokken, Grazen, Voerhek, Drinken, 3-potenstand, Achteruit)
 * 2. Kreupelheidsschaal (Sprecher 1-5, LV/RV/LA/RA, kopknik, abductie, duty cycle)
 * 3. Lighoudingen & Transities (Opstaan: achterhand eerst, Neerliggen, Borstligging, Zijligging, Hondenzit)
 * 4. Sociaal & Reproductief (Tochtigheid, Flehmen lipkrul, Loeien, Dreighouding, Bespringen)
 * 5. Comfort & Verzorging (Flanklikken, Kopschudden, Pootstampen, Oorflikkeren, Staartzwiepen)
 * 6. Stress & Gezondheid (Hittestress Panting 0-4, Tong uitsteken, Buikpijn/Zaagbokshouding, Pijngezicht, Lethargisch)
 * 7. Eliminatie (Mesten, Plassen)
 * 8. Vertering (Herkauwen 55-70 bpm met slokdarmslikgolf)
 * 9. Anatomische Kinetica (Vrije scapula, Reciproque apparaat, Kootgewricht doorvering, Oogknipperen)
 */

import * as THREE from 'three';
import { PhysicsSpring } from '../utils/PhysicsSpring.js';

const _tempEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const _tempQuat  = new THREE.Quaternion();
const _tempVecGuard   = new THREE.Vector3();
const _tempMatGuard   = new THREE.Matrix4();
const _tempDeltaGuard = new THREE.Vector3();

// 4-takt hoefimpact fasen in loopcyclus (FL -> HR -> FR -> HL)
const GAIT_STRIKE_PHASES = {
    FL: 0.08, // Linksvoor (LV)
    HR: 0.33, // Rechtsachter (RA)
    FR: 0.58, // Rechtsvoor (RV)
    HL: 0.83, // Linksachter (LA)
};

export class CowBehavior {
    constructor(mixer, animClips, model, cowIndex = 0, poseOptions = {}) {
        this.cowIndex = cowIndex;
        this.isSelected = (cowIndex === 0);
        this.mixer = mixer;
        this.clips = animClips;
        this.model = model;
        this.poseOptions = poseOptions;
        this.lyingModel = poseOptions.lyingModel || null;
        this.eatingModel = poseOptions.eatingModel || null;
        this.cowGroup = poseOptions.group || null;
        this.transitionTimer = 0;
        this.time  = cowIndex * 1.73; // Offset zodat koeien niet identiek synchroon ademen

        // ── Volledige State Machine van Alle Rundergedragingen ─────────────────
        this.state = {
            // Locomotie & Gangwerk
            gait:               'walk',      // 'walk'|'trot'|'gallopPlay'|'idle'|'idleRest'|'grazing'|'eatingBunk'|'drinking'|'lieDown'|'standUp'|'lyingSternal'|'lyingLateral'|'backingUp'
            walkSpeed:          1.0,         // 0.3 - 2.0 m/s

            // Kreupelheid per hoef (Sprecher 1-5 multilateraal)
            hoofScores:         { FL: 1.0, FR: 1.0, HL: 1.0, HR: 1.0 },
            locomotionScore:    1.0,         // 1.0 t/m 5.0 (max van alle hoeven)
            lameLeg:            'FL',        // 'FL' (LV), 'FR' (RV), 'HL' (LA), 'HR' (RA)

            // Lichaamsconditie & Fysiologie
            rumenFill:          0.65,        // 0=ingevallen, 1=volle pens links
            rumenScore:         3.0,         // Jan Hulsen Zaagmethode: 1.0 (diep hol) t/m 5.0 (bol)
            dungScore:          3.0,         // Mestconsistentie: 1 (waterdun) t/m 5 (paardenvijgen)
            hockScore:          1.0,         // Hak- en kniebeschadiging: 1 (gaaf) t/m 4 (bursitis)
            teatScore:          1.0,         // Speenconditiescore: 1 (glad) t/m 4 (bloemkool/eeltkraag)
            udderFill:          0.50,        // 0=leeg, 1=vol
            breathingRate:      26,          // 15 - 100+ bpm

            // Zoötechniek & Lichaamsconditie (Ferguson et al. 1994 / Edmonson et al. 1989)
            parity:             2,           // 0=vaars, 1=eersterangs, 2-3=volwassen, 4-5=oudere meerkalfs
            gestationDays:      0,           // 0 - 282 dagen (rund ~280d)
            bcs:                3.0,         // Body Condition Score: 1.0 - 5.0 (stappen 0.25)
            hasHorns:           true,        // false = Onthoorn / Hoornloos (polled), true = Gehoornd
            hornScale:          1.0,         // 0.0 = Glad onthoorn, 0.35 = Scurs / Stompen, 1.0 = Gehoornd, 1.3 = Lang

            // Micro-gedragingen: Vertering & Voeding
            ruminating:         false,       // Herkauwen
            ruminateRate:       60,          // 50-70 kauwslagen/min

            // Micro-gedragingen: Sociaal & Reproductie
            estrus:             false,       // Tochtigheid (sta-tocht)
            flehmen:            false,       // Flehmen respons (lipkrul)
            bellowing:          false,       // Loeien
            headButtThreat:     false,       // Dreighouding (kop laag, hoorns voorwaarts)
            mounting:           false,       // Bespringen / rijden

            // Sociale & Kudde-Interacties (Onderzoek Broom & Fraser 2015 / Bouissou 2001)
            allogroomingActive:   false,     // Likken van partner (hals/schoft, Laister 2011)
            allogroomingReceiver: false,     // Ontvanger van allogrooming (hartslagverlaging)
            headAversion:         false,     // Onderdanig afwenden van de kop
            socialSniffing:       false,     // Neus-aan-neus snuffelen / begroeting

            // Micro-gedragingen: Zelfverzorging & Comfort
            flankLicking:       false,       // Zelf likken op flank
            headShake:          false,       // Vliegenschudden
            footStamping:       false,       // Pootstampen tegen vliegen
            earFlickL:          false,       // Oorlinks richten
            earFlickR:          false,       // Oorrechts richten
            tailSwish:          0.25,        // Staartzwaai-intensiteit
            tailSwishIntensity: 0.25,

            // Micro-gedragingen: Pathologie, Gezondheid & Stress
            heatStress:         false,       // Hittestress (hijgen)
            pantingScore:       0,           // 0-4 schaal
            bovinePainFace:     false,       // Gleerup et al. 2015
            sawhorseStance:     false,       // Buikpijn zaagbokshouding
            lethargic:          false,       // Ziek/lusteloos
            dogSitting:         false,       // Paralyse nervus obturatorius

            // Micro-gedragingen: Uitscheiding
            defecation:         false,       // Mesten
            urination:          false,       // Plassen

            // Biomechanische Kinetica Toggles (Onderzoeks-validatie)
            enableSynsarcosis:  true,        // Dorsale scapula translatie
            enableReciprocal:   true,        // Reciproque apparaat achterhand
            enableFetlockSpring:true,        // Kogelgewricht doorvering
            enableEyelidBlink:  true,        // Knipperen
        };

        // ── Live Telemetrie ───────────────────────────────────────────────────
        this.telemetry = {
            cyclePhase: 0,
            dutyCycles: { FL: 0.62, FR: 0.62, HL: 0.62, HR: 0.62 },
            grfRelief: { FL: 100, FR: 100, HL: 100, HR: 100 },
            headNodDeg: 0,
            spineArchDeg: 0,
            abductionDeg: 0,
            pelvicTiltDeg: 0,
            currentPantingScore: 0,
            chewingRateBpm: 0,
            bolusChews: 0,
        };

        // ── Actions & Clips ───────────────────────────────────────────────────
        this.actions       = {};
        this.currentAction = null;
        this._buildActions();

        // ── Timing & Sub-state Trackers ───────────────────────────────────────
        this.walkCyclePhase = 0;
        this.ruminateCycle      = 0;
        this.ruminatePaused     = false;
        this.ruminatePauseTimer = 0;
        this.bolusChewTime      = 0;
        this.blinkTimer         = 3.2;
        this.isBlinking         = false;
        this.lyingFactor        = 0;
        this.lateralLyingFactor = 0;
        this.transitionDone     = false;

        // ── Veer-fysica ───────────────────────────────────────────────────────
        this.springs = {
            udderX: new PhysicsSpring(0, 1.2, 110, 12),
            udderZ: new PhysicsSpring(0, 1.2, 110, 12),
            tailX:  new PhysicsSpring(0, 0.8,  65,  6),
            tailZ:  new PhysicsSpring(0, 0.8,  65,  6),
            earL:   new PhysicsSpring(0, 0.3, 220, 16),
            earR:   new PhysicsSpring(0, 0.3, 220, 16),
            fetlockFL: new PhysicsSpring(0, 1.0, 180, 18),
            fetlockFR: new PhysicsSpring(0, 1.0, 180, 18),
            fetlockHL: new PhysicsSpring(0, 1.0, 180, 18),
            fetlockHR: new PhysicsSpring(0, 1.0, 180, 18),
        };

        // ── Auto-ethologische timers ──────────────────────────────────────────
        this._auto = { earL: 4.2, earR: 5.8, tail: 6.5, stamp: 12.0, blink: 3.5 };

        // ── Botten cachen ─────────────────────────────────────────────────────
        this.bones = {};
        this._cacheBones();

        // ── Skinned Meshes voor anatomische BCS- & Dracht-sculptuur ───────────
        this.sculptMeshes = [];
        this._initSculptMeshes();
        this._lastConformationKey = null;

        // ── IK Targets ────────────────────────────────────────────────────────
        this.ikTargets = {
            FL: new THREE.Vector3( 0.30, 0,  0.85),
            FR: new THREE.Vector3(-0.30, 0,  0.85),
            HL: new THREE.Vector3( 0.25, 0, -0.75),
            HR: new THREE.Vector3(-0.25, 0, -0.75),
        };

        this.setGait('walk');
    }

    _cacheBones() {
        const nameMap = {
            root:          ['RigRoot', 'RootNode'],
            pelvis:        ['RigPelvis'],
            spine1:        ['RigSpine1'],
            spine2:        ['RigSpine2'],
            spine3:        ['RigSpine3'],
            chest:         ['RigChest'],
            neck1:         ['RigNeck1'],
            neck2:         ['RigNeck2'],
            neck3:         ['RigNeck3'],
            neck4:         ['RigNeck4'],
            head:          ['RigHead'],
            jaw:           ['RigJaw'],
            tongue1:       ['RigTongue1'],
            tongue2:       ['RigTongue2'],
            tongue3:       ['RigTongue3'],
            eyelidL:       ['RigLEyelid'],
            eyelidR:       ['RigREyelid'],
            eyeL:          ['RigLEye'],
            eyeR:          ['RigREye'],
            earL:          ['RigLEar'],
            earR:          ['RigREar'],
            shoulderFL:    ['RigLShoulderBlade'],
            collarFL:      ['RigLFLegCollarbone'],
            upperLegFL:    ['RigLFLeg1'],
            lowerLegFL:    ['RigLFLeg2'],
            pasternFL:     ['RigLFLeg3'],
            hoofFL:        ['RigLFLegAnkle'],
            shoulderFR:    ['RigRShoulderBlade'],
            collarFR:      ['RigRFLegCollarbone'],
            upperLegFR:    ['RigRFLeg1'],
            lowerLegFR:    ['RigRFLeg2'],
            pasternFR:     ['RigRFLeg3'],
            hoofFR:        ['RigRFLegAnkle'],
            upperLegHL:    ['RigLBLeg1'],
            lowerLegHL:    ['RigLBLeg2'],
            pasternHL:     ['RigLBLeg3'],
            hoofHL:        ['RigLBLegAnkle'],
            upperLegHR:    ['RigRBLeg1'],
            lowerLegHR:    ['RigRBLeg2'],
            pasternHR:     ['RigRBLeg3'],
            hoofHR:        ['RigRBLegAnkle'],
            tail0:         ['RigTail1'],
            tail1:         ['RigTail2'],
            tail2:         ['RigTail3'],
            tail3:         ['RigTail4'],
            tail4:         ['RigTail5'],
            tail5:         ['RigTail6'],
            udder1:        ['RigUdder1'],
            udder2:        ['RigUdder2'],
        };

        const byName = {};
        this.model.traverse(o => { if (o.name) byName[o.name] = o; });

        for (const [key, candidates] of Object.entries(nameMap)) {
            this.bones[key] = null;
            for (const n of candidates) {
                if (byName[n]) {
                    const b = byName[n];
                    b._baseQuat = b.quaternion.clone();
                    b._basePos  = b.position.clone();
                    b._baseScale= b.scale.clone();
                    this.bones[key] = b;
                    break;
                }
            }
        }
    }

    _initSculptMeshes() {
        this.sculptMeshes = [];
        const models = [this.model, this.lyingModel, this.eatingModel].filter(Boolean);
        models.forEach(mod => {
            mod.traverse(obj => {
                if (obj.isMesh && obj.geometry) {
                    if (!obj.geometry.userData.basePositions && obj.geometry.attributes.position) {
                        obj.geometry.userData.basePositions = new Float32Array(obj.geometry.attributes.position.array);
                    }
                    if (obj.geometry.userData.basePositions) {
                        this.sculptMeshes.push(obj);
                    }
                }
            });
        });
    }

    /**
     * Authentieke Veterinaire Conformatie-Sculptuur (Ferguson et al. 1994 / Edmonson et al. 1989 / Penn State)
     * Vormt rechtstreeks de diagnostische anatomische herkenningspunten op de vertexgeometrie:
     * 1. Zichtbare ribben (Costae)
     * 2. Ingevallen hongergroeve vs bolle vulling (Fossa paralumbalis)
     * 3. Scherpe lendenrichel (Processus transversi / Loin shelf)
     * 4. Heupknobbels (Tuber coxae / Hooks): scherpe hoeken vs rond vetkussen
     * 5. Zitbeenknobbels (Tuber ischiadica / Pins): scherpe pinnen vs ingebed
     * 6. De "V" vs "U" diagnostische lijn tussen hook en pin
     * 7. Staartinplant & sacrale holte (Cavitas sacralis): diep hol vs vetbulten (fat patches)
     * 8. Rugkam (Processus spinosi): dakvormige zaagrug vs vlakke rug met vetkammen
     * 9. Boeg / Borstkwab (Brisket): vetkwab bij overconditie
     * 10. Dracht: Ventrale buikdoorhang (Ventral Sag) van 45-65kg zware uterus
     * 11. Dracht: Rechterflank asymmetrie (kalf rechtsonder in de buikholte)
     * 12. Pensvulling: Linkerflank (reticulorumen vult linker fossa paralumbalis)
     * 13. Pariteit: Volwassen frame-ontwikkeling
     * 
     * VOORDEEL: Doordat alle vormveranderingen direct op de hoekpunten plaatsvinden,
     * is er NUL sprake van bot-schaalvermenigvuldiging (compounding in Spine1->2->3->Chest).
     * De koe kan NOOIT grotesk breed of hoog worden wanneer alle sliders op maximum staan!
     */
    _applyAnatomicalConformation(bcs, gestDays, parity, rumenFill) {
        const hornScale = (this.state && this.state.hornScale !== undefined) ? this.state.hornScale : (this.state && this.state.hasHorns ? 1.0 : 0.0);
        const bt = (this.breedingManager) ? this.breedingManager.getTraits() : {};
        const key = `${bcs.toFixed(2)}_${gestDays}_${parity}_${rumenFill.toFixed(2)}_${hornScale.toFixed(2)}_${bt.stature||100}_${bt.chestWidth||100}_${bt.bodyDepth||100}_${bt.angularity||100}_${bt.rumpAngle||100}_${bt.rumpWidth||100}_${bt.foreUdder||100}_${bt.rearUdderHeight||100}_${bt.suspensoryLigament||100}`;
        if (this._lastConformationKey === key) return;
        if (!this.sculptMeshes || this.sculptMeshes.length === 0) {
            this._initSculptMeshes();
        }
        if (this.sculptMeshes.length === 0) return;

        this._lastConformationKey = key;

        // Smoothstep helper voor vloeiende anatomische overgangen
        const smoothstep = (min, max, val) => {
            const x = Math.max(0, Math.min(1, (val - min) / (max - min)));
            return x * x * (3 - 2 * x);
        };

        const dBCS = (bcs - 3.0) / 2.0; // -1.0 (BCS 1.0 uitgemergeld) tot +1.0 (BCS 5.0 vet)
        const thin = Math.max(0, -dBCS); // 0..1 (mate van magerheid)
        const fat  = Math.max(0, dBCS);  // 0..1 (mate van vetzucht)

        const gestProg = Math.max(0, Math.min(1.0, gestDays / 280.0));
        const fetalVolume = Math.pow(gestProg, 2.8); // Exponentiële foetale groei in trimester 3

        const parityDelta = (parity === 0 ? -0.018 : (parity >= 4 ? 0.024 : 0.0));

        // CRV lineaire modifiers (-1.0 .. +1.0)
        const modAngularity = ((bt.angularity || 100) - 100) / 12.0;
        const modBodyDepth  = ((bt.bodyDepth || 100) - 100) / 12.0;
        const modChestWidth = ((bt.chestWidth || 100) - 100) / 12.0;
        const modRumpWidth  = ((bt.rumpWidth || 100) - 100) / 12.0;
        const modForeUdder  = ((bt.foreUdder || 100) - 100) / 12.0;
        const modRearUdderH = ((bt.rearUdderHeight || 100) - 100) / 12.0;
        const modCleft      = ((bt.suspensoryLigament || 100) - 100) / 12.0;

        this.sculptMeshes.forEach(mesh => {
            const geom = mesh.geometry;
            const posAttr = geom.attributes.position;
            if (!posAttr) return;
            const p = posAttr.array;
            const b = geom.userData.basePositions;
            if (!b) return;

            for (let i = 0; i < posAttr.count; i++) {
                const idx = i * 3;
                let x = b[idx];
                let y = b[idx + 1];
                let z = b[idx + 2];
                const absX = Math.abs(x);
                const signX = Math.sign(x) || 1;

                // 1. RIBBEN (Costae): Z = -0.65 tot -0.05, Y = 0.70 tot 1.30, absX > 0.15
                // Zichtbaarheid van ribben bij schrale koeien (BCS <= 2.5) en open ribwelving (CRV Ribvorm)
                if (z > -0.65 && z < -0.05 && y > 0.70 && y < 1.30 && absX > 0.15) {
                    const ribFreq = 38.0;
                    const ribWave = Math.sin((z - -0.65) * ribFreq);
                    const ribWeight = Math.sin(((z - -0.65) / 0.60) * Math.PI) * Math.sin(((y - 0.70) / 0.60) * Math.PI);
                    const ribTotalAmp = thin * 0.040 + Math.max(0, modAngularity) * 0.024;
                    if (ribTotalAmp > 0) {
                        x += signX * ribWave * ribTotalAmp * ribWeight;
                    }
                    if (fat > 0) {
                        // Vette koe: gladstrijkend vetdek over ribben
                        x += signX * fat * 0.035 * ribWeight;
                    }
                }

                // 2. HONGERGROEVE & KORTE RIBBEN (Fossa paralumbalis & Processus transversi):
                // Z = -0.85 tot -0.55, Y = 0.90 tot 1.32, absX > 0.12
                if (z > -0.85 && z < -0.55 && y > 0.90 && y < 1.32 && absX > 0.12) {
                    const fossaWeight = Math.sin(((z - -0.85) / 0.30) * Math.PI) * Math.sin(((y - 0.90) / 0.42) * Math.PI);
                    if (thin > 0) {
                        if (y < 1.22) {
                            // Diep ingevallen driehoekige hongergroeve
                            x -= signX * thin * 0.085 * fossaWeight;
                        } else {
                            // Korte ribben (lumbar shelf) steken als horizontale richel uit
                            x += signX * thin * 0.045 * fossaWeight;
                        }
                    } else if (fat > 0) {
                        // Vette koe: hongergroeve is strak/bol gevuld met vetweefsel
                        x += signX * fat * 0.065 * fossaWeight;
                    }
                }

                // 3. HEUPKNOBBELS (Tuber coxae / Hook bones):
                // Z rond -0.84, Y rond 1.28
                if (z > -0.92 && z < -0.76 && y > 1.18 && y < 1.36 && absX > 0.16) {
                    const distHook = Math.hypot((z - -0.84) * 2.5, (y - 1.28) * 2.0);
                    if (distHook < 0.22) {
                        const hookWeight = Math.cos(distHook * Math.PI / 0.22 * 0.5);
                        if (thin > 0) {
                            // Hoekige, scherp uitstekende botknobbel
                            x += signX * thin * 0.080 * hookWeight;
                            y += thin * 0.035 * hookWeight;
                        } else if (fat > 0) {
                            // Zacht afgerond door vetkussen
                            x -= signX * fat * 0.030 * hookWeight;
                        }
                    }
                }

                // 4. ZITBEENKNOBBELS (Tuber ischiadica / Pin bones):
                // Z rond -1.12, Y rond 1.22
                if (z > -1.22 && z < -1.00 && y > 1.12 && y < 1.34 && absX > 0.08) {
                    const distPin = Math.hypot((z - -1.12) * 2.0, (y - 1.22) * 2.0);
                    if (distPin < 0.22) {
                        const pinWeight = Math.cos(distPin * Math.PI / 0.22 * 0.5);
                        if (thin > 0) {
                            // Scherpe hoekige pinnen naar caudaal-lateraal
                            z -= thin * 0.075 * pinWeight;
                            x += signX * thin * 0.055 * pinWeight;
                            y += thin * 0.030 * pinWeight;
                        } else if (fat > 0) {
                            // Begraven onder vetkussens
                            z += fat * 0.045 * pinWeight;
                            x += signX * fat * 0.050 * pinWeight;
                        }
                        // Pariteit: bredere bekkenpinnen bij meerkalfskoeien vs vaarzen
                        x += signX * (parity === 0 ? -0.025 : (parity >= 4 ? 0.035 : 0.0)) * pinWeight;
                    }
                }

                // 5. DE "V" VS "U" LIJN TUSSEN HOOK EN PIN:
                // Z tussen -1.08 en -0.85, Y = 1.10 tot 1.32, absX > 0.14
                if (z > -1.08 && z < -0.85 && y > 1.10 && y < 1.32 && absX > 0.14) {
                    const vWeight = Math.sin(((z - -1.08) / 0.23) * Math.PI);
                    if (thin > 0) {
                        // Diepe V-vormige kuil tussen heup- en zitbeen
                        x -= signX * thin * 0.075 * vWeight;
                        y -= thin * 0.030 * vWeight;
                    } else if (fat > 0) {
                        // U-vorm / komvormig gevuld met vet
                        x += signX * fat * 0.060 * vWeight;
                        y += fat * 0.020 * vWeight;
                    }
                }

                // 6. STAARTINPLANT & THURL (Cavitas sacralis / Holte naast staartbasis):
                // Z = -1.28 tot -1.05, Y = 1.25 tot 1.45, absX > 0.02 && absX < 0.15
                if (z > -1.28 && z < -1.05 && y > 1.25 && y < 1.45 && absX > 0.02 && absX < 0.15) {
                    const tailCavWeight = Math.sin(((z - -1.28) / 0.23) * Math.PI) * Math.sin(((y - 1.25) / 0.20) * Math.PI);
                    if (thin > 0) {
                        // Diepe holtes naast de staartwortel (sunken tailhead cavity)
                        x -= signX * thin * 0.090 * tailCavWeight;
                        y -= thin * 0.060 * tailCavWeight;
                    } else if (fat > 0) {
                        // Vetkussens (fat patches / vetbulten) naast de staartbasis
                        x += signX * fat * 0.095 * tailCavWeight;
                        y += fat * 0.070 * tailCavWeight;
                    }
                }

                // 7. RUGKAM & ZAAGRUG (Processus spinosi):
                // Z = -0.95 tot 0.15, Y = 1.20 tot 1.45, absX < 0.08
                if (z > -0.95 && z < 0.15 && y > 1.20 && absX < 0.08) {
                    const spineDist = absX / 0.08;
                    if (thin > 0) {
                        // Dakvormige scherpe kam (zaagrug)
                        y += thin * 0.055 * (1.0 - spineDist);
                    } else if (fat > 0) {
                        // Brede, vlakke rug met vetkammen
                        y -= fat * 0.020 * (1.0 - spineDist);
                        x += signX * fat * 0.025 * Math.sin(spineDist * Math.PI);
                    }
                }

                // 8. BORSTKWAB / DEWLAP (Brisket):
                // Z = 0.0 tot 0.35, Y = 0.55 tot 0.90, absX < 0.18
                if (z > 0.0 && z < 0.35 && y > 0.55 && y < 0.90 && absX < 0.18) {
                    if (fat > 0) {
                        const dewlapWeight = Math.sin(((z - 0.0) / 0.35) * Math.PI) * Math.sin(((y - 0.55) / 0.35) * Math.PI);
                        y -= fat * 0.055 * dewlapWeight;
                        x += signX * fat * 0.040 * dewlapWeight;
                    }
                }

                // 9. DRACHT: VENTRALE BUIKDOORHANG (Ventral Sag van zwaar kalf 45-65kg):
                // Z = -0.75 tot 0.05, Y = 0.45 tot 0.85
                if (z > -0.75 && z < 0.05 && y > 0.45 && y < 0.85) {
                    const sagWeight = Math.sin(((z - -0.75) / 0.80) * Math.PI) * Math.sin(((y - 0.45) / 0.40) * Math.PI);
                    y -= fetalVolume * 0.110 * sagWeight;
                    x += signX * fetalVolume * 0.045 * sagWeight;
                }

                // 10. DRACHT: RECHTERFLANK ASYMMETRIE (Kalf bevindt zich rechts):
                // Alleen rechterflank (x > 0.08), Z = -0.70 tot -0.15, Y = 0.50 tot 0.90
                if (x > 0.08 && z > -0.70 && z < -0.15 && y > 0.50 && y < 0.90) {
                    const rWeight = Math.sin(((z - -0.70) / 0.55) * Math.PI) * Math.sin(((y - 0.50) / 0.40) * Math.PI);
                    x += fetalVolume * 0.095 * rWeight;
                }

                // 11. PENSVULLING: LINKERFLANK (Reticulorumen links - Jan Hulsen Zaagmethode):
                // Alleen linkerflank (x < -0.08), Z = -0.85 tot -0.45, Y = 0.75 tot 1.25
                if (x < -0.08 && z > -0.85 && z < -0.45 && y > 0.75 && y < 1.25) {
                    const rumenWeight = Math.sin(((z - -0.85) / 0.40) * Math.PI) * Math.sin(((y - 0.75) / 0.50) * Math.PI);
                    const rumenDelta = (rumenFill - 0.5) * 0.125 * rumenWeight;
                    x -= rumenDelta; // naar links (-X) bij volle pens, naar binnen (+X) bij lege pens / diepe hongergroeve
                }

                // 12. CRV LINEAIRE KENMERKEN SCULPTING (Voorhand, Inhoud, Kruisbreedte, Uier)
                // A. Voorhand / Chest Width: Z = -0.15 tot 0.30, Y = 0.60 tot 1.30, absX > 0.10
                if (z > -0.15 && z < 0.30 && y > 0.60 && y < 1.30 && absX > 0.10) {
                    x += signX * modChestWidth * 0.045;
                }
                // B. Inhoud / Rompdiepte: Z = -0.65 tot 0.15, Y = 0.50 tot 1.05
                if (z > -0.65 && z < 0.15 && y > 0.50 && y < 1.05) {
                    y -= modBodyDepth * 0.055;
                    x += signX * modBodyDepth * 0.035;
                }
                // C. Kruisbreedte: Z = -1.25 tot -0.75, Y = 1.05 tot 1.38, absX > 0.10
                if (z > -1.25 && z < -0.75 && y > 1.05 && y < 1.38 && absX > 0.10) {
                    x += signX * modRumpWidth * 0.050;
                }
                // D. Uierconformatie (Vooruier, Achteruierhoogte, Ophangband): Z = -1.05 tot -0.70, Y = 0.45 tot 0.85
                if (z > -1.05 && z < -0.70 && y > 0.45 && y < 0.85) {
                    // Ophangband (centrale groeve bij x rond 0)
                    if (absX < 0.05) {
                        y += modCleft * 0.035 * (1.0 - absX / 0.05);
                    }
                    // Vooruieraanhechting (z > -0.80)
                    if (z > -0.80) {
                        z += modForeUdder * 0.040;
                    }
                    // Achteruierhoogte (z < -0.92)
                    if (z < -0.92) {
                        y += modRearUdderH * 0.045;
                    }
                }

                // 13. PARITEITSKADER (Rompbreedte vaars vs meerkalfs)
                if (z > -0.85 && z < 0.20 && y > 0.50 && y < 1.25 && absX > 0.10) {
                    x += signX * parityDelta;
                }

                // 14. HOORNS (Gehoornd vs Onthoorn / Genetisch Hoornloos / Scurs)
                // Hoorns bevinden zich bij: absX > 0.06, y > 1.35, z > 0.85 && z < 1.15
                if (absX > 0.06 && y > 1.35 && z > 0.85 && z < 1.15) {
                    if (hornScale !== 1.0) {
                        const baseX = signX * 0.085;
                        const baseY = 1.390;
                        const baseZ = 0.960;
                        const retract = 1.0 - Math.max(0.0, Math.min(1.4, hornScale));
                        x = x + (baseX - x) * retract;
                        y = y + (baseY - y) * retract;
                        z = z + (baseZ - z) * retract;
                    }
                }

                p[idx]     = x;
                p[idx + 1] = y;
                p[idx + 2] = z;
            }

            posAttr.needsUpdate = true;
            geom.computeVertexNormals();
            geom.normalsNeedUpdate = true;
        });
    }

    /**
     * Schakelt tussen Gehoornd, Onthoorn (Polled) en Hoornstompjes (Scurs)
     * @param {boolean|number} enabledOrScale - true/false of schaal 0.0 .. 1.4
     */
    setHorns(enabledOrScale) {
        if (typeof enabledOrScale === 'boolean') {
            this.state.hasHorns = enabledOrScale;
            this.state.hornScale = enabledOrScale ? 1.0 : 0.0;
        } else {
            const s = Math.max(0.0, Math.min(1.4, parseFloat(enabledOrScale)));
            this.state.hornScale = s;
            this.state.hasHorns = s > 0.05;
        }
        this._lastConformationKey = null;
        this._applyAnatomicalConformation(this.state.bcs, this.state.gestationDays, this.state.parity, this.state.rumenFill);
    }

    _resetProceduralBones() {
        // Wortelpositie altijd resetten naar (0, 0, 0) om per-frame accumulatie te voorkomen
        if (this.bones.root) {
            this.bones.root.position.set(0, 0, 0);
        }
    }

    _buildActions() {
        const map = {
            walk:        ['walk', 'Loco_Walk', 'Armature.001|Loco_Walk|BaseLayer'],
            walkSlow:    ['walk', 'Loco_Walk'],
            trot:        ['trot', 'Loco_Trot-IP'],
            backingUp:   ['backingUp', 'Loco_WalkBack-IP'],
            gallopPlay:  ['gallopPlay', 'Loco_Sprint-IP'],
            idle:        ['idle', 'stand0', 'stand1', 'Stand_00-IP', 'Stand_01-IP'],
            idleRest:    ['idleRest', 'Stand_01-IP', 'Stand_02-IP'],
            grazing:     ['grazing', 'eating0', 'eating1', 'Eating_01-IP'],
            eating:      ['eating', 'Eating_02-IP'],
            drinking:    ['drinking', 'Drinking_01-IP'],
            lying:       ['lying', 'sitting0', 'sitting1', 'Sitting_00-IP'],
            sittingLook: ['sittingLook', 'Sitting_01-IP'],
            lyingSleep:  ['lyingSleep', 'Sitting_02-IP'],
            lieDown:     ['lieDown', 'lyingDown', 'Trans_Stand_To_Sitting-IP'],
            standUp:     ['standUp', 'standingUp', 'Trans_Sitting_To_Stand-IP'],
            downerCow:   ['lying', 'sitting0', 'Sitting_00-IP', 'lieDown'],
        };

        for (const [key, candidates] of Object.entries(map)) {
            for (const ck of candidates) {
                if (this.clips[ck]) {
                    const action = this.mixer.clipAction(this.clips[ck]);
                    this.actions[key] = action;
                    break;
                }
            }
        }

        // Mixer finished listener voor overgang na voltooien van opstaan of transities
        this.mixer.addEventListener('finished', (e) => {
            if (this.actions['standUp'] && e.action === this.actions['standUp']) {
                this.setGait('idle');
            } else if (this.actions['lieDown'] && e.action === this.actions['lieDown']) {
                this.setGait(this.state.gait === 'downerCow' ? 'downerCow' : 'lying');
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIEKE API & CONTROLLER KOPPELING
    // ═══════════════════════════════════════════════════════════════════════════

    setGait(gait) {
        if (gait === 'turnLeft90') {
            this.turn90('left');
            return;
        }
        if (gait === 'turnRight90') {
            this.turn90('right');
            return;
        }

        this.state.gait = gait;
        const prevAction = this.currentAction;

        let targetKey = 'idle';
        if (gait === 'walk') targetKey = 'walk';
        else if (gait === 'walkSlow') targetKey = 'walkSlow';
        else if (gait === 'trot') targetKey = 'trot';
        else if (gait === 'gallopPlay') targetKey = 'gallopPlay';
        else if (gait === 'backingUp') targetKey = 'backingUp';
        else if (gait === 'idle') targetKey = 'idle';
        else if (gait === 'idleRest') targetKey = 'idleRest';
        else if (gait === 'grazing') targetKey = 'grazing';
        else if (gait === 'eatingBunk' || gait === 'eating') targetKey = 'eating';
        else if (gait === 'drinking') targetKey = 'drinking';
        else if (gait === 'lyingSternal' || gait === 'lying') targetKey = 'lying';
        else if (gait === 'lyingSleepFlank') targetKey = 'lying';
        else if (gait === 'boxHanging') targetKey = 'idle';
        else if (gait === 'lyingLateral' || gait === 'lyingSleep') targetKey = 'lyingSleep';
        else if (gait === 'lieDown') targetKey = 'lieDown';
        else if (gait === 'standUp') targetKey = 'standUp';
        else if (gait === 'downerCow' || gait === 'downer' || gait === 'fallen') targetKey = 'downerCow';

        if (gait === 'boxHanging') {
            const idleAction = this.actions['idle'];
            if (idleAction) {
                if (prevAction && prevAction !== idleAction) prevAction.fadeOut(0.35);
                idleAction.reset();
                idleAction.setLoop(THREE.LoopRepeat, Infinity);
                idleAction.paused = false;
                idleAction.setEffectiveWeight(1.0);
                idleAction.fadeIn(0.35);
                idleAction.play();
                this.currentAction = idleAction;
                this._updateStatusUI();
                return;
            }
        }

        if (gait === 'lieDown') {
            const lieAction = this.actions['lieDown'];
            if (lieAction) {
                if (prevAction && prevAction !== lieAction) prevAction.fadeOut(0.35);
                lieAction.reset();
                lieAction.setLoop(THREE.LoopOnce, 1);
                lieAction.clampWhenFinished = true;
                lieAction.paused = false;
                lieAction.time = 0;
                lieAction.setEffectiveWeight(1.0);
                lieAction.fadeIn(0.35);
                lieAction.play();
                this.currentAction = lieAction;
                this._updateStatusUI();
                return;
            }
        }

        if (gait === 'standUp') {
            const upAction = this.actions['standUp'];
            if (upAction) {
                if (prevAction && prevAction !== upAction) prevAction.fadeOut(0.35);
                upAction.reset();
                upAction.setLoop(THREE.LoopOnce, 1);
                upAction.clampWhenFinished = true;
                upAction.paused = false;
                upAction.time = 0;
                upAction.setEffectiveWeight(1.0);
                upAction.fadeIn(0.35);
                upAction.play();
                this.currentAction = upAction;
                this._updateStatusUI();
                return;
            }
        }

        if (gait === 'lyingSternal' || gait === 'lying' || gait === 'lyingLateral' || gait === 'lyingSleep' || gait === 'downerCow' || gait === 'lyingSleepFlank') {
            const lieAction = this.actions['lieDown'];
            if (lieAction) {
                if (prevAction && prevAction !== lieAction) prevAction.fadeOut(0.35);
                lieAction.reset();
                lieAction.setLoop(THREE.LoopOnce, 1);
                lieAction.clampWhenFinished = true;
                // De definitieve borstligging houding (sternal recumbency) bevindt zich op het einde van de lieDown cyclus
                lieAction.time = Math.max(0, lieAction.getClip().duration - 0.02);
                lieAction.paused = true;
                lieAction.setEffectiveWeight(1.0);
                lieAction.fadeIn(0.35);
                lieAction.play();
                this.currentAction = lieAction;
                this._updateStatusUI();
                return;
            }
        }

        if (gait === 'turnLeft90' || gait === 'turnRight90') {
            const turnAction = this.actions[gait];
            if (turnAction) {
                if (prevAction && prevAction !== turnAction) prevAction.fadeOut(0.25);
                turnAction.reset();
                turnAction.setLoop(THREE.LoopOnce, 1);
                turnAction.clampWhenFinished = true;
                turnAction.paused = false;
                turnAction.time = 0;
                turnAction.setEffectiveWeight(1.0);
                turnAction.fadeIn(0.25);
                turnAction.play();
                this.currentAction = turnAction;
                this._updateStatusUI();
                return;
            }
        }

        const nextAction = this.actions[targetKey] || this.actions['idle'] || this.actions['walk'];
        if (nextAction && nextAction !== prevAction) {
            nextAction.setLoop(THREE.LoopRepeat, Infinity);
            nextAction.enabled = true;
            let timeScale = 1.0;
            if (targetKey === 'walk' || targetKey === 'trot') {
                timeScale = this._computeTimeScale();
            }
            nextAction.setEffectiveTimeScale(timeScale);

            if (prevAction) {
                prevAction.fadeOut(0.35);
            }
            nextAction.reset();
            nextAction.setEffectiveWeight(1.0);
            nextAction.fadeIn(0.35);
            nextAction.play();

            this.currentAction = nextAction;
        }

        // In ALLE gevallen blijft de echte melkkoe zichtbaar
        if (this.model) {
            this.model.visible = true;
            this.model.position.set(0, 0.005, 0);
            this.model.rotation.set(0, 0, 0);
        }
        if (this.lyingModel) this.lyingModel.visible = false;
        if (this.eatingModel) this.eatingModel.visible = false;

        this._updateStatusUI();
    }

    onLamenessChanged() {
        if (this.currentAction && (this.state.gait === 'walk' || this.state.gait === 'walkSlow' || this.state.gait === 'trot')) {
            this.currentAction.setEffectiveTimeScale(this._computeTimeScale());
        }
        this._updateStatusUI();
    }

    _computeTimeScale() {
        const baseSpeed = this.state.walkSpeed;
        const score = this.state.locomotionScore;
        const speedFactor = 1.0 - (score - 1.0) * 0.11;
        const parity = this.state.parity !== undefined ? this.state.parity : 2;
        // Oudere, zwaardere meerkalfskoeien stappen rustiger; jeugdige vaarzen vlotter
        const ageSpeedMod = (parity === 0) ? 1.08 : (parity >= 4 ? 0.88 : 1.0);
        if (this.state.gait === 'walkSlow') return Math.max(0.20, baseSpeed * 0.58 * speedFactor * ageSpeedMod);
        if (this.state.gait === 'trot') return Math.max(0.4, baseSpeed * 1.75 * speedFactor * ageSpeedMod);
        if (this.state.gait === 'gallopPlay') return Math.max(0.5, baseSpeed * 2.1);
        if (this.state.gait === 'backingUp') return Math.max(0.2, baseSpeed * 0.6);
        return Math.max(0.25, baseSpeed * speedFactor * ageSpeedMod);
    }

    /**
     * Berekent temporele asymmetrie (cadence warp) bij kreupelheid:
     * De koe versnelt door de pijnlijke standfase ("hurry off the lame leg")
     * en leunt beduidend langer op de gezonde contralaterale poot ("lingering on the sound leg").
     */
    _computeCadenceWarp(cycle) {
        const hScores = this.state.hoofScores;
        if (!hScores) return 1.0;

        const sev = {
            FL: (hScores.FL - 1.0) / 4.0,
            FR: (hScores.FR - 1.0) / 4.0,
            HL: (hScores.HL - 1.0) / 4.0,
            HR: (hScores.HR - 1.0) / 4.0,
        };
        const maxSev = Math.max(sev.FL, sev.FR, sev.HL, sev.HR);
        if (maxSev <= 0.001) return 1.0;

        let warp = 1.0;

        ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
            const s = sev[leg];
            if (s <= 0.001) return;

            const impactPhase = GAIT_STRIKE_PHASES[leg];
            let stanceT = (cycle - impactPhase + 1.0) % 1.0;

            // Pijnlijke poot in standfase: koe versnelt ("hurry off the lame leg")
            if (stanceT < 0.38) {
                const rushPulse = Math.sin((stanceT / 0.38) * Math.PI);
                warp += rushPulse * s * 0.65;
            }

            // Gezonde tegenoverliggende poot in standfase: koe leunt langer ("lingering on sound leg")
            const oppLeg = (leg === 'FL' ? 'FR' : (leg === 'FR' ? 'FL' : (leg === 'HL' ? 'HR' : 'HL')));
            const oppImpact = GAIT_STRIKE_PHASES[oppLeg];
            let oppStanceT = (cycle - oppImpact + 1.0) % 1.0;
            if (oppStanceT < 0.45) {
                const lingerPulse = Math.sin((oppStanceT / 0.45) * Math.PI);
                warp -= lingerPulse * s * 0.35;
            }
        });

        return Math.max(0.40, Math.min(2.10, warp));
    }

    turn90(direction = 'left') {
        const delta = direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
        const cow = (this.options && this.options.cow) || (this.options && this.options.group && this.options.group.userData && this.options.group.userData.cow);
        if (cow) {
            if (cow.targetRotY === undefined) cow.targetRotY = cow.group.rotation.y;
            cow.targetRotY += delta;
        } else if (this.options && this.options.group) {
            this.options.group.rotation.y += delta;
        }
        this.onTurn(direction);
    }

    onTurn(direction = 'left') {
        if (this.state.gait === 'idle' || this.state.gait === 'idleRest') {
            const prevGait = this.state.gait;
            this.setGait('walk');
            setTimeout(() => {
                if (this.state.gait === 'walk') {
                    this.setGait(prevGait);
                }
            }, 1200);
        }
    }

    setDownerCow(enable = true) {
        if (enable) {
            this.setGait('downerCow');
        } else {
            this.setGait('standUp');
        }
    }

    getIKTargets() { return this.ikTargets; }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOOFD UPDATE LUS PER FRAME
    // ═══════════════════════════════════════════════════════════════════════════

    update(dt) {
        this.time += dt;

        // 0. Reset procedurele botten naar hun basispositie om accumulatie te voorkomen
        this._resetProceduralBones();

        // 1. Loopcyclus fase voortgang
        this._updateWalkPhase(dt);

        // 2. Fysiologie & Zoötechniek: Ademhaling, Conformatie, Oogleden
        this._applyZootechnicalConformation(dt);
        this._applyBreathing(dt);
        if (this.state.enableEyelidBlink) this._applyBlinking(dt);

        // 3. Gangwerk & Locomotiescores (Sprecher 1-5)
        this._applyLocomotionVarieties(dt);

        // 4. Anatomische Kinetica (research.md)
        this._applyAnatomicalKinetics(dt);

        // 5. Fysieke Transities & Lighoudingen
        this._applyTransitionsAndPostures(dt);

        // 6. Micro-gedragingen & Ethologie
        this._applyComprehensiveEthology(dt);

        // 7. Veer-fysica
        this._applyPhysics(dt);

        // 8. Klauw & Hoef Grondzekering (Voorkomt dat linksachter door het grondvlak zakt)
        this._applyGroundContactGuard(dt);

        // 9. Telemetrie & UI
        this._updateStatusUI();
    }

    _updateWalkPhase(dt) {
        const walkAction = this.actions['walk'];
        const cadenceMod = this._computeCadenceWarp(this.walkCyclePhase);
        const mountSlowdown = this._mountBlend ? (1.0 - 0.70 * this._mountBlend) : 1.0;
        if (walkAction && walkAction.isRunning()) {
            const clipDur = walkAction.getClip().duration || 1.42;
            this.walkCyclePhase = (walkAction.time / clipDur) % 1.0;
            const effectiveScale = this._computeTimeScale() * cadenceMod * mountSlowdown;
            walkAction.setEffectiveTimeScale(effectiveScale);
        } else {
            const freq = (this.state.gait === 'trot' ? 1.6 : (this.state.gait === 'gallopPlay' ? 2.2 : 0.85)) * this.state.walkSpeed * cadenceMod * mountSlowdown;
            this.walkCyclePhase = (this.walkCyclePhase + dt * freq) % 1.0;
        }
        this.telemetry.cyclePhase = this.walkCyclePhase;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. LOCOMOTIE, SPEL & KREUPELHEID
    // ═══════════════════════════════════════════════════════════════════════════

    _applyLocomotionVarieties(dt) {
        const gait = this.state.gait;
        const cycle = this.walkCyclePhase;

        // ── A. Koeiendans / Speels Bokken (Spring Pasture Play Behavior) ──────
        if (gait === 'gallopPlay') {
            const suppress = this._mountBlend ? (1.0 - this._mountBlend) : 1.0;
            const leap = Math.sin(cycle * Math.PI * 2) * suppress;
            // Local Z = -100 * world Y (verticale sprong tot +0.18m zonder accumulatie)
            if (this.bones.root) this.bones.root.position.z = -Math.max(0, leap) * 18;

            // Kop omlaag en bokken met achterpoten
            this._applyLocalRot('neck1', (0.28 + leap * 0.15) * suppress, 0, 0);
            this._applyLocalRot('head', -0.15 * suppress, 0, 0);

            // Achterhand schopt omhoog / bokt
            const buck = Math.max(0, Math.sin(cycle * Math.PI * 2 + 1.0)) * suppress;
            this._applyLocalRot('spine1', buck * 0.15, 0, 0);
            this._applyLocalRot('upperLegHL', buck * 0.45, 0, buck * 0.15);
            this._applyLocalRot('upperLegHR', buck * 0.45, 0, -buck * 0.15);

            // Staart vrolijk omhoog gekruld over de rug
            this._applyLocalRot('tail0', 0.85 * suppress, 0, 0);
            this._applyLocalRot('tail1', 0.65 * suppress, 0, 0);
            return;
        }

        // ── B. Achteruitlopen (Backing Up) ───────────────────────────────────
        if (gait === 'backingUp') {
            this._applyLocalRot('neck1', -0.18, 0, 0);
            this._applyLocalRot('head', -0.12, 0, 0);
            const reversePhase = 1.0 - cycle;
            this._applyLocalRot('upperLegFL', Math.sin(reversePhase * Math.PI * 2) * 0.20, 0, 0);
            this._applyLocalRot('upperLegFR', Math.sin((reversePhase + 0.5) * Math.PI * 2) * 0.20, 0, 0);
            return;
        }

        // ── C. Ruststand / 3-Potenstand (Cocked Hock Standing) ───────────────
        if (gait === 'idleRest') {
            // Eén achterpoot rust op de teen (aangetipt), gewicht op andere 3 poten
            this._applyLocalRot('pelvis', 0, 0, 0.04);
            this._applyLocalRot('upperLegHR', 0.08, 0, 0);
            this._applyLocalRot('lowerLegHR', 0.24, 0, 0);
            this._applyLocalRot('pasternHR', -0.16, 0, 0);
            return;
        }

        // ── D. Voerhek Vreten (Eating at feed bunk) ───────────────────────────
        if (gait === 'eatingBunk') {
            const reach = Math.sin(this.time * 1.5) * 0.08;
            this._applyLocalRot('neck1', 0.55 + reach * 0.5, 0, 0);
            this._applyLocalRot('head',  0.22, Math.sin(this.time * 2.0) * 0.12, 0);
            this._applyLocalRot('jaw',   0.15 + Math.sin(this.time * 4.5) * 0.08, 0, 0);
            return;
        }

        // ── E. Drinken (Drinking at trough) ──────────────────────────────────
        if (gait === 'drinking') {
            this._applyLocalRot('neck1', 0.65, 0, 0);
            this._applyLocalRot('head',  0.18, 0, 0);
            // Zuigende slikgolf
            const suck = Math.sin(this.time * 3.5) * 0.06;
            this._applyLocalRot('jaw',   0.12 + suck, 0, 0);
            this._applyLocalRot('neck2', suck * 0.4, 0, 0);
            return;
        }

        // ── F. Lopen & Draven met Sprecher Kreupelheidsscores (1-5) ───────────
        if (gait === 'walk' || gait === 'walkSlow' || gait === 'trot') {
            this._applyLamenessModel(dt);
        } else if (gait === 'idle' || gait === 'idleRest') {
            this._applyStandingLameness();
        }
    }

    _applyLamenessModel(dt) {
        const hScores = this.state.hoofScores || { FL: 1.0, FR: 1.0, HL: 1.0, HR: 1.0 };
        const sev = {
            FL: (hScores.FL - 1.0) / 4.0,
            FR: (hScores.FR - 1.0) / 4.0,
            HL: (hScores.HL - 1.0) / 4.0,
            HR: (hScores.HR - 1.0) / 4.0,
        };
        const maxSev = Math.max(sev.FL, sev.FR, sev.HL, sev.HR);
        const meanSev = (sev.FL + sev.FR + sev.HL + sev.HR) / 4.0;
        const cycle = this.walkCyclePhase;

        // ── 1. Duty Cycles per Hoef (Flower & Weary 2006) ─────────────────────
        const baseDuty = 0.62;
        ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
            const oppLeg = (leg === 'FL' ? 'FR' : (leg === 'FR' ? 'FL' : (leg === 'HL' ? 'HR' : 'HL')));
            const ownSev = sev[leg];
            const oppSev = sev[oppLeg];
            if (ownSev > 0) {
                this.telemetry.dutyCycles[leg] = Math.max(0.18, baseDuty - ownSev * 0.44);
            } else if (oppSev > 0) {
                this.telemetry.dutyCycles[leg] = Math.min(0.74, baseDuty + oppSev * 0.12);
            } else {
                this.telemetry.dutyCycles[leg] = baseDuty;
            }
        });

        // ── 2. Bodemreactiekracht % Relatieve Last (van der Tol et al. 2002) ──
        this.telemetry.grfRelief = {
            FL: Math.round((1.0 - sev.FL * 0.48) * 100),
            FR: Math.round((1.0 - sev.FR * 0.48) * 100),
            HL: Math.round((1.0 - sev.HL * 0.48) * 100),
            HR: Math.round((1.0 - sev.HR * 0.48) * 100),
        };

        if (maxSev <= 0.001) {
            this.telemetry.headNodDeg = 0;
            this.telemetry.spineArchDeg = 0;
            this.telemetry.abductionDeg = 0;
            this.telemetry.pelvicTiltDeg = 0;
            return;
        }

        // ── 3. Rugboog / Kyfose (Sprecher et al. 1997) ───────────────────────
        // Lumbale kromming stijgt met maximale hoefscore plus cumulatieve pijn
        const arch = (maxSev * 0.82 + meanSev * 0.32) * 0.18;
        this._applyLocalRot('spine1', arch * 0.40, 0, 0);
        this._applyLocalRot('spine2', arch * 0.35, 0, 0);
        this._applyLocalRot('spine3', arch * 0.25, 0, 0);
        this._applyLocalRot('pelvis', arch * 0.20, 0, 0);
        this.telemetry.spineArchDeg = arch * (180 / Math.PI);

        // ── 4. Kopknik & Lichaamsinzinking ("Down on Sound" & Body Dip) ────────
        // Veterinaire gouden regel: "Down on sound" — het hoofd en lichaam zakken zwaar
        // in bij belasting van het gezonde been, en schieten omhoog bij de pijnlijke voorpoot.
        let totalNod = 0;
        let lateralSwayX = 0;
        let lateralRoll = 0;
        let bodyDip = 0;

        const getPulse = (phaseTarget) => {
            let dist = (cycle - phaseTarget + 1.0) % 1.0;
            if (dist > 0.5) dist -= 1.0;
            return Math.exp(-(dist * dist) / 0.016);
        };

        ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
            const s = sev[leg];
            if (s <= 0.001) return;

            const impactLame = GAIT_STRIKE_PHASES[leg];
            const pulseLame = getPulse(impactLame);

            const isLeft = (leg === 'FL' || leg === 'HL');
            const oppSideLeg = (leg === 'FL' ? 'FR' : (leg === 'FR' ? 'FL' : (leg === 'HL' ? 'HR' : 'HL')));
            const impactSound = GAIT_STRIKE_PHASES[oppSideLeg];
            const pulseSound = getPulse(impactSound);

            if (leg === 'FL' || leg === 'FR') {
                // VOORBEEN KREUPELHEID:
                // Kop schiet krachtig OMHOOG (negatieve rx) op de pijnlijke voorhoef:
                totalNod -= s * pulseLame * 0.52;
                // Kop en schoft zakken diep OMLAAG ("Down on sound", positieve rx) op de gezonde voorhoef:
                totalNod += s * pulseSound * 0.46;

                // Lichaamsinzinking (Body dip) over de gezonde voorpoot:
                bodyDip -= s * pulseSound * 0.048;
                bodyDip += s * pulseLame * 0.024; // recoil omhoog

                // Schouderval: gezonde schouder zakt, zere schouder ontlast
                const soundShoulder = (leg === 'FL') ? 'shoulderFR' : 'shoulderFL';
                const lameShoulder  = (leg === 'FL') ? 'shoulderFL' : 'shoulderFR';
                this._applyLocalRot(soundShoulder, pulseSound * s * 0.08, 0, 0);
                this._applyLocalRot(lameShoulder, -pulseLame * s * 0.08, 0, 0);

                // Laterale massa-uitwijking weg van de pijnlijke klauw (naar gezonde zijde):
                const sideSign = isLeft ? 1 : -1; // links kreupel -> naar rechts (+X)
                lateralSwayX += sideSign * s * pulseLame * 0.030;
                lateralRoll  += sideSign * s * pulseLame * 0.055;
            } else {
                // ACHTERBEEN KREUPELHEID:
                // Kop duikt OMLAAG (positieve rx) op de pijnlijke achterhoef om gewicht naar de voorhand te trekken:
                totalNod += s * pulseLame * 0.44;
                // Kop herstelt op het gezonde achterbeen:
                totalNod -= s * pulseSound * 0.22;

                // Bekkendaling & Inzinking over het gezonde achterbeen:
                bodyDip -= s * pulseSound * 0.040;
                bodyDip += s * pulseLame * 0.020;

                // Coxitis hike (bekken trekt omhoog aan zere zijde, zakt door aan gezonde zijde):
                const sideSign = isLeft ? 1 : -1;
                lateralSwayX += sideSign * s * pulseLame * 0.032;
                lateralRoll  += sideSign * s * pulseLame * 0.065;
            }
        });

        // Bilaterale voorbeenkreupelheid: hals wordt permanent laag en stijf gehouden (eierenlopen)
        if (sev.FL > 0.25 && sev.FR > 0.25) {
            totalNod += (sev.FL + sev.FR) * 0.16; // naar beneden gestrekt
        }

        this._applyLocalRot('neck1', totalNod * 0.48, 0, 0);
        this._applyLocalRot('neck2', totalNod * 0.32, 0, 0);
        this._applyLocalRot('head',  totalNod * 0.28, 0, -lateralRoll * 0.3);

        // Zwaartepunt verplaatsing (inzinken / hinken):
        if (this.bones.root) {
            // Local Z = -100 * world Y (verticale inzinking)
            // Local X = 100 * world X (laterale massa-uitwijking)
            this.bones.root.position.z += -bodyDip * 100;
            this.bones.root.position.x += lateralSwayX * 100;
        }
        this._applyLocalRot('pelvis', 0, 0, lateralRoll);
        this._applyLocalRot('chest',  0, 0, lateralRoll * 0.6);
        this.telemetry.headNodDeg = totalNod * (180 / Math.PI);

        // ── 5. Standfase Ontlasting per Hoef (Flower & Weary 2006; Sprecher 1997) ──
        // Biomechanisch correct: de ontlasting van een pijnlijke poot in standfase
        // wordt primair uitgedrukt door verminderde contacttijd (duty cycle / cadence warp),
        // opwaartse kopknik (front) en bekkenkanteling/coxitis hike (hind).
        // De poot zelf blijft natuurgetrouw op de bodem staan en vouwt NOOIT naar binnen.

        // ── 6. Abductie Buitenklauw op de Achterpoten (van der Tol et al. 2003) ──
        let totalAbductDeg = 0;
        ['HL', 'HR'].forEach(leg => {
            const s = sev[leg];
            if (s <= 0.001) return;
            const impactPhase = GAIT_STRIKE_PHASES[leg];
            let stanceT = (cycle - impactPhase + 1.0) % 1.0;
            if (stanceT >= 0.38) {
                const swingNorm = (stanceT - 0.38) / 0.62;
                const abduct = Math.sin(swingNorm * Math.PI) * s * 0.22;
                const sideSign = (leg === 'HL') ? 1 : -1;
                const boneKey = (leg === 'HL') ? 'upperLegHL' : 'upperLegHR';
                this._applyLocalRot(boneKey, 0, sideSign * abduct, 0);
                totalAbductDeg = Math.max(totalAbductDeg, Math.abs(abduct * (180 / Math.PI)));
            }
        });
        this.telemetry.abductionDeg = totalAbductDeg;

        // ── 7. Bekken-Invalshoek (Pelvic Tilt) ────────────────────────────────
        const rearDiff = sev.HL - sev.HR;
        const frontDiff = sev.FL - sev.FR;
        const netTilt = (rearDiff * 0.07 + frontDiff * 0.04) * Math.sin(cycle * Math.PI * 2);
        this._applyLocalRot('pelvis', 0, 0, netTilt);
        this.telemetry.pelvicTiltDeg = (lateralRoll + netTilt) * (180 / Math.PI);
    }

    setHoofScore(leg, score) {
        if (!this.state.hoofScores) this.state.hoofScores = { FL: 1, FR: 1, HL: 1, HR: 1 };
        this.state.hoofScores[leg] = score;
        this.state.locomotionScore = Math.max(...Object.values(this.state.hoofScores));
        this.state.lameLeg = leg;
        this.onLamenessChanged();
    }

    setLamenessPreset(preset) {
        if (!this.state.hoofScores) this.state.hoofScores = { FL: 1, FR: 1, HL: 1, HR: 1 };
        switch(preset) {
            case 'healthy':
                this.state.hoofScores = { FL: 1.0, FR: 1.0, HL: 1.0, HR: 1.0 };
                break;
            case 'single_fl':
                this.state.hoofScores = { FL: 3.5, FR: 1.0, HL: 1.0, HR: 1.0 };
                break;
            case 'single_hl':
                this.state.hoofScores = { FL: 1.0, FR: 1.0, HL: 4.0, HR: 1.0 };
                break;
            case 'bilateral_hind':
                this.state.hoofScores = { FL: 1.0, FR: 1.0, HL: 3.5, HR: 3.5 };
                break;
            case 'bilateral_front':
                this.state.hoofScores = { FL: 3.5, FR: 3.5, HL: 1.0, HR: 1.0 };
                break;
            case 'all_four': // Laminitis / Diffuse bevangenheid
                this.state.hoofScores = { FL: 4.0, FR: 4.0, HL: 4.0, HR: 4.0 };
                break;
        }
        this.state.locomotionScore = Math.max(...Object.values(this.state.hoofScores));
        this.onLamenessChanged();
    }

    _applyStandingLameness() {
        const hScores = this.state.hoofScores || { FL: 1.0, FR: 1.0, HL: 1.0, HR: 1.0 };
        const maxScore = Math.max(...Object.values(hScores));
        if (maxScore >= 2.0) {
            // Sprecher et al. (1997): rugboog ook in stilstand zichtbaar bij score >= 2
            const arch = (maxScore - 1.5) / 3.5 * 0.15;
            this._applyLocalRot('spine1', arch * 0.40, 0, 0);
            this._applyLocalRot('spine2', arch * 0.35, 0, 0);
            this._applyLocalRot('spine3', arch * 0.25, 0, 0);
            this._applyLocalRot('pelvis', arch * 0.20, 0, 0);
            this.telemetry.spineArchDeg = arch * (180 / Math.PI);

            // Bekken kantelt licht weg van de pijnlijkste poot om gewicht te verplaatsen
            const rearDiff = (hScores.HL || 1) - (hScores.HR || 1);
            if (Math.abs(rearDiff) > 0.4) {
                const sideSign = rearDiff > 0 ? 1 : -1;
                this._applyLocalRot('pelvis', 0, 0, sideSign * Math.abs(rearDiff) * 0.025);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. ANATOMISCHE KINETICA (research.md)
    // ═══════════════════════════════════════════════════════════════════════════

    _applyAnatomicalKinetics(dt) {
        const cycle = this.walkCyclePhase;
        const isWalking = (this.state.gait === 'walk' || this.state.gait === 'trot');

        // Scapula Synsarcosis
        if (this.state.enableSynsarcosis && isWalking) {
            const flStance = Math.sin((cycle - GAIT_STRIKE_PHASES.FL + 1.0) % 1.0 * Math.PI * 2);
            const frStance = Math.sin((cycle - GAIT_STRIKE_PHASES.FR + 1.0) % 1.0 * Math.PI * 2);

            if (this.bones.shoulderFL) {
                this.bones.shoulderFL.position.y = Math.max(0, flStance) * 0.04;
                this._applyLocalRot('shoulderFL', flStance * 0.05, 0, 0);
            }
            if (this.bones.shoulderFR) {
                this.bones.shoulderFR.position.y = Math.max(0, frStance) * 0.04;
                this._applyLocalRot('shoulderFR', frStance * 0.05, 0, 0);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. BIOMECHANISCHE TRANSITIES & AUTHENTIEKE LIGHOUDINGEN
    // ═══════════════════════════════════════════════════════════════════════════

    _applyTransitionsAndPostures(dt) {
        // In alle gevallen blijft de echte Melkkoe (Cow_F) behouden en zichtbaar
        if (!this.model) return;
        this.model.position.set(0, 0.005, 0);
        this.model.visible = true;
        if (this.lyingModel) this.lyingModel.visible = false;
        if (this.eatingModel) this.eatingModel.visible = false;

        // 1. Zijligging (lange rust)
        const isLateral = (this.state.gait === 'lyingLateral' || this.state.gait === 'lyingSleep');
        const targetLateral = isLateral ? 1.0 : 0.0;
        this.lateralLyingFactor += (targetLateral - this.lateralLyingFactor) * Math.min(1.0, dt * 3.5);

        if (this.lateralLyingFactor > 0.01) {
            const f = this.lateralLyingFactor;
            // Rust & diepe slaap: romp blijft rotsvast op de wei, hals en kop rusten ontspannen naar de flank, ogen gesloten
            this._applyLocalRot('neck1', f * 0.18, 0, f * 0.25);
            this._applyLocalRot('neck2', f * 0.15, 0, f * 0.20);
            this._applyLocalRot('head',  f * 0.12, f * 0.18, 0);
            this._applyLocalRot('earL',  0, 0, f * 0.35);
            this._applyLocalRot('earR',  0, 0, -f * 0.35);
            if (this.bones.eyelidL) this.bones.eyelidL.scale.y = 1.0 - f * 0.9;
            if (this.bones.eyelidR) this.bones.eyelidR.scale.y = 1.0 - f * 0.9;
        }

        // 2. REM-slaap: Borstligging met kop op de flank (Jan Hulsen Koesignalen: 30-45 min per dag)
        const isFlankSleep = (this.state.gait === 'lyingSleepFlank');
        const targetFlankSleep = isFlankSleep ? 1.0 : 0.0;
        if (this.sleepFlankFactor === undefined) this.sleepFlankFactor = 0;
        this.sleepFlankFactor += (targetFlankSleep - this.sleepFlankFactor) * Math.min(1.0, dt * 3.5);

        if (this.sleepFlankFactor > 0.01) {
            const sf = this.sleepFlankFactor;
            this._applyLocalRot('spine1', 0, sf * 0.12, 0);
            this._applyLocalRot('spine2', 0, sf * 0.22, 0);
            this._applyLocalRot('chest',  0, sf * 0.28, 0);
            this._applyLocalRot('neck1', sf * 0.10, sf * 0.72, sf * 0.32);
            this._applyLocalRot('neck2', sf * 0.08, sf * 0.65, sf * 0.25);
            this._applyLocalRot('head',  -sf * 0.12, sf * 0.52, -sf * 0.18);
            this._applyLocalRot('earL',  0, 0, sf * 0.40);
            this._applyLocalRot('earR',  0, 0, -sf * 0.40);
            if (this.bones.eyelidL) this.bones.eyelidL.scale.y = 1.0 - sf * 0.95;
            if (this.bones.eyelidR) this.bones.eyelidR.scale.y = 1.0 - sf * 0.95;
        }

        // 3. DeLaval Boxhangen / Wachtstand (Perching in cubicle: signaal van aarzeling, pijnlijke knieën of harde box)
        const isBoxHanging = (this.state.gait === 'boxHanging');
        const targetBoxHanging = isBoxHanging ? 1.0 : 0.0;
        if (this.boxHangingFactor === undefined) this.boxHangingFactor = 0;
        this.boxHangingFactor += (targetBoxHanging - this.boxHangingFactor) * Math.min(1.0, dt * 3.5);

        if (this.boxHangingFactor > 0.01) {
            const bf = this.boxHangingFactor;
            // Voorpoten hoger op ligboxdrempel, kyfose in lendenwervels, kop voorwaarts gehouden, oren alert zijwaarts
            this._applyLocalRot('spine1', 0, 0, bf * 0.06);
            this._applyLocalRot('spine2', 0, 0, bf * 0.08);
            this._applyLocalRot('neck1', -bf * 0.10, 0, 0);
            this._applyLocalRot('head',   bf * 0.14, 0, 0);
            this._applyLocalRot('earL',   0, -bf * 0.30, bf * 0.15);
            this._applyLocalRot('earR',   0,  bf * 0.30, -bf * 0.15);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. MICRO-GEDRAG, ETHOLOGIE & PATHOLOGIE
    // ═══════════════════════════════════════════════════════════════════════════

    _applyComprehensiveEthology(dt) {
        const t = this.time;

        // ── A. Herkauwen (50-70 bpm + slokdarmslik + Jan Hulsen Kauwslagenteller) ──
        if (this.state.ruminating) {
            this.ruminateCycle += dt;
            this.bolusChewTime += dt;
            const rate = (this.state.ruminateRate / 60) * Math.PI * 2;
            const rateHz = (this.state.ruminateRate || 60) / 60;
            const chews = Math.floor(this.bolusChewTime * rateHz);
            this.telemetry.bolusChews = Math.min(75, chews);
            this.telemetry.chewingRateBpm = this.state.ruminateRate;

            if (this.ruminatePaused) {
                this.ruminatePauseTimer -= dt;
                const swallow = Math.sin((3.5 - this.ruminatePauseTimer) * 4.0);
                this._applyLocalRot('neck1', swallow * 0.05, 0, 0);
                this._applyLocalRot('neck2', swallow * 0.04, 0, 0);
                if (this.ruminatePauseTimer <= 0) {
                    this.ruminatePaused = false;
                    this.ruminateCycle = 0;
                    this.bolusChewTime = 0;
                }
            } else {
                const angle = this.ruminateCycle * rate;
                // Biologische herkauwbeweging (Bos taurus):
                // Gesloten bek: GEEN grote verticale bek-opening (lippen blijven gesloten).
                // Ritmische laterale maalgang (zijwaartse uitslag van de onderkaak tegen de maalkiezen).
                // Tong blijft ALTIJD 100% binnen in de bek (nooit tong naar buiten tijdens herkauwen).
                const lateralGrind = Math.sin(angle) * 0.035;
                const rollGrind    = Math.cos(angle) * 0.012;
                const verticalMicro= Math.max(0, Math.cos(angle)) * 0.005; // minimale speling tussen kauwslagen
                this._applyLocalRot('jaw', verticalMicro, lateralGrind, rollGrind);

                if (this.bones.tongue1) this.bones.tongue1.rotation.set(0, 0, 0);
                if (this.bones.tongue2) this.bones.tongue2.rotation.set(0, 0, 0);
                if (this.bones.tongue3) this.bones.tongue3.rotation.set(0, 0, 0);

                // Jan Hulsen norm: 55-65 slagen per brok
                if (chews >= 58 || this.bolusChewTime > 48.0) {
                    this.ruminatePaused = true;
                    this.ruminatePauseTimer = 4.0;
                }
            }
        } else {
            this.telemetry.chewingRateBpm = 0;
            this.telemetry.bolusChews = 0;
        }

        // ── B. Hittestress & Panting Score (0-4) ──────────────────────────────
        if (this.state.heatStress) {
            const pant = Math.max(1, this.state.pantingScore || 3);
            this.telemetry.currentPantingScore = pant;
            this.state.breathingRate = 50 + pant * 15; // 65 - 110 bpm

            this._applyLocalRot('neck1', 0.15 + pant * 0.04, 0, 0);
            this._applyLocalRot('head', -0.08 - pant * 0.03, 0, 0);

            if (pant >= 2) this._applyLocalRot('jaw', 0.25 + pant * 0.08, 0, 0);
            if (pant >= 3) {
                // Tong steekt uit bek
                if (this.bones.tongue1) this._applyLocalRot('tongue1', 0.28, 0, 0);
                if (this.bones.tongue2) this._applyLocalRot('tongue2', 0.36, 0, 0);
                if (this.bones.tongue3) this._applyLocalRot('tongue3', 0.22, 0, 0);
            }
        } else {
            this.telemetry.currentPantingScore = 0;
        }

        // ── C. Flanklikken (Self-Grooming) ───────────────────────────────────
        if (this.state.flankLicking) {
            // Diepe C-boog van hals en kop naar de linkerflank
            this._applyLocalRot('spine2', 0, 0.15, 0);
            this._applyLocalRot('chest',  0, 0.25, 0);
            this._applyLocalRot('neck1',  0.20, 0.65, 0);
            this._applyLocalRot('neck2',  0.15, 0.50, 0);
            this._applyLocalRot('head',   0.10, 0.40, 0);
            this._applyLocalRot('jaw',    0.14 + Math.sin(t * 5.0) * 0.08, 0, 0);
            if (this.bones.tongue1) this._applyLocalRot('tongue1', 0.20 + Math.sin(t * 5.0) * 0.1, 0, 0);
        }

        // ── D. Pootstampen tegen vliegen ────────────────────────────────────
        if (this.state.footStamping) {
            const stampCycle = Math.sin(t * 8.0);
            if (stampCycle > 0) {
                this._applyLocalRot('upperLegFR', -stampCycle * 0.25, 0, 0);
                this._applyLocalRot('lowerLegFR',  stampCycle * 0.55, 0, 0);
            }
        }

        // ── E. Dreighouding (Head-Butting Threat) ────────────────────────────
        if (this._threatBlend === undefined) this._threatBlend = 0.0;
        const targetThreat = this.state.headButtThreat ? 1.0 : 0.0;
        this._threatBlend = THREE.MathUtils.damp(this._threatBlend, targetThreat, 4.0, dt);
        const tb = this._threatBlend;
        if (tb > 0.001) {
            this._applyLocalRot('neck1', 0.48 * tb, 0, 0); // Kop laag bij de grond
            this._applyLocalRot('head',  0.30 * tb, 0, 0); // Hoorns/voorhoofd frontaal
            this._applyLocalRot('earL',  0, 0, -0.45 * tb); // Oren naar achter gedraaid
            this._applyLocalRot('earR',  0, 0,  0.45 * tb);
        }

        // ── F. Bespringen / Rijden (Mounting Behavior) ───────────────────────
        if (this._mountBlend === undefined) this._mountBlend = 0.0;
        const targetMount = this.state.mounting ? 1.0 : 0.0;
        this._mountBlend = THREE.MathUtils.damp(this._mountBlend, targetMount, 3.5, dt);
        const mb = this._mountBlend;

        if (mb > 0.001) {
            // Slerp voorbeenbotten naar baseQuat om de dynamische stapzwaai van loopgangen
            // vloeiend te dempen naar de natuurlijke gedragen klemhouding
            ['collarFL', 'collarFR', 'upperLegFL', 'upperLegFR', 'lowerLegFL', 'lowerLegFR', 'pasternFL', 'pasternFR'].forEach(k => {
                const bone = this.bones[k];
                if (bone && bone._baseQuat) {
                    bone.quaternion.slerp(bone._baseQuat, mb * 0.85);
                }
            });

            // 1. Bekken en Wervelkolom: Oprichting van de voorhand (Rearing / Upward pitch)
            this._applyLocalRot('pelvis', -0.52 * mb, 0, 0);
            this._applyLocalRot('spine1', -0.10 * mb, 0, 0);
            this._applyLocalRot('spine2', -0.06 * mb, 0, 0);
            this._applyLocalRot('spine3', -0.03 * mb, 0, 0);

            // 2. Achterpoten: Grondcontact en dragende steunfunctie
            this._applyLocalRot('upperLegHL', 0.46 * mb, 0,  0.05 * mb);
            this._applyLocalRot('upperLegHR', 0.46 * mb, 0, -0.05 * mb);
            this._applyLocalRot('lowerLegHL', -0.14 * mb, 0, 0);
            this._applyLocalRot('lowerLegHR', -0.14 * mb, 0, 0);
            this._applyLocalRot('pasternHL',   0.08 * mb, 0, 0);
            this._applyLocalRot('pasternHR',   0.08 * mb, 0, 0);

            // 3. Voorpoten: Klemhouding / Omhelzing (Clasping posture)
            this._applyLocalRot('collarFL',   0.40 * mb, 0, -0.18 * mb);
            this._applyLocalRot('collarFR',   0.40 * mb, 0,  0.18 * mb);
            this._applyLocalRot('upperLegFL', -0.22 * mb, 0,  0.14 * mb);
            this._applyLocalRot('upperLegFR', -0.22 * mb, 0, -0.14 * mb);
            this._applyLocalRot('lowerLegFL', 0, 0, 0.48 * mb);
            this._applyLocalRot('lowerLegFR', 0, 0, 0.48 * mb);
            this._applyLocalRot('pasternFL',  0, 0, 0.22 * mb);
            this._applyLocalRot('pasternFR',  0, 0, 0.22 * mb);

            // 4. Hals en Kop: Voorwaarts gericht over de schoft van de partner
            this._applyLocalRot('neck1', 0.26 * mb, 0, 0);
            this._applyLocalRot('head',  0.18 * mb, 0, 0);

            // 5. Staart: Opgewonden staartheffing
            this._applyLocalRot('tail0', 0.38 * mb, 0, 0);
            this._applyLocalRot('tail1', 0.22 * mb, 0, 0);

            // 6. Ritmische dek-stoot / copulatoire puls (~1.3 Hz)
            if (mb > 0.4) {
                const thrust = Math.sin(t * 8.0) * 0.04 * mb;
                this._applyLocalRot('pelvis', thrust, 0, 0);
            }
        }

        // ── G. Flehmen Reukrespons ──────────────────────────────────────────
        if (this._flehmenBlend === undefined) this._flehmenBlend = 0.0;
        const targetFlehmen = this.state.flehmen ? 1.0 : 0.0;
        this._flehmenBlend = THREE.MathUtils.damp(this._flehmenBlend, targetFlehmen, 4.0, dt);
        const fb = this._flehmenBlend;
        if (fb > 0.001) {
            this._applyLocalRot('neck1', -0.28 * fb, 0, 0);
            this._applyLocalRot('head',  -0.35 * fb, 0, 0);
            this._applyLocalRot('jaw',    0.22 * fb, 0, 0); // Bovenlip opgetrokken
        }

        // ── Sociale Kudde-Interacties (research Broom & Fraser 2015 / Bouissou 2001) ──
        if (this.state.allogroomingActive) {
            // Likker: hals schuin gericht naar partner, mond open, ritmische tonglikbewegingen
            this._applyLocalRot('neck1', 0.18, 0.32, 0);
            this._applyLocalRot('head',  0.15, 0.28, 0);
            this._applyLocalRot('jaw',   0.20, 0, 0);
            const lick = Math.sin(t * 7.5);
            if (lick > 0) {
                this._applyLocalRot('tongue1', 0.35 * lick, 0, 0);
                this._applyLocalRot('tongue2', 0.45 * lick, 0, 0);
                this._applyLocalRot('tongue3', 0.35 * lick, 0, 0);
            }
        }
        if (this.state.allogroomingReceiver) {
            // Ontvanger: hals horizontaal gestrekt, oren ontspannen (hartslagverlagend kalmeringsgedrag)
            this._applyLocalRot('neck1', -0.16, -0.12, 0);
            this._applyLocalRot('head',  -0.12, -0.08, 0);
            this._applyLocalRot('earL',   0, 0, -0.40);
            this._applyLocalRot('earR',   0, 0,  0.40);
        }
        if (this.state.headAversion) {
            // Onderdanige koe wendt kop 30° zijwaarts af van dominante koe (Bouissou et al. 2001)
            this._applyLocalRot('neck1', 0.12, -0.52, 0);
            this._applyLocalRot('head', -0.05, -0.38, 0);
            this._applyLocalRot('earL',  0, 0, -0.35);
            this._applyLocalRot('earR',  0, 0,  0.35);
        }
        if (this.state.socialSniffing) {
            // Neus-aan-neus begroeting & feromoneninspectie
            this._applyLocalRot('neck1', -0.22, 0, 0);
            this._applyLocalRot('head',   0.24, 0, 0);
        }

        // ── H. Tochtigheid (Sta-Tocht & Lordose) ───────────────────────────────
        if (this._estrusBlend === undefined) this._estrusBlend = 0.0;
        const targetEstrus = this.state.estrus ? 1.0 : 0.0;
        this._estrusBlend = THREE.MathUtils.damp(this._estrusBlend, targetEstrus, 4.0, dt);
        const eb = this._estrusBlend;
        if (eb > 0.001) {
            // Lordose: lendenrug hol getrokken om dekking toe te staan
            this._applyLocalRot('spine1', -0.07 * eb, 0, 0);
            this._applyLocalRot('spine2', -0.04 * eb, 0, 0);
            // Staartbasis opgetild en lateraal afgewend (vulva-presentatie)
            this._applyLocalRot('tail0',   0.24 * eb, 0.16 * eb, 0);
            this._applyLocalRot('tail1',   0.12 * eb, 0.10 * eb, 0);

            // Sta-tocht reflex (bij stilstaan): achterpoten breed en onwrikbaar geplant
            if (this.state.gait === 'idle' || this.state.gait === 'idleRest') {
                this._applyLocalRot('upperLegHL', 0, 0,  0.06 * eb);
                this._applyLocalRot('upperLegHR', 0, 0, -0.06 * eb);
                this._applyLocalRot('head', -0.08 * eb, 0, 0);
            }
        }

        // ── I. Pijngezicht & Buikpijn / Zaagbokshouding ──────────────────────
        if (this.state.bovinePainFace) {
            // Oren achterwaarts gericht, ogen geknepen
            this._applyLocalRot('earL', 0, 0, -0.60);
            this._applyLocalRot('earR', 0, 0,  0.60);
            this._applyLocalRot('eyelidL', 0.40, 0, 0);
            this._applyLocalRot('eyelidR', 0.40, 0, 0);
        }
        if (this.state.sawhorseStance) {
            // Zaagbokshouding: voorpoten naar voren, achterpoten ver naar achteren
            this._applyLocalRot('upperLegFL', -0.20, 0, 0);
            this._applyLocalRot('upperLegFR', -0.20, 0, 0);
            this._applyLocalRot('upperLegHL',  0.22, 0, 0);
            this._applyLocalRot('upperLegHR',  0.22, 0, 0);
            this._applyLocalRot('spine1', 0.12, 0, 0); // Kyfose
        }
        if (this.state.lethargic) {
            // Ziek / lusteloos: hangende kop en oren
            this._applyLocalRot('neck1', 0.42, 0, 0);
            this._applyLocalRot('head',  0.15, 0, 0);
            this._applyLocalRot('earL',  0, 0, 0.50);
            this._applyLocalRot('earR',  0, 0, -0.50);
        }

        // ── J. Loeien ───────────────────────────────────────────────────────
        if (this._bellowBlend === undefined) this._bellowBlend = 0.0;
        const targetBellow = this.state.bellowing ? 1.0 : 0.0;
        this._bellowBlend = THREE.MathUtils.damp(this._bellowBlend, targetBellow, 4.0, dt);
        const bb = this._bellowBlend;
        if (bb > 0.001) {
            const yellPulse = Math.sin(t * 8.0);
            this._applyLocalRot('neck1', -0.32 * bb, 0, 0);
            this._applyLocalRot('head',  -0.25 * bb, 0, 0);
            this._applyLocalRot('jaw',   (0.40 + yellPulse * 0.08) * bb, 0, 0);
            this._applyLocalRot('tail0',  0.22 * bb, 0, 0);
        }

        // ── K. Mesten & Plassen ─────────────────────────────────────────────
        if (this.state.defecation) {
            this._applyLocalRot('spine1', 0.12, 0, 0);
            this._applyLocalRot('tail0',  0.80, 0, 0);
            this._applyLocalRot('tail1',  0.55, 0, 0);
        }
        if (this.state.urination) {
            this._applyLocalRot('spine1', 0.14, 0, 0);
            this._applyLocalRot('tail0',  0.65, 0, 0);
            // Achterpoten gespreid
            this._applyLocalRot('upperLegHL', 0.12, 0, -0.15);
            this._applyLocalRot('upperLegHR', 0.12, 0,  0.15);
        }

        // ── L. Kopschudden ──────────────────────────────────────────────────
        if (this.state.headShake) {
            const shake = Math.sin(t * 26) * 0.22;
            this._applyLocalRot('head', 0, shake, 0);
            this._applyLocalRot('earL', 0, 0,  shake * 2.8);
            this._applyLocalRot('earR', 0, 0, -shake * 2.8);
        }

        // ── M. Oren Flikkeren ───────────────────────────────────────────────
        if (this.state.earFlickL && !this.state.headShake) {
            this._applyLocalRot('earL', 0, 0, this.springs.earL.currentValue * 0.7);
        }
        if (this.state.earFlickR && !this.state.headShake) {
            this._applyLocalRot('earR', 0, 0, -this.springs.earR.currentValue * 0.7);
        }

        // Spontane timers
        this._auto.earL -= dt;
        if (this._auto.earL <= 0) {
            this.state.earFlickL = true;
            setTimeout(() => { this.state.earFlickL = false; }, 320);
            this._auto.earL = 3.5 + Math.random() * 6.5;
        }
        this._auto.earR -= dt;
        if (this._auto.earR <= 0) {
            this.state.earFlickR = true;
            setTimeout(() => { this.state.earFlickR = false; }, 320);
            this._auto.earR = 4.5 + Math.random() * 7.5;
        }
        this._auto.stamp -= dt;
        if (this._auto.stamp <= 0) {
            this.state.footStamping = true;
            setTimeout(() => { this.state.footStamping = false; }, 800);
            this._auto.stamp = 12.0 + Math.random() * 20.0;
        }
    }

    _applyZootechnicalConformation(dt) {
        const bcs = this.state.bcs !== undefined ? this.state.bcs : 3.0;
        const parity = this.state.parity !== undefined ? this.state.parity : 2;
        const gestDays = this.state.gestationDays !== undefined ? this.state.gestationDays : 0;
        const rumenFill = (this.state.rumenScore !== undefined)
            ? Math.max(0.0, Math.min(1.0, (this.state.rumenScore - 1.0) / 4.0))
            : (this.state.rumenFill !== undefined ? this.state.rumenFill : 0.65);
        const gestProg = Math.max(0, Math.min(1.0, gestDays / 280.0));
        const fetalVolume = Math.pow(gestProg, 2.8); // Exponentiële foetale groei in trimester 3

        // ── 1. Authentieke Geometrische Conformatie (BCS, Dracht, Pens, Pariteit) ──
        // Alle volumetrische en fysiologische conformatie (BCS, kalfbuik, pens en frame)
        // wordt direct op de hoekpunten (vertices) gemodelleerd. Zo vermijden we categorisch
        // exponentiële schaalvermenigvuldiging (compounding in Spine1 -> Spine2 -> Spine3 -> Chest).
        this._applyAnatomicalConformation(bcs, gestDays, parity, rumenFill);

        // ── 1b. CRV Lineair Exterieur Effecten (Schaal 88 - 112) ──
        let baseChestW = 1.0;
        let baseChestD = 1.0;
        let bt = null;
        if (this.breedingManager) {
            bt = this.breedingManager.getTraits();
            // Hoogtemaat (Stature: 88 compact .. 112 groot frame)
            if (bt.stature && this.model) {
                const statScale = 1.0 + (bt.stature - 100) * 0.015;
                this.model.scale.set(statScale, statScale, statScale);
            }
            // Voorhand & Borstbreedte (88 smal .. 112 breed)
            if (bt.chestWidth) {
                baseChestW = 1.0 + (bt.chestWidth - 100) * 0.012;
                const chestDelta = (bt.chestWidth - 100) * 0.0075;
                if (this.bones.collarFL && this.bones.collarFL._basePos) {
                    this.bones.collarFL.position.x = this.bones.collarFL._basePos.x + chestDelta;
                }
                if (this.bones.collarFR && this.bones.collarFR._basePos) {
                    this.bones.collarFR.position.x = this.bones.collarFR._basePos.x - chestDelta;
                }
            }
            // Inhoud & Rompdiepte (88 ondiep .. 112 diep)
            if (bt.bodyDepth) {
                baseChestD = 1.0 + (bt.bodyDepth - 100) * 0.012;
            }
            // Kruisligging (88 overbouwd/oplopend .. 100 ideaal .. 112 steil/dakvormig)
            if (bt.rumpAngle) {
                const rumpTilt = (bt.rumpAngle - 100) * 0.022;
                this._applyLocalRot('pelvis', rumpTilt, 0, 0);
            }
            // Kruisbreedte (88 smal .. 112 breed tussen zitbeenderen)
            if (bt.rumpWidth) {
                const rumpDelta = (bt.rumpWidth - 100) * 0.0075;
                if (this.bones.upperLegHL && this.bones.upperLegHL._basePos) {
                    this.bones.upperLegHL.position.x = this.bones.upperLegHL._basePos.x + rumpDelta;
                }
                if (this.bones.upperLegHR && this.bones.upperLegHR._basePos) {
                    this.bones.upperLegHR.position.x = this.bones.upperLegHR._basePos.x - rumpDelta;
                }
            }
            // Stand achterbenen achter (88 koehakkig/naar binnen .. 100 parallel .. 112 wijd)
            if (bt.rearLegRear) {
                const hockSpread = (bt.rearLegRear - 100) * 0.020;
                this._applyLocalRot('lowerLegHL', 0, 0, -hockSpread);
                this._applyLocalRot('lowerLegHR', 0, 0, hockSpread);
            }
            // Stand achterbenen zij (88 steil .. 100 normaal .. 112 sabelbenig/krom)
            if (bt.rearLegSide) {
                const hockTilt = (bt.rearLegSide - 100) * 0.025;
                this._applyLocalRot('lowerLegHL', hockTilt, 0, 0);
                this._applyLocalRot('lowerLegHR', hockTilt, 0, 0);
            }
            // Klauwhoek (88 plat/lage verzenen .. 100 normaal .. 112 steil)
            if (bt.clawAngle) {
                const clawTilt = (bt.clawAngle - 100) * 0.025;
                this._applyLocalRot('pasternHL', clawTilt, 0, 0);
                this._applyLocalRot('pasternHR', clawTilt, 0, 0);
                this._applyLocalRot('pasternFL', clawTilt, 0, 0);
                this._applyLocalRot('pasternFR', clawTilt, 0, 0);
            }
            // Voorbeenstand (88 frans/naar buiten .. 100 recht .. 112 recht/parallel)
            if (bt.frontLegStance) {
                const frontLegYaw = (bt.frontLegStance - 100) * 0.018;
                this._applyLocalRot('lowerLegFL', 0, frontLegYaw, 0);
                this._applyLocalRot('lowerLegFR', 0, -frontLegYaw, 0);
            }
        }

        // Vergrendel alle wervelkolom- en bekkenbotten permanent op 1.0 (schaalvermenigvuldiging uitgesloten)
        if (this.bones.spine1) this.bones.spine1.scale.set(1.0, 1.0, 1.0);
        if (this.bones.spine2) this.bones.spine2.scale.set(1.0, 1.0, 1.0);
        if (this.bones.spine3) this.bones.spine3.scale.set(1.0, 1.0, 1.0);
        if (this.bones.pelvis) this.bones.pelvis.scale.set(1.0, 1.0, 1.0);
        this._baseChestWidth = baseChestW;
        this._baseChestDepth = baseChestD;

        // Verslapping bekkenbanden in laatste 14 dagen van dracht (relaxine & oestrogeen)
        // Klinisch afkalfkenmerk: wegzakken van de sacrosciatische banden naast de staartinplant
        if (gestDays >= 266 && this.bones.pelvis) {
            const relaxin = (gestDays - 266) / 16.0;
            this._applyLocalRot('pelvis', relaxin * 0.05, 0, 0);
            if (this.bones.tail0) {
                this._applyLocalRot('tail0', relaxin * 0.08, 0, 0);
            }
        }

        // ── 3. Pariteit, Dracht & Uierconformatie (Colostrogenese / Opstuwing) ─
        // Pariteit 0: compact hoog vaarzenuier
        // Pariteit 4-5+: diep hangend meerkalfsuier door uitgerekte ophangband
        // Laatdrachtig (dag 240-280): uierstuwing (oedeem en colostrumvorming vóór het kalven)
        if (this.bones.udder1) {
            let udderScaleY = 1.0;
            let udderScaleXZ = 1.0;
            let udderOffsetY = 0;
            if (parity === 0) {
                udderScaleY = 0.65;
                udderScaleXZ = 0.82;
                udderOffsetY = 0.045;
            } else if (parity === 1) {
                udderScaleY = 0.88;
                udderScaleXZ = 0.95;
                udderOffsetY = 0.015;
            } else if (parity >= 4) {
                udderScaleY = 1.35;
                udderScaleXZ = 1.15;
                udderOffsetY = -0.065;
            }

            // CRV Uierdiepte fokwaarde invloed (88 diep .. 112 ondiep)
            if (bt && bt.udderDepth) {
                const udderDepthMod = (bt.udderDepth - 100) * 0.012;
                udderOffsetY += udderDepthMod;
                udderScaleY -= udderDepthMod * 1.5;
            }

            // CRV Speenlengte fokwaarde invloed (88 kort .. 112 lang)
            if (bt && bt.teatLength && this.bones.udder2) {
                const teatScale = 1.0 + (bt.teatLength - 100) * 0.025;
                this.bones.udder2.scale.set(teatScale, teatScale, teatScale);
            }

            // Pre-partum uierstuwing en oedeem in de laatste 40 dagen
            const preCalvingUdderBoost = (gestDays >= 240) ? ((gestDays - 240) / 40.0) * 0.50 : 0;
            const effectiveUdderFill = Math.min(1.0, this.state.udderFill + preCalvingUdderBoost);

            this.bones.udder1.scale.set(
                udderScaleXZ * (1.0 + effectiveUdderFill * 0.35),
                udderScaleY * (0.75 + effectiveUdderFill * 0.65),
                udderScaleXZ * (1.0 + effectiveUdderFill * 0.40)
            );
            this.bones.udder1.position.y = -0.15 + udderOffsetY - preCalvingUdderBoost * 0.035;
        }

        // ── 4. Waggelpas bij hoogdrachtige koeien ─────────────────────────────
        // Door de zware buik en het volle uier worden de achterpoten breder neergezet (abductie)
        if (gestDays >= 180 && (this.state.gait === 'walk' || this.state.gait === 'trot')) {
            const waddle = Math.sin(this.walkCyclePhase * Math.PI * 2) * (fetalVolume * 0.05);
            this._applyLocalRot('upperLegHL', 0, -fetalVolume * 0.04, -waddle - fetalVolume * 0.045);
            this._applyLocalRot('upperLegHR', 0,  fetalVolume * 0.04,  waddle + fetalVolume * 0.045);
            this._applyLocalRot('pelvis', 0, 0, waddle * 0.4);
        }
    }

    _applyBreathing(dt) {
        const bpm    = this.state.breathingRate;
        const freq   = (bpm / 60) * Math.PI * 2;
        const breath = Math.sin(this.time * freq) * 0.5 + 0.5;
        const amp    = this.state.heatStress ? 0.08 : 0.028;
        const baseWidth = this._baseChestWidth || 1.0;
        const baseDepth = this._baseChestDepth || 1.0;
        if (this.bones.chest) {
            // Ademhaling zet de borstkas LATERAAL (ribbenuitzetting, Local Z) en VENTRAAL (Local Y) uit.
            // Local X (lengte) blijft altijd 1.0!
            const sY = baseDepth * (1 + breath * amp * 0.55);
            const sZ = baseWidth * (1 + breath * amp);
            this.bones.chest.scale.set(1.0, sY, sZ);

            // ── Zwaartekracht & Synsarcosis-verankering (Dyce et al. 2010 / Phillips 2002) ──
            // Bij herkauwers rust het gewicht van de thorax via de spiersling (m. serratus ventralis)
            // stabiel op de voorbenen. De klauwen blijven onder zwaartekracht en grondreactiekracht
            // 100% vlak op de grond staan en mogen NOOIT op-en-neer wippen door ademhaling.
            const invY = 1.0 / sY;
            const invZ = 1.0 / sZ;
            ['collarFL', 'collarFR', 'shoulderFL', 'shoulderFR'].forEach(k => {
                const c = this.bones[k];
                if (c && c._basePos) {
                    c.scale.set(1.0, invY, invZ);
                    c.position.set(c._basePos.x, c._basePos.y * invY, c._basePos.z * invZ);
                }
            });
            if (this.bones.neck1 && this.bones.neck1._basePos) {
                const n = this.bones.neck1;
                n.scale.set(1.0, invY, invZ);
                n.position.set(n._basePos.x, n._basePos.y * invY, n._basePos.z * invZ);
            }
        }
    }

    _applyBlinking(dt) {
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
            this.isBlinking = true;
            this.blinkTimer = 2.5 + Math.random() * 4.0;
            setTimeout(() => { this.isBlinking = false; }, 160);
        }

        if (this.isBlinking && !this.state.bovinePainFace) {
            this._applyLocalRot('eyelidL', 0.65, 0, 0);
            this._applyLocalRot('eyelidR', 0.65, 0, 0);
        }
    }

    _applyPhysics(dt) {
        if (this.bones.udder1) {
            this.bones.udder1.scale.setScalar(0.75 + this.state.udderFill * 0.60);
            if (this.state.gait === 'walk' || this.state.gait === 'trot') {
                const impulseX = Math.sin(this.walkCyclePhase * Math.PI * 4) * this.state.walkSpeed * 0.95;
                const impulseZ = Math.cos(this.walkCyclePhase * Math.PI * 2) * this.state.walkSpeed * 0.45;
                this.springs.udderX.velocity += impulseX;
                this.springs.udderZ.velocity += impulseZ;
            }
            const ux = this.springs.udderX.update(dt);
            const uz = this.springs.udderZ.update(dt);
            this._applyLocalRot('udder1', uz * 0.07, 0, ux * 0.07);
        }

        const intensity = (this.state.tailSwishIntensity !== undefined ? this.state.tailSwishIntensity : (this.state.tailSwish ?? 0.25));
        const swish = Math.sin(this.time * 4) * (Number.isFinite(intensity) ? intensity : 0.25) * 0.90;
        this.springs.tailX.setTarget(swish);
        const tx = this.springs.tailX.update(dt) || 0;
        const tz = this.springs.tailZ.update(dt) || 0;
        ['tail0','tail1','tail2','tail3','tail4','tail5'].forEach((k, i) => {
            const dec = 1.0 + i * 0.35;
            this._applyLocalRot(k, tz * 0.10 * dec, 0, tx * 0.16 * dec);
        });

        this.springs.earL.setTarget(this.state.earFlickL ? Math.sin(this.time * 15) * 0.65 : 0);
        this.springs.earR.setTarget(this.state.earFlickR ? Math.sin(this.time * 15 + 1) * 0.65 : 0);
        this.springs.earL.update(dt);
        this.springs.earR.update(dt);
    }

    _applyLocalRot(key, rx = 0, ry = 0, rz = 0) {
        const b = this.bones[key];
        if (!b) return;
        if (!Number.isFinite(rx) || !Number.isFinite(ry) || !Number.isFinite(rz)) return;
        if (rx === 0 && ry === 0 && rz === 0) return;

        _tempEuler.set(rx, ry, rz, 'XYZ');
        _tempQuat.setFromEuler(_tempEuler);
        b.quaternion.multiply(_tempQuat);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. KLOPVASTE GRONDZEKERING / ANTI-SINK GUARD ( research.md & biomechanica )
    // ═══════════════════════════════════════════════════════════════════════════

    _applyGroundContactGuard(dt) {
        // Biomechanische grondzekering:
        // Voorkomt dat de snuit of kop onder het maaiveld zakt bij samenvallende halsbuiging (grazen, dreighouding, kreupelheid)
        if (this.bones.jaw) {
            const jawPos = _tempVecGuard.copy(this.bones.jaw.position);
            this.bones.jaw.getWorldPosition(jawPos);
            if (jawPos.y < 0.12) {
                const pen = 0.12 - jawPos.y;
                const corr = Math.min(0.50, pen * 2.5);
                this._applyLocalRot('neck1', -corr * 0.6, 0, 0);
                this._applyLocalRot('head',  -corr * 0.4, 0, 0);
            }
        }
    }

    _updateStatusUI() {
        if (!this.isSelected) return;
        const gaitNames = {
            walk: 'Lopen (4-takt)', walkSlow: 'Loom stappen (Traag)', trot: 'Draven', gallopPlay: 'Koeiendans / Bokken',
            idle: 'Stilstaan', idleRest: 'Ruststand (3-poten)', grazing: 'Grazen',
            eatingBunk: 'Voerhek vreten', eating: 'Vreten', drinking: 'Drinken',
            lieDown: 'Gaan liggen', standUp: 'Opstaan',
            lying: 'Borstligging', lyingSternal: 'Borstligging', lyingLateral: 'Zijligging (diepe slaap)',
            lyingSleep: 'Zijligging (diepe slaap)', lyingSleepFlank: '💤 Kop op Flank (REM-slaap)',
            boxHanging: '⚠️ Boxhangen (Wachtstand)', backingUp: 'Achteruitlopen',
            downerCow: '🚨 Downer Koe (Melkziekte / Borstligging)',
        };
        const statusEl = document.getElementById('behavior-status');
        if (statusEl) {
            const gaitStr = gaitNames[this.state.gait] || this.state.gait;
            const score = this.state.locomotionScore;
            statusEl.textContent = (score > 1.0 && (this.state.gait === 'walk' || this.state.gait === 'trot'))
                ? `${gaitStr} • Score ${score.toFixed(1)} [${this.state.lameLeg}]`
                : `Gedrag: ${gaitStr}`;
        }

        const cycleEl = document.getElementById('cycle-indicator');
        if (cycleEl) {
            if (this.state.gait === 'walk' || this.state.gait === 'trot' || this.state.gait === 'gallopPlay') {
                const pct = Math.round(this.walkCyclePhase * 100);
                cycleEl.textContent = `Cyclus: ${pct}%`;
            } else {
                cycleEl.textContent = 'Cyclus: —';
            }
        }

        // Synchroniseer knoppen in bedieningspaneel
        document.querySelectorAll('.gait-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.gait === this.state.gait);
        });
    }
}
