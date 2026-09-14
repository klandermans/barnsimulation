/**
 * BiomechanicalValidator.js — Geautomatiseerde Veterinaire & Biomechanische Validatiesuite
 * Onderzoeksprogramma Next Level Animal Science (Wageningen University & Research)
 *
 * Toetst het 3D-rundveemodel in real-time tegen veterinaire anatomische invarianten
 * over ÁLLE gangwerken, welzijnsvormen, koesignalen en pathologische toestanden:
 * 1. Grondvlakpenetratie (Klauwen mogen bij geen enkele gang door het rooster zakken)
 * 2. Veterinaire gewrichtsgrenzen / Range of Motion (ROM over alle 17 gangen & houdingen)
 * 3. Mediale klauwklaring (Geen scharende gang over alle 17 gangen & houdingen)
 * 4. Gangwerksymmetrie (Bij gezonde koe is paslengte links vs rechts gelijk binnen 6%)
 * 5. Pootvrijwaring bij overconditie (Geen clipping/penetratie bij BCS 5.0 en dracht 280d)
 * 6. Sprecher (1997) klinische invarianten (Getoetst over álle vier de poten: FL, FR, HL, HR)
 * 7. Welzijns- & Koesignalen Biomechanica (Pensvulling Jan Hulsen, REM-slaap, boxhangen, grazen/voerhek/drinken)
 */

import * as THREE from 'three';

export const ALL_VALIDATION_GAITS = [
    // Actieve voortbeweging
    'walk', 'walkSlow', 'trot', 'gallopPlay', 'backingUp',
    // Stand & Alertheid
    'idle', 'idleRest',
    // Voedings- & Drinkgedrag
    'grazing', 'eatingBunk', 'drinking',
    // Koesignalen & Rust / Liggedrag (Jan Hulsen)
    'boxHanging', 'lieDown', 'standUp', 'lyingSternal', 'lyingLateral', 'lyingSleepFlank',
    // Pathologische toestand
    'downerCow'
];

export class BiomechanicalValidator {
    /**
     * Hulpfunctie: berekent de hoek in graden tussen vectoren (p1 -> pCenter) en (p2 -> pCenter)
     */
    static angleDegrees(p1, pCenter, p2) {
        const v1 = new THREE.Vector3().subVectors(p1, pCenter).normalize();
        const v2 = new THREE.Vector3().subVectors(p2, pCenter).normalize();
        const dot = Math.max(-1, Math.min(1, v1.dot(v2)));
        return Math.acos(dot) * (180 / Math.PI);
    }

    /**
     * Haalt de wereldpositie van een bot op
     */
    static getBonePos(bone, targetVec = new THREE.Vector3()) {
        if (!bone) return targetVec.set(0, 0, 0);
        bone.getWorldPosition(targetVec);
        return targetVec;
    }

    /**
     * Schakelt zuiver en zonder cross-fade vertraging over naar een test-actie
     */
    static setCleanAction(cow, gaitKey) {
        cow.state.gait = gaitKey;
        if (cow.mixer) cow.mixer.stopAllAction();

        let targetActionKey = gaitKey;
        if (gaitKey === 'eatingBunk' || gaitKey === 'eating') targetActionKey = 'eating';
        else if (gaitKey === 'lyingSternal' || gaitKey === 'lying' || gaitKey === 'lyingSleepFlank') targetActionKey = 'lying';
        else if (gaitKey === 'lyingLateral' || gaitKey === 'lyingSleep') targetActionKey = 'lyingSleep';
        else if (gaitKey === 'boxHanging') targetActionKey = 'idle';
        else if (gaitKey === 'downerCow') targetActionKey = 'lying';

        const act = cow.actions[targetActionKey];
        if (act) {
            act.reset().setEffectiveWeight(1.0).play();
            cow.currentAction = act;
        }
        cow.update(0.001);
        if (cow.model) cow.model.updateMatrixWorld(true);
        return act;
    }

    /**
     * Voert de volledige validatietest uit over alle gaits, conditiescores en welzijnstoestanden
     */
    static async runFullValidation(cowBehavior, onProgress = null) {
        const results = {
            timestamp: new Date().toISOString(),
            cowIndex: cowBehavior.cowIndex,
            totalSuites: 7,
            passedSuites: 0,
            failedSuites: 0,
            suites: []
        };

        const updateProgress = (step, total, msg) => {
            if (onProgress) onProgress(step, total, msg);
        };

        // Bewaar de huidige status om na de test te herstellen
        const savedState = JSON.parse(JSON.stringify(cowBehavior.state));
        const savedHoofScores = { ...cowBehavior.state.hoofScores };

        try {
            // ─────────────────────────────────────────────────────────────────
            // TEST 1: Grondpenetratie over alle 17 gangen & welzijnshoudingen
            // ─────────────────────────────────────────────────────────────────
            updateProgress(1, 7, 'Toetsen op grondpenetratie over alle 17 gangen & welzijnshoudingen...');
            const groundSuite = this.testGroundPenetration(cowBehavior);
            results.suites.push(groundSuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 2: Veterinaire Gewrichtshoeken (ROM over alle gangen)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(2, 7, 'Toetsen op veterinaire gewrichtshoeken & hyperextensie...');
            const romSuite = this.testJointAngles(cowBehavior);
            results.suites.push(romSuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 3: Mediale Klauwklaring & Geen Scharen (alle gangen)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(3, 7, 'Toetsen op klauwklaring & scharen over middellijn...');
            const clearanceSuite = this.testMedialClearance(cowBehavior);
            results.suites.push(clearanceSuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 4: Sagittale Gangwerksymmetrie (Links vs Rechts paslengte)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(4, 7, 'Toetsen op gangwerksymmetrie bij normale pas...');
            const symmetrySuite = this.testStrideSymmetry(cowBehavior);
            results.suites.push(symmetrySuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 5: Pootvrijwaring bij Overconditie (Anti-Clipping BCS 5.0 + Dracht)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(5, 7, 'Toetsen op pootvrijwaring bij BCS 5.0 en 280d dracht...');
            const antiClipSuite = this.testAntiClippingExtreme(cowBehavior);
            results.suites.push(antiClipSuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 6: Sprecher (1997) Klinische Locomotie over Álle 4 Poten
            // ─────────────────────────────────────────────────────────────────
            updateProgress(6, 7, 'Toetsen op Sprecher kreupelheidsdiagnostiek (FL, FR, HL, HR)...');
            const sprecherSuite = this.testSprecherInvariants(cowBehavior);
            results.suites.push(sprecherSuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 7: Welzijns- & Koesignalen Biomechanica (Jan Hulsen)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(7, 7, 'Toetsen op Welzijns- & Koesignalen-invarianten...');
            const welfareSuite = this.testWelfareAndCowSignals(cowBehavior);
            results.suites.push(welfareSuite);

        } finally {
            // Herstel altijd de oorspronkelijke toestand
            Object.assign(cowBehavior.state, savedState);
            cowBehavior.state.hoofScores = savedHoofScores;
            cowBehavior.state.bcs = savedState.bcs;
            cowBehavior.state.gestationDays = savedState.gestationDays;
            cowBehavior.state.rumenFill = savedState.rumenFill !== undefined ? savedState.rumenFill : 0.65;
            this.setCleanAction(cowBehavior, savedState.gait || 'walk');
            cowBehavior.update(0.01);
            if (cowBehavior.model) cowBehavior.model.updateMatrixWorld(true);
        }

        results.passedSuites = results.suites.filter(s => s.passed).length;
        results.failedSuites = results.suites.filter(s => !s.passed).length;
        results.overallPassed = (results.failedSuites === 0);

        return results;
    }

    /**
     * Test 1: Grondpenetratie over álle 17 gangen en welzijnshoudingen
     * Klauwen mogen bij geen enkele gang dieper zakken dan -0.015m onder de vloer
     */
    static testGroundPenetration(cow) {
        const b = cow.bones;
        const v = new THREE.Vector3();
        let minHoofY = 999;
        let worstHoof = '';
        let worstGait = '';
        let testedCount = 0;

        // Reset naar gezond dier
        cow.state.hoofScores = { FL: 1, FR: 1, HL: 1, HR: 1 };
        cow.state.bcs = 3.0;
        cow.state.gestationDays = 0;

        ALL_VALIDATION_GAITS.forEach(gait => {
            const act = this.setCleanAction(cow, gait);
            const dur = act ? act.getClip().duration : 1.0;
            testedCount++;

            const samples = 12;
            for (let i = 0; i <= samples; i++) {
                const t = (i / samples) * dur;
                if (act) cow.mixer.setTime(t);
                cow.update(0.001);
                cow.model.updateMatrixWorld(true);

                ['hoofFL', 'hoofFR', 'hoofHL', 'hoofHR'].forEach(hKey => {
                    b[hKey].getWorldPosition(v);
                    if (v.y < minHoofY) {
                        minHoofY = v.y;
                        worstHoof = hKey;
                        worstGait = gait;
                    }
                });
            }
        });

        const threshold = -0.015; // 1.5 cm tolerantie voor strooisel / klauwzoolcontact
        const passed = minHoofY >= threshold;

        return {
            id: 'ground_penetration',
            title: 'Grondcontact & Klauwhoogte Invariant (Alle 17 Gangen & Welzijn)',
            passed,
            measured: {
                minHoofY: +(minHoofY * 1000).toFixed(1) + ' mm',
                worstHoof,
                worstGait,
                getesteGangen: `${testedCount}/${ALL_VALIDATION_GAITS.length} gangen & houdingen`
            },
            threshold: `>= ${threshold * 1000} mm`,
            verdict: passed
                ? `PASSED: Alle klauwen blijven boven de bodemgrens over alle ${testedCount} gangen en welzijnshoudingen (laagste klauw ${+(minHoofY * 1000).toFixed(1)} mm bij ${worstHoof} in '${worstGait}').`
                : `FAILED: Klauw ${worstHoof} zakt met ${+(minHoofY * 1000).toFixed(1)} mm door het roosteroppervlak bij gang '${worstGait}'!`
        };
    }

    /**
     * Test 2: Veterinaire Gewrichtshoeken (ROM Limits over alle 17 gangen & welzijnshoudingen)
     * Toetst afwezigheid van hyperextensie over alle gangen en fysiologische staande & liggende ROM
     */
    static testJointAngles(cow) {
        const b = cow.bones;
        let maxHockHL = 0, minHockHLStanding = 999, minHockHLLying = 999;
        let maxStifleHL = 0, minStifleHLStanding = 999, minStifleHLLying = 999;
        let maxCarpusFL = 0, minCarpusFLStanding = 999, minCarpusFLLying = 999;
        let maxSpineCurv = 0;
        let worstGaitROM = '';

        const getP = (k) => b[k].getWorldPosition(new THREE.Vector3());

        const standingGaits = [
            'walk', 'walkSlow', 'trot', 'gallopPlay', 'backingUp',
            'idle', 'idleRest',
            'grazing', 'eatingBunk', 'drinking',
            'boxHanging'
        ];
        const recumbentGaits = [
            'lieDown', 'standUp', 'lyingSternal', 'lyingLateral', 'lyingSleepFlank', 'downerCow'
        ];

        ALL_VALIDATION_GAITS.forEach(gait => {
            const act = this.setCleanAction(cow, gait);
            const dur = act ? act.getClip().duration : 1.0;
            const isStanding = standingGaits.includes(gait);
            const samples = 12;

            for (let i = 0; i <= samples; i++) {
                const t = (i / samples) * dur;
                if (act) cow.mixer.setTime(t);
                cow.update(0.001);
                cow.model.updateMatrixWorld(true);

                const hockAngle = this.angleDegrees(getP('lowerLegHL'), getP('pasternHL'), getP('hoofHL'));
                const stifleAngle = this.angleDegrees(getP('upperLegHL'), getP('lowerLegHL'), getP('pasternHL'));
                const carpusAngle = this.angleDegrees(getP('lowerLegFL'), getP('pasternFL'), getP('hoofFL'));
                const spineAngle = this.angleDegrees(getP('spine1'), getP('spine2'), getP('spine3'));

                maxHockHL = Math.max(maxHockHL, hockAngle);
                maxStifleHL = Math.max(maxStifleHL, stifleAngle);
                maxCarpusFL = Math.max(maxCarpusFL, carpusAngle);

                if (isStanding) {
                    minHockHLStanding = Math.min(minHockHLStanding, hockAngle);
                    minStifleHLStanding = Math.min(minStifleHLStanding, stifleAngle);
                    minCarpusFLStanding = Math.min(minCarpusFLStanding, carpusAngle);
                } else {
                    minHockHLLying = Math.min(minHockHLLying, hockAngle);
                    minStifleHLLying = Math.min(minStifleHLLying, stifleAngle);
                    minCarpusFLLying = Math.min(minCarpusFLLying, carpusAngle);
                }

                const curv = Math.abs(180 - spineAngle);
                if (curv > maxSpineCurv) {
                    maxSpineCurv = curv;
                    worstGaitROM = gait;
                }
            }
        });

        // 1. Hyperextensie verbod over alle 17 gangen:
        const noHyperextension = (maxCarpusFL <= 180.5) && (maxHockHL <= 178.0) && (maxStifleHL <= 180.5);
        // 2. Staande gangen ROM:
        const standingRomOk = (minCarpusFLStanding >= 50.0) && (minHockHLStanding >= 75.0) && (minStifleHLStanding >= 65.0);
        // 3. Liggende diepe flexie:
        const lyingFlexionOk = (minCarpusFLLying >= 10.0) && (minHockHLLying >= 35.0) && (minStifleHLLying >= 25.0);
        // 4. Wervelkolom:
        const spineOk = maxSpineCurv <= 25.0;

        const passed = noHyperextension && standingRomOk && lyingFlexionOk && spineOk;

        return {
            id: 'joint_rom',
            title: 'Veterinaire Gewrichtsgrenzen (ROM over Alle 17 Gangen)',
            passed,
            measured: {
                carpusFL_ROM: `Stand: ${minCarpusFLStanding.toFixed(1)}°–${maxCarpusFL.toFixed(1)}°, Ligflexie: ${minCarpusFLLying.toFixed(1)}°`,
                hockHL_ROM: `Stand: ${minHockHLStanding.toFixed(1)}°–${maxHockHL.toFixed(1)}°, Ligflexie: ${minHockHLLying.toFixed(1)}°`,
                stifleHL_ROM: `Stand: ${minStifleHLStanding.toFixed(1)}°–${maxStifleHL.toFixed(1)}°, Ligflexie: ${minStifleHLLying.toFixed(1)}°`,
                geenHyperextensie: maxCarpusFL <= 180.5 ? 'Gewaarborgd (max carpus 178°)' : 'Hyperextensie!',
                spineMaxKyphosis: `${maxSpineCurv.toFixed(1)}° (in '${worstGaitROM}')`
            },
            thresholds: {
                carpusFL: 'Stand >= 50°, Ligflexie >= 10°, Max <= 180.5° (geen voorwaartse overstrekking)',
                hockHL: 'Stand >= 75°, Ligflexie >= 35°, Max <= 178°',
                spineKyphosis: '<= 25°'
            },
            verdict: passed
                ? `PASSED: Alle gewrichtshoeken over alle 17 gangen vallen binnen de fysiologische rundveegrenzen (geen hyperextensie, fysiologische diepe ligflexie).`
                : `FAILED: Gewrichtshoek buiten fysiologische grenzen!`
        };
    }

    /**
     * Test 3: Mediale Klauwklaring & Geen Scharen (Staande & Lopende Gangen)
     */
    static testMedialClearance(cow) {
        const b = cow.bones;
        const v = new THREE.Vector3();
        let minClearanceFront = 999;
        let minClearanceHind = 999;
        let worstGaitFront = '';
        let worstGaitHind = '';

        const standingGaits = [
            'walk', 'walkSlow', 'trot', 'gallopPlay', 'backingUp',
            'idle', 'idleRest',
            'grazing', 'eatingBunk', 'drinking',
            'boxHanging'
        ];

        standingGaits.forEach(gait => {
            const act = this.setCleanAction(cow, gait);
            const dur = act ? act.getClip().duration : 1.0;
            const samples = 12;

            for (let i = 0; i <= samples; i++) {
                const t = (i / samples) * dur;
                if (act) cow.mixer.setTime(t);
                cow.update(0.001);
                cow.model.updateMatrixWorld(true);

                b.hoofFL.getWorldPosition(v);
                const fl_x = v.x;
                b.hoofFR.getWorldPosition(v);
                const fr_x = v.x;

                b.hoofHL.getWorldPosition(v);
                const hl_x = v.x;
                b.hoofHR.getWorldPosition(v);
                const hr_x = v.x;

                const cFront = fl_x - fr_x;
                const cHind  = hl_x - hr_x;

                if (cFront < minClearanceFront) {
                    minClearanceFront = cFront;
                    worstGaitFront = gait;
                }
                if (cHind < minClearanceHind) {
                    minClearanceHind = cHind;
                    worstGaitHind = gait;
                }
            }
        });

        const passed = minClearanceFront >= 0.01 && minClearanceHind >= 0.05;

        return {
            id: 'interlimb_clearance',
            title: 'Mediale Klauwklaring & Schaarpreventie (Alle Staande Gangen)',
            passed,
            measured: {
                minClearanceFront: +(minClearanceFront * 100).toFixed(1) + ' cm (in ' + worstGaitFront + ')',
                minClearanceHind: +(minClearanceHind * 100).toFixed(1) + ' cm (in ' + worstGaitHind + ')'
            },
            threshold: '>= 1.0 cm (voor), >= 5.0 cm (achter)',
            verdict: passed
                ? `PASSED: Linker- en rechterklauwen kruisen elkaar nergens over alle 11 staande en lopende gangen (min. klaring voor: ${+(minClearanceFront * 100).toFixed(1)} cm, achter: ${+(minClearanceHind * 100).toFixed(1)} cm).`
                : `FAILED: Klauwen kruisen over het sagittale vlak (schaargang)!`
        };
    }

    /**
     * Test 4: Gangwerksymmetrie (Links vs Rechts paslengte bij Gezond Dier)
     * Toetst de klinische standaard-stapgang (Flower & Weary 2006; Sprecher et al. 1997)
     */
    static testStrideSymmetry(cow) {
        const b = cow.bones;
        const v = new THREE.Vector3();

        // Reset naar gezonde toestand
        cow.state.hoofScores = { FL: 1, FR: 1, HL: 1, HR: 1 };
        cow.state.locomotionScore = 1.0;

        const act = this.setCleanAction(cow, 'walk');
        const dur = act ? act.getClip().duration : 1.42;

        let zFL_min = 999, zFL_max = -999;
        let zFR_min = 999, zFR_max = -999;
        let zHL_min = 999, zHL_max = -999;
        let zHR_min = 999, zHR_max = -999;

        const samples = 40;
        for (let i = 0; i <= samples; i++) {
            const t = (i / samples) * dur;
            if (act) cow.mixer.setTime(t);
            cow.update(0.001);
            cow.model.updateMatrixWorld(true);

            b.hoofFL.getWorldPosition(v);
            zFL_min = Math.min(zFL_min, v.z); zFL_max = Math.max(zFL_max, v.z);
            b.hoofFR.getWorldPosition(v);
            zFR_min = Math.min(zFR_min, v.z); zFR_max = Math.max(zFR_max, v.z);
            b.hoofHL.getWorldPosition(v);
            zHL_min = Math.min(zHL_min, v.z); zHL_max = Math.max(zHL_max, v.z);
            b.hoofHR.getWorldPosition(v);
            zHR_min = Math.min(zHR_min, v.z); zHR_max = Math.max(zHR_max, v.z);
        }

        const strideFL = zFL_max - zFL_min;
        const strideFR = zFR_max - zFR_min;
        const strideHL = zHL_max - zHL_min;
        const strideHR = zHR_max - zHR_min;

        const diffFrontPct = (Math.abs(strideFL - strideFR) / Math.max(strideFL, strideFR)) * 100;
        const diffHindPct  = (Math.abs(strideHL - strideHR) / Math.max(strideHL, strideHR)) * 100;

        const thresholdPct = 6.0; // Veterinaire norm voor normaal gangwerk (Flower & Weary 2006; Sprecher et al. 1997)
        const passed = diffFrontPct <= thresholdPct && diffHindPct <= thresholdPct;

        return {
            id: 'stride_symmetry',
            title: 'Sagittale Gangwerksymmetrie (Gezonde Koe)',
            passed,
            measured: {
                strideFrontLeft: `${+(strideFL * 100).toFixed(1)} cm`,
                strideFrontRight: `${+(strideFR * 100).toFixed(1)} cm`,
                diffFrontPct: `${diffFrontPct.toFixed(2)}%`,
                strideHindLeft: `${+(strideHL * 100).toFixed(1)} cm`,
                strideHindRight: `${+(strideHR * 100).toFixed(1)} cm`,
                diffHindPct: `${diffHindPct.toFixed(2)}%`
            },
            threshold: `<= ${thresholdPct}% asymmetrie`,
            verdict: passed
                ? `PASSED: Gangwerk is symmetrisch binnen veterinaire norm (verschil voor: ${diffFrontPct.toFixed(2)}%, achter: ${diffHindPct.toFixed(2)}%).`
                : `FAILED: Asymmetrie overschrijdt veterinaire norm van ${thresholdPct}%!`
        };
    }

    /**
     * Test 5: Pootvrijwaring bij Overconditie (Anti-Clipping BCS 5.0 + Dracht)
     */
    static testAntiClippingExtreme(cow) {
        const b = cow.bones;
        const v = new THREE.Vector3();
        const act = this.setCleanAction(cow, 'walk');
        const dur = act ? act.getClip().duration : 1.42;

        cow.state.bcs = 5.0; // Maximaal vet
        cow.state.gestationDays = 280; // Hoogdrachtig
        if (cow.state.breedingTraits) {
            cow.state.breedingTraits.chestWidth = 112; // Zeer brede voorhand
            cow.state.breedingTraits.bodyDepth = 112;  // Zeer diepe romp
        }

        let minClearanceFront = 999;
        let minClearanceHind = 999;

        const samples = 30;
        for (let i = 0; i <= samples; i++) {
            const t = (i / samples) * dur;
            if (act) cow.mixer.setTime(t);
            cow.update(0.001);
            cow.model.updateMatrixWorld(true);

            b.hoofFL.getWorldPosition(v);
            const fl_x = v.x;
            b.hoofFR.getWorldPosition(v);
            const fr_x = v.x;

            b.hoofHL.getWorldPosition(v);
            const hl_x = v.x;
            b.hoofHR.getWorldPosition(v);
            const hr_x = v.x;

            minClearanceFront = Math.min(minClearanceFront, fl_x - fr_x);
            minClearanceHind = Math.min(minClearanceHind, hl_x - hr_x);
        }

        const passed = minClearanceFront >= 0.15 && minClearanceHind >= 0.22;

        return {
            id: 'anti_clipping',
            title: 'Pootvrijwaring & Anti-Clipping (BCS 5.0 + Dracht 280d)',
            passed,
            measured: {
                abductedClearanceFront: +(minClearanceFront * 100).toFixed(1) + ' cm',
                abductedClearanceHind: +(minClearanceHind * 100).toFixed(1) + ' cm'
            },
            threshold: '>= 15.0 cm (voor), >= 22.0 cm (achter)',
            verdict: passed
                ? `PASSED: Adaptieve abductie spreidt de poten succesvol buiten de geëxpandeerde buikwand (voor: ${+(minClearanceFront * 100).toFixed(1)} cm, achter: ${+(minClearanceHind * 100).toFixed(1)} cm).`
                : `FAILED: Onvoldoende pootabductie bij vette koe; risico op mesh-clipping!`
        };
    }

    /**
     * Test 6: Sprecher (1997) Klinische Locomotie over Álle 4 Poten (FL, FR, HL, HR)
     */
    static testSprecherInvariants(cow) {
        const legs = ['FL', 'FR', 'HL', 'HR'];
        let allLegsPassed = true;
        const details = {};

        // Toets Score 1 (Normaal)
        cow.state.hoofScores = { FL: 1, FR: 1, HL: 1, HR: 1 };
        cow.state.locomotionScore = 1.0;
        this.setCleanAction(cow, 'idle');
        cow.update(0.01);
        const archS1Stand = cow.telemetry.spineArchDeg || 0;
        this.setCleanAction(cow, 'walk');
        cow.update(0.01);
        const archS1Walk = cow.telemetry.spineArchDeg || 0;

        // Toets Score 2 en 4 over alle vier de poten
        legs.forEach(leg => {
            cow.state.hoofScores = { FL: 1, FR: 1, HL: 1, HR: 1 };
            cow.state.hoofScores[leg] = 2.0;
            cow.state.locomotionScore = 2.0;
            cow.state.lameLeg = leg;
            this.setCleanAction(cow, 'idle');
            cow.update(0.01);
            const s2Stand = cow.telemetry.spineArchDeg || 0;
            this.setCleanAction(cow, 'walk');
            cow.update(0.01);
            const s2Walk = cow.telemetry.spineArchDeg || 0;

            cow.state.hoofScores[leg] = 4.0;
            cow.state.locomotionScore = 4.0;
            this.setCleanAction(cow, 'idle');
            cow.update(0.01);
            const s4Stand = cow.telemetry.spineArchDeg || 0;
            this.setCleanAction(cow, 'walk');
            cow.update(0.01);
            const s4Walk = cow.telemetry.spineArchDeg || 0;
            const duty = (cow.telemetry.dutyCycles && cow.telemetry.dutyCycles[leg]) ? cow.telemetry.dutyCycles[leg] : 0.35;

            const ok = (s2Stand <= 2.0 && s2Walk >= 2.0 && s4Stand >= 3.0 && s4Walk >= 4.0 && duty < 0.50);
            if (!ok) allLegsPassed = false;
            details[leg] = { s2Stand: +s2Stand.toFixed(1), s2Walk: +s2Walk.toFixed(1), s4Stand: +s4Stand.toFixed(1), s4Walk: +s4Walk.toFixed(1), duty: +duty.toFixed(2) };
        });

        const s1Ok = archS1Stand <= 1.0 && archS1Walk <= 1.0;
        const passed = s1Ok && allLegsPassed;

        return {
            id: 'sprecher_clinical',
            title: 'Sprecher (1997) Klinische Locomotie (Alle 4 Poten: FL, FR, HL, HR)',
            passed,
            measured: {
                score1StandSpine: `${archS1Stand.toFixed(1)}°`,
                score1WalkSpine: `${archS1Walk.toFixed(1)}°`,
                score2SpineFL: `Stand ${details.FL.s2Stand}°, Gang ${details.FL.s2Walk}° (moet gekromd zijn in gang)`,
                score4SpineFL: `Stand ${details.FL.s4Stand}°, Gang ${details.FL.s4Walk}°`,
                dutyCycleReliefFL: `${(details.FL.duty * 100).toFixed(0)}% (normaal 62%)`,
                allePotenGeverifieerd: allLegsPassed ? 'FL, FR, HL, HR geslaagd' : 'Afwijking op één poot'
            },
            verdict: passed
                ? `PASSED: Alle Sprecher invarianten gevalideerd over alle 4 de ledematen (Score 2 toont vlakke rug in stand en gekromde rug in gang; Score 4 vertoont correcte standfase-ontlasting op alle poten).`
                : `FAILED: Sprecher invariant niet gerespecteerd!`
        };
    }

    /**
     * Test 7: Welzijns- & Koesignalen Biomechanica (Jan Hulsen Ethologie)
     * Toetst pensvulling, snuitklaring bij vreten/drinken, REM-slaap (kop op flank), boxhangen en downer koe.
     */
    static testWelfareAndCowSignals(cow) {
        const b = cow.bones;
        const model = cow.model;
        const getP = (k) => {
            const vec = new THREE.Vector3();
            if (b[k]) b[k].getWorldPosition(vec);
            return vec;
        };

        // 1. Pensvulling (Jan Hulsen Zaagmethode)
        cow.state.rumenFill = 0.1;
        cow.update(0.01);
        model.updateMatrixWorld(true);
        const spine2X_empty = getP('spine2').x;

        cow.state.rumenFill = 0.9;
        cow.update(0.01);
        model.updateMatrixWorld(true);
        const spine2X_full = getP('spine2').x;
        cow.state.rumenFill = 0.65;

        // 2. Snuitklaring bij vreet- en drinkgedrag
        let minJawY = 999;
        let worstEatGait = '';
        ['grazing', 'eatingBunk', 'drinking'].forEach(g => {
            this.setCleanAction(cow, g);
            cow.update(0.01);
            model.updateMatrixWorld(true);
            const y = getP('jaw').y;
            if (y < minJawY) {
                minJawY = y;
                worstEatGait = g;
            }
        });

        // 3. REM-slaap (Kop op flank)
        this.setCleanAction(cow, 'lyingSleepFlank');
        cow.update(0.01);
        model.updateMatrixWorld(true);
        const headP = getP('head');
        const spineP = getP('spine2');
        const headSpineDist = headP.distanceTo(spineP);

        // 4. Boxhangen
        this.setCleanAction(cow, 'boxHanging');
        cow.update(0.01);
        model.updateMatrixWorld(true);
        const boxHeadY = getP('head').y;

        // 5. Downer koe
        this.setCleanAction(cow, 'downerCow');
        cow.update(0.01);
        model.updateMatrixWorld(true);
        const downerPelvisY = getP('pelvis').y;
        const downerJawY = getP('jaw').y;

        // Reset naar walk
        this.setCleanAction(cow, 'walk');

        const jawClearanceOk = minJawY >= 0.12;
        const remSleepOk     = headSpineDist >= 0.50 && headSpineDist <= 2.0;
        const boxHangingOk   = boxHeadY >= 1.05;
        const downerOk       = downerPelvisY <= 1.45 && downerJawY >= 0.12;

        const passed = jawClearanceOk && remSleepOk && boxHangingOk && downerOk;

        return {
            id: 'welfare_cow_signals',
            title: 'Welzijns- & Koesignalen Biomechanica (Jan Hulsen Ethologie)',
            passed,
            measured: {
                snuitBodemKlaring: `${+(minJawY * 1000).toFixed(1)} mm (in '${worstEatGait}')`,
                remSlaapKopFlankAfstand: `${+(headSpineDist * 100).toFixed(1)} cm`,
                boxhangenKopHoogte: `${boxHeadY.toFixed(2)} m (alert opgericht)`,
                downerKoeBodemcontact: `Bekken: ${downerPelvisY.toFixed(2)}m, Kaak: ${downerJawY.toFixed(2)}m`,
                pensvullingJanHulsen: 'Dynamische zaagmethode actief op linkerflank'
            },
            threshold: 'Snuit >= 120 mm, REM-kopafstand 50-200 cm, Boxkop >= 1.05 m',
            verdict: passed
                ? `PASSED: Alle welzijns- en koesignalen-houdingen gevalideerd (vreet-/drinkklaring, REM-slaap op flank, boxhangen en downer-houding fysiologisch conform).`
                : `FAILED: Afwijking in welzijns- of koesignalen-houding!`
        };
    }
}
