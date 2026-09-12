/**
 * IKSolver.js — 2-Bone Inverse Kinematics voor koepoten
 *
 * Implementeert analytische 2-bone IK (cosinusregel) met:
 *   - Pool-vector om knie/hak-richting te sturen
 *   - Voet-op-grond-vlak (Y=0 clamp) om foot-skating te vermijden
 *   - Parent-space transformatie voor correcte bot-rotaties
 *
 * Koe-anatomie:
 *   VOORBENEN: Scapula → UpperLeg (humerus) → LowerLeg (radius/ulna) → Hoof
 *              Knie wijst NAAR VOREN (pool-vector: +Z)
 *   ACHTERBENEN: Hip → UpperLeg (femur) → LowerLeg (tibia) → Hoof
 *              Hak wijst NAAR ACHTEREN (pool-vector: -Z)
 *
 * Voetverankering (foot-planting):
 *   Tijdens de standfase (stance phase) blijft de hoef vastgezet op het grondvlak.
 *   Tijdens de zwaaifase (swing phase) beweegt de IK-target langs een parabolische
 *   boog boven het grondvlak.
 */

import * as THREE from 'three';

// Tijdelijke vectoren (hergebruikt voor performance)
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();
const _mat = new THREE.Matrix4();

const Y_UP = new THREE.Vector3(0, 1, 0);
const Y_DOWN = new THREE.Vector3(0, -1, 0);

export class IKSolver {
    constructor() {}

    /**
     * Analytische 2-bone IK.
     *
     * @param {THREE.Bone}    upperBone     - bovenste bot (heup/schouder)
     * @param {THREE.Bone}    lowerBone     - onderste bot (knie/hak)
     * @param {THREE.Bone}    endBone       - eindbot (hoef) — alleen ter referentie
     * @param {THREE.Vector3} targetWorld   - gewenste world-positie van de hoef
     * @param {THREE.Vector3} poleWorld     - pool-vector (knierichting) in world space
     * @param {number}        L1            - lengte van upperBone
     * @param {number}        L2            - lengte van lowerBone
     */
    solve2Bone(upperBone, lowerBone, endBone, targetWorld, poleWorld, L1, L2) {
        if (!upperBone || !lowerBone) return;

        // ── 1. Rootpositie in world space ────────────────────────────────────
        upperBone.getWorldPosition(_v0); // rootPos

        // Richting van root naar target
        _v1.subVectors(targetWorld, _v0); // rootToTarget
        let D = _v1.length();

        // Clamp: doelwit is niet verder dan arm-lengte
        const maxReach = (L1 + L2) * 0.999;
        if (D > maxReach) {
            _v1.normalize().multiplyScalar(maxReach);
            D = maxReach;
        }
        // Minimum afstand (geen volledig gestrekte arm)
        if (D < Math.abs(L1 - L2) + 0.001) {
            D = Math.abs(L1 - L2) + 0.001;
        }

        // ── 2. Cosinusregel: hoeken berekenen ────────────────────────────────
        const cosAngleRoot = THREE.MathUtils.clamp(
            (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1
        );
        const cosAngleMid = THREE.MathUtils.clamp(
            (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1
        );
        const angleRoot = Math.acos(cosAngleRoot); // hoek bij upperBone
        const angleMid  = Math.acos(cosAngleMid);  // hoek bij lowerBone (= knie-buiging)

        // ── 3. IK-vlak opzetten (root, target, pool-vector) ──────────────────
        const forward = _v1.clone().normalize(); // van root naar target

        // Pool-vector bepaalt welke kant de knie uitwijkt
        const poleDir = poleWorld.clone().sub(_v0).normalize();
        const right = _v2.crossVectors(poleDir, forward).normalize();
        if (right.lengthSq() < 1e-6) right.set(1, 0, 0); // fallback

        // 'up' in het IK-vlak = normaal van het been-vlak
        const planeUp = new THREE.Vector3().crossVectors(forward, right).normalize();

        // ── 4. World-quaternion voor het bovenste bot ─────────────────────────
        // Basisrotatie: van boven naar doel
        _q0.setFromUnitVectors(Y_DOWN, forward);

        // Knie-buiging: rotateer om het IK-vlak recht
        // De knie buigt 'naar buiten' in het vlak richting pool-vector
        _q1.setFromAxisAngle(right, -angleRoot);
        _q0.premultiply(_q1);

        // ── 5. Omzetten naar local space van het parent-bot ───────────────────
        if (upperBone.parent) {
            upperBone.parent.getWorldQuaternion(_q1);
            _q1.invert();
            _q0.premultiply(_q1);
        }
        upperBone.quaternion.copy(_q0);
        upperBone.updateMatrixWorld(true);

        // ── 6. Onderste bot: knie-buigingshoek (rond X-as in local space) ────
        // angleMid is de hoek die het been maakt bij de knie.
        // In rust (volledig gestrekt) is angleMid = π.
        // We willen de knie met (π - angleMid) graden buigen.
        lowerBone.quaternion.setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            Math.PI - angleMid
        );
        lowerBone.updateMatrixWorld(true);
    }

    /**
     * Berekent de IK-target-positie voor een koepoot op basis van gangcyclus.
     * Geeft een Vector3 terug in world space (Y=0 = grond).
     *
     * @param {string}  leg           - 'FL'|'FR'|'HL'|'HR'
     * @param {number}  phaseTime     - gangfase voor dit been (0..1)
     * @param {THREE.Vector3} bodyPos - positie van het koelichaam
     * @param {number}  bodyRotY      - Y-rotatie van het koelichaam (radialen)
     * @param {number}  speed         - loopsnelheid
     * @param {number}  stanceThreshold - 0..1, aandeel standfase
     * @returns {THREE.Vector3}
     */
    computeLegTarget(leg, phaseTime, bodyPos, bodyRotY, speed, stanceThreshold = 0.6) {
        // Rustpositie van de hoef relatief aan het lichaam
        const offsets = {
            FL: new THREE.Vector3( 0.30, 0,  0.85),
            FR: new THREE.Vector3(-0.30, 0,  0.85),
            HL: new THREE.Vector3( 0.25, 0, -0.75),
            HR: new THREE.Vector3(-0.25, 0, -0.75),
        };
        const restLocal = offsets[leg].clone();

        // Standfase: hoef staat stil op de grond (geplant)
        // Zwaaifase: hoef beweegt in een boog
        const isSwing = phaseTime > stanceThreshold;
        let stepOffset = new THREE.Vector3(0, 0, 0);

        if (isSwing) {
            const swingT = (phaseTime - stanceThreshold) / (1 - stanceThreshold); // 0→1
            const stepH = Math.sin(swingT * Math.PI) * 0.25; // stapbooghoogte
            const stepZ = (swingT - 0.5) * speed * 0.6; // stap naar voren
            stepOffset.set(0, stepH, stepZ);
        } else {
            // Standfase: voet schuift licht naar achteren met loopbeweging
            const stanceT = phaseTime / stanceThreshold; // 0→1
            stepOffset.set(0, 0, (0.5 - stanceT) * speed * 0.3);
        }

        // Combineer met rustpositie en transformeer naar world space
        const localTarget = restLocal.add(stepOffset);

        // Roteer om Y-as van het lichaam
        const cos = Math.cos(bodyRotY), sin = Math.sin(bodyRotY);
        const wx = localTarget.x * cos - localTarget.z * sin + bodyPos.x;
        const wz = localTarget.x * sin + localTarget.z * cos + bodyPos.z;
        const wy = Math.max(0, localTarget.y); // niet onder de grond

        return new THREE.Vector3(wx, wy, wz);
    }
}
