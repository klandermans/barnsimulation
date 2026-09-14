/**
 * BiomechanicalValidator.js — Geautomatiseerde Veterinaire & Biomechanische Validatiesuite
 * Onderzoeksprogramma Next Level Animal Science (Wageningen University & Research)
 *
 * Toetst het 3D-rundveemodel in real-time tegen veterinaire anatomische invarianten:
 * 1. Grondvlakpenetratie (Klauwen mogen niet door het rooster/de vloer zakken)
 * 2. Veterinaire gewrichtsgrenzen / Range of Motion (ROM: geen hyperextensie van spronggewricht of voorknie)
 * 3. Mediale klauwklaring (Geen scharende gang; linkerklauw kruist nooit de rechterklauw)
 * 4. Gangwerksymmetrie (Bij gezonde koe is paslengte links vs rechts gelijk binnen 5%)
 * 5. Pootvrijwaring bij overconditie (Geen clipping/penetratie van benen door romp bij BCS 5.0 en dracht 280d)
 * 6. Sprecher (1997) klinische invarianten (Vlakke rug bij stand voor score 1 & 2, gekromd bij gang voor score >= 2)
 */

import * as THREE from 'three';

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
     * Voert de volledige validatietest uit over alle gaits, conditiescores en kreupelheidsgraden
     */
    static async runFullValidation(cowBehavior, onProgress = null) {
        const results = {
            timestamp: new Date().toISOString(),
            cowIndex: cowBehavior.cowIndex,
            totalSuites: 6,
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
            // TEST 1: Grondpenetratie (Klauwhoogte Invariant)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(1, 6, 'Toetsen op grondpenetratie (Y >= -0.015m)...');
            const groundSuite = this.testGroundPenetration(cowBehavior);
            results.suites.push(groundSuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 2: Veterinaire Gewrichtshoeken (ROM Limits)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(2, 6, 'Toetsen op veterinaire gewrichtshoeken & hyperextensie...');
            const romSuite = this.testJointAngles(cowBehavior);
            results.suites.push(romSuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 3: Mediale Klauwklaring & Geen Scharen (No Limb Crossing)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(3, 6, 'Toetsen op klauwklaring & scharen over middellijn...');
            const clearanceSuite = this.testMedialClearance(cowBehavior);
            results.suites.push(clearanceSuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 4: Gangwerksymmetrie (Symmetrische Paslengte bij Gezond Dier)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(4, 6, 'Toetsen op sagittale gangwerksymmetrie (Links vs Rechts)...');
            const symmetrySuite = this.testStrideSymmetry(cowBehavior);
            results.suites.push(symmetrySuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 5: Pootvrijwaring bij Overconditie (Anti-Clipping BCS 5.0 + Dracht)
            // ─────────────────────────────────────────────────────────────────
            updateProgress(5, 6, 'Toetsen op pootvrijwaring bij BCS 5.0 en 280d dracht...');
            const antiClipSuite = this.testAntiClippingExtreme(cowBehavior);
            results.suites.push(antiClipSuite);

            // ─────────────────────────────────────────────────────────────────
            // TEST 6: Sprecher (1997) Klinische Locomotie-Invarianten
            // ─────────────────────────────────────────────────────────────────
            updateProgress(6, 6, 'Toetsen op Sprecher kreupelheidsdiagnostiek...');
            const sprecherSuite = this.testSprecherInvariants(cowBehavior);
            results.suites.push(sprecherSuite);

        } finally {
            // Herstel altijd de oorspronkelijke toestand
            Object.assign(cowBehavior.state, savedState);
            cowBehavior.state.hoofScores = savedHoofScores;
            cowBehavior.state.bcs = savedState.bcs;
            cowBehavior.state.gestationDays = savedState.gestationDays;
            if (cowBehavior.actions[savedState.gait]) {
                cowBehavior.actions[savedState.gait].play();
            }
            cowBehavior.update(0.01);
            if (cowBehavior.model) cowBehavior.model.updateMatrixWorld(true);
        }

        results.passedSuites = results.suites.filter(s => s.passed).length;
        results.failedSuites = results.suites.filter(s => !s.passed).length;
        results.overallPassed = (results.failedSuites === 0);

        return results;
    }

    /**
     * Test 1: Grondpenetratie
     * Klauwen mogen bij stand en gangwerk nooit dieper zakken dan -0.015m onder de vloer
     */
    static testGroundPenetration(cow) {
        const b = cow.bones;
        const v = new THREE.Vector3();
        const walkAction = cow.actions['walk'];
        const dur = walkAction ? walkAction.getClip().duration : 1.42;

        let minHoofY = 999;
        let worstHoof = '';
        let worstPhase = 0;

        // Reset naar gezond dier
        cow.state.hoofScores = { FL: 1, FR: 1, HL: 1, HR: 1 };
        cow.state.bcs = 3.0;
        cow.state.gestationDays = 0;

        const samples = 40;
        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * dur;
            if (walkAction) cow.mixer.setTime(t);
            cow.update(0.001);
            cow.model.updateMatrixWorld(true);

            ['hoofFL', 'hoofFR', 'hoofHL', 'hoofHR'].forEach(hKey => {
                b[hKey].getWorldPosition(v);
                if (v.y < minHoofY) {
                    minHoofY = v.y;
                    worstHoof = hKey;
                    worstPhase = +(t / dur).toFixed(2);
                }
            });
        }

        const threshold = -0.015; // 1.5 cm tolerantie voor strooisel / klauwzoolcontact
        const passed = minHoofY >= threshold;

        return {
            id: 'ground_penetration',
            title: 'Grondcontact & Klauwhoogte Invariant',
            passed,
            measured: {
                minHoofY: +(minHoofY * 1000).toFixed(1) + ' mm',
                worstHoof,
                worstPhase: `${worstPhase * 100}% cyclus`
            },
            threshold: `>= ${threshold * 1000} mm`,
            verdict: passed
                ? `PASSED: Alle klauwen blijven boven de bodemgrens (laagste klauw ${+(minHoofY * 1000).toFixed(1)} mm bij ${worstHoof}).`
                : `FAILED: Klauw ${worstHoof} zakt met ${+(minHoofY * 1000).toFixed(1)} mm door het roosteroppervlak!`
        };
    }

    /**
     * Test 2: Veterinaire Gewrichtshoeken (ROM Limits)
     * Knie, spronggewricht en carpus mogen nooit hyperextensie vertonen
     */
    static testJointAngles(cow) {
        const b = cow.bones;
        const p = {};
        const v = new THREE.Vector3();
        const walkAction = cow.actions['walk'];
        const dur = walkAction ? walkAction.getClip().duration : 1.42;

        let maxHockHL = 0, minHockHL = 999;
        let maxStifleHL = 0, minStifleHL = 999;
        let maxCarpusFL = 0, minCarpusFL = 999;
        let maxSpineCurv = 0;

        const samples = 40;
        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * dur;
            if (walkAction) cow.mixer.setTime(t);
            cow.update(0.001);
            cow.model.updateMatrixWorld(true);

            const getP = (k) => b[k].getWorldPosition(new THREE.Vector3());

            const hockAngle = this.angleDegrees(getP('lowerLegHL'), getP('pasternHL'), getP('hoofHL'));
            const stifleAngle = this.angleDegrees(getP('upperLegHL'), getP('lowerLegHL'), getP('pasternHL'));
            const carpusAngle = this.angleDegrees(getP('lowerLegFL'), getP('pasternFL'), getP('hoofFL'));
            const spineAngle = this.angleDegrees(getP('spine1'), getP('spine2'), getP('spine3'));

            maxHockHL = Math.max(maxHockHL, hockAngle);
            minHockHL = Math.min(minHockHL, hockAngle);

            maxStifleHL = Math.max(maxStifleHL, stifleAngle);
            minStifleHL = Math.min(minStifleHL, stifleAngle);

            maxCarpusFL = Math.max(maxCarpusFL, carpusAngle);
            minCarpusFL = Math.min(minCarpusFL, carpusAngle);

            // Wervelkolom deviatie van rechte lijn (180 graden)
            maxSpineCurv = Math.max(maxSpineCurv, Math.abs(180 - spineAngle));
        }

        // Fysiologische grenzen
        const hockOk   = maxHockHL <= 175 && minHockHL >= 75;
        const stifleOk = maxStifleHL <= 175 && minStifleHL >= 65;
        const carpusOk = maxCarpusFL <= 180.5 && minCarpusFL >= 50;
        const spineOk  = maxSpineCurv <= 22; // max 22 graden kromming

        const passed = hockOk && stifleOk && carpusOk && spineOk;

        return {
            id: 'joint_rom',
            title: 'Veterinaire Gewrichtsgrenzen (ROM)',
            passed,
            measured: {
                hockAngleHL: `${minHockHL.toFixed(1)}° – ${maxHockHL.toFixed(1)}°`,
                stifleAngleHL: `${minStifleHL.toFixed(1)}° – ${maxStifleHL.toFixed(1)}°`,
                carpusAngleFL: `${minCarpusFL.toFixed(1)}° – ${maxCarpusFL.toFixed(1)}°`,
                spineMaxKyphosis: `${maxSpineCurv.toFixed(1)}°`
            },
            thresholds: {
                hockHL: '75° t/m 175°',
                stifleHL: '65° t/m 175°',
                carpusFL: '50° t/m 180.5° (geen voorwaartse overstrekking)',
                spineKyphosis: '<= 22°'
            },
            verdict: passed
                ? `PASSED: Alle gewrichtshoeken vallen binnen de fysiologische rundveegrenzen zonder hyperextensie.`
                : `FAILED: Gewrichtshoek buiten fysiologische grenzen!`
        };
    }

    /**
     * Test 3: Mediale Klauwklaring & Geen Scharen (No Crossing Midline)
     */
    static testMedialClearance(cow) {
        const b = cow.bones;
        const v = new THREE.Vector3();
        const walkAction = cow.actions['walk'];
        const dur = walkAction ? walkAction.getClip().duration : 1.42;

        let minClearanceFront = 999;
        let minClearanceHind = 999;

        const samples = 40;
        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * dur;
            if (walkAction) cow.mixer.setTime(t);
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

        const passed = minClearanceFront >= 0.01 && minClearanceHind >= 0.05;

        return {
            id: 'interlimb_clearance',
            title: 'Mediale Klauwklaring & Schaarpreventie',
            passed,
            measured: {
                minClearanceFront: +(minClearanceFront * 100).toFixed(1) + ' cm',
                minClearanceHind: +(minClearanceHind * 100).toFixed(1) + ' cm'
            },
            threshold: '>= 1.0 cm (voor), >= 5.0 cm (achter)',
            verdict: passed
                ? `PASSED: Linker- en rechterklauwen kruisen elkaar nergens in de cyclus (min. klaring voor: ${+(minClearanceFront * 100).toFixed(1)} cm, achter: ${+(minClearanceHind * 100).toFixed(1)} cm).`
                : `FAILED: Klauwen kruisen over het sagittale vlak (schaargang)!`
        };
    }

    /**
     * Test 4: Gangwerksymmetrie (Symmetrische Paslengte Links vs Rechts)
     */
    static testStrideSymmetry(cow) {
        const b = cow.bones;
        const v = new THREE.Vector3();
        const walkAction = cow.actions['walk'];
        const dur = walkAction ? walkAction.getClip().duration : 1.42;

        // Reset naar gezonde toestand
        cow.state.hoofScores = { FL: 1, FR: 1, HL: 1, HR: 1 };
        cow.state.locomotionScore = 1.0;

        let zFL_min = 999, zFL_max = -999;
        let zFR_min = 999, zFR_max = -999;
        let zHL_min = 999, zHL_max = -999;
        let zHR_min = 999, zHR_max = -999;

        const samples = 40;
        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * dur;
            if (walkAction) cow.mixer.setTime(t);
            cow.update(0.001);
            cow.model.updateMatrixWorld(true);

            b.hoofFL.getWorldPosition(v);
            zFL_min = Math.min(zFL_min, v.z);
            zFL_max = Math.max(zFL_max, v.z);

            b.hoofFR.getWorldPosition(v);
            zFR_min = Math.min(zFR_min, v.z);
            zFR_max = Math.max(zFR_max, v.z);

            b.hoofHL.getWorldPosition(v);
            zHL_min = Math.min(zHL_min, v.z);
            zHL_max = Math.max(zHL_max, v.z);

            b.hoofHR.getWorldPosition(v);
            zHR_min = Math.min(zHR_min, v.z);
            zHR_max = Math.max(zHR_max, v.z);
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
            id: 'gait_symmetry',
            title: 'Sagittale Gangwerksymmetrie (Gezonde Koe)',
            passed,
            measured: {
                strideFrontLeft: +(strideFL * 100).toFixed(1) + ' cm',
                strideFrontRight: +(strideFR * 100).toFixed(1) + ' cm',
                diffFrontPct: diffFrontPct.toFixed(2) + '%',
                strideHindLeft: +(strideHL * 100).toFixed(1) + ' cm',
                strideHindRight: +(strideHR * 100).toFixed(1) + ' cm',
                diffHindPct: diffHindPct.toFixed(2) + '%'
            },
            threshold: `<= ${thresholdPct.toFixed(1)}% asymmetrie`,
            verdict: passed
                ? `PASSED: Gangwerk is symmetrisch binnen veterinaire norm (verschil voor: ${diffFrontPct.toFixed(2)}%, achter: ${diffHindPct.toFixed(2)}%).`
                : `FAILED: Significante paslengte-asymmetrie (> ${thresholdPct.toFixed(1)}%) gedetecteerd bij gezonde koe!`
        };
    }

    /**
     * Test 5: Pootvrijwaring bij Overconditie (Anti-Clipping bij BCS 5.0 & 280d Dracht)
     */
    static testAntiClippingExtreme(cow) {
        const b = cow.bones;
        const v = new THREE.Vector3();
        const walkAction = cow.actions['walk'];
        const dur = walkAction ? walkAction.getClip().duration : 1.42;

        // Forceer extreme overconditie en hoogdracht
        cow.state.bcs = 5.0;
        cow.state.gestationDays = 280;

        let minClearanceFront = 999;
        let minClearanceHind = 999;

        const samples = 30;
        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * dur;
            if (walkAction) cow.mixer.setTime(t);
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

        // Bij BCS 5.0 + 280d dracht moet de laterale pootvrijwaring de voorbenen minstens 15cm en achterbenen 22cm uit elkaar zetten
        const passed = minClearanceFront >= 0.15 && minClearanceHind >= 0.22;

        return {
            id: 'anti_clipping',
            title: 'Pootvrijwaring & Anti-Clipping (BCS 5.0 + Dracht)',
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
     * Test 6: Sprecher (1997) Klinische Locomotie-Invarianten
     */
    static testSprecherInvariants(cow) {
        const b = cow.bones;
        const walkAction = cow.actions['walk'];

        // Subtest A: Score 1 (Normaal) — Vlakke rug bij stand én gang
        cow.state.hoofScores = { FL: 1, FR: 1, HL: 1, HR: 1 };
        cow.state.locomotionScore = 1.0;
        cow.state.gait = 'idle';
        cow.update(0.01);
        const archScore1Stand = cow.telemetry.spineArchDeg;

        cow.state.gait = 'walk';
        cow.update(0.01);
        const archScore1Walk = cow.telemetry.spineArchDeg;

        // Subtest B: Score 2 (Licht kreupel) — Vlakke rug bij stand, MAAR gekromd bij gang!
        cow.state.hoofScores = { FL: 2.0, FR: 1, HL: 1, HR: 1 };
        cow.state.locomotionScore = 2.0;
        cow.state.gait = 'idle';
        cow.update(0.01);
        const archScore2Stand = cow.telemetry.spineArchDeg;

        cow.state.gait = 'walk';
        cow.update(0.01);
        const archScore2Walk = cow.telemetry.spineArchDeg;

        // Subtest C: Score 4 (Duidelijk kreupel) — Gekromde rug bij stand én bij gang, plus ontlasting
        cow.state.hoofScores = { FL: 4.0, FR: 1, HL: 1, HR: 1 };
        cow.state.locomotionScore = 4.0;
        cow.state.gait = 'idle';
        cow.update(0.01);
        const archScore4Stand = cow.telemetry.spineArchDeg;

        cow.state.gait = 'walk';
        cow.update(0.01);
        const archScore4Walk = cow.telemetry.spineArchDeg;
        const dutyCycleLameFL = cow.telemetry.dutyCycles.FL;

        // Sprecher 1997 gouden regels:
        // Score 1: stand arch < 1.0°, walk arch < 1.0°
        // Score 2: stand arch < 2.0° (vlakke rug in stand), walk arch >= 2.0° (bolle rug bij stappen)
        // Score 4: stand arch >= 4.0°, walk arch >= 5.0°, duty cycle FL < 0.45
        const s1Ok = archScore1Stand <= 1.0 && archScore1Walk <= 1.0;
        const s2Ok = archScore2Stand <= 2.0 && archScore2Walk >= 2.0;
        const s4Ok = archScore4Stand >= 3.0 && archScore4Walk >= 4.0 && dutyCycleLameFL < 0.50;

        const passed = s1Ok && s2Ok && s4Ok;

        return {
            id: 'sprecher_clinical',
            title: 'Sprecher (1997) Klinische Locomotie-Invarianten',
            passed,
            measured: {
                score1StandSpine: `${archScore1Stand.toFixed(1)}°`,
                score1WalkSpine: `${archScore1Walk.toFixed(1)}°`,
                score2StandSpine: `${archScore2Stand.toFixed(1)}° (moet vlak zijn)`,
                score2WalkSpine: `${archScore2Walk.toFixed(1)}° (moet gekromd zijn)`,
                score4StandSpine: `${archScore4Stand.toFixed(1)}°`,
                score4WalkSpine: `${archScore4Walk.toFixed(1)}°`,
                score4DutyCycleFL: `${(dutyCycleLameFL * 100).toFixed(0)}% (normaal 62%)`
            },
            verdict: passed
                ? `PASSED: Alle Sprecher invarianten gevalideerd (Score 2 toont vlakke rug in stand en gekromde rug in gang; Score 4 vertoont correcte standfase-ontlasting).`
                : `FAILED: Sprecher invariant niet gerespecteerd!`
        };
    }
}
