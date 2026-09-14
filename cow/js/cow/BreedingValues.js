/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BREEDINGVALUES.JS — Fokkerij & Fokwaarden (CRV / NVI / Interbull Standaard)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Standaard officiële CRV schaal:
 *  - 100 = Populatiegemiddelde (Holsteins in NL/VL)
 *  - Schaal 88 tot 112 (Standaarddeviatie = 4 punten; 96 = -1 SD, 108 = +2 SD)
 *  - Bovenbalk: Frame, Type, Uier, Beenwerk, Totaal Exterieur (88-112+)
 *  - Onderbalk: 20 officiële CRV lineaire exterieurkenmerken
 */

export const BREEDING_PRESETS = {
    delta_framework_red: {
        id: 'delta_framework_red',
        name: '⭐ Optimaal Exterieur (108)',
        breed: 'Roodbont',
        description: 'Optimaal exterieurprofiel: sterke frames (106), beste benen (107) en gebalanceerde uiers. Totaal Exterieur 108.',
        nvi: 181,
        inet: 331,
        kgMilk: 738,
        pctFat: 0.19,
        pctProtein: 0.17,
        fatKg: 50,
        proteinKg: 42,
        bovenbalk: {
            frame: 106,
            type: 104,
            udder: 104,
            feetLegs: 107,
            totalConformation: 108
        },
        traits: {
            // Frame & Inhoud
            stature: 104,
            chestWidth: 105,
            bodyDepth: 106,
            angularity: 105,
            conditionScore: 102,
            rumpAngle: 101,
            rumpWidth: 101,
            // Benen & Klauwen
            rearLegRear: 107,
            rearLegSide: 103,
            clawAngle: 102,
            frontLegStance: 102,
            locomotion: 106,
            // Uier & Spenen
            foreUdder: 105,
            frontTeatPlacement: 105,
            teatLength: 103,
            udderDepth: 105,
            rearUdderHeight: 102,
            rearTeatPlacement: 102,
            udderBalance: 101,
            suspensoryLigament: 101,
            // Gezondheid
            clawHealth: 106,
            udderHealth: 104,
            calvingEase: 107,
            robotIndex: 107
        }
    },
    balanced_nvi: {
        id: 'balanced_nvi',
        name: '⚖️ Gebalanceerde NVI Topper (+335)',
        breed: 'Zwartbont',
        description: 'All-round genetisch topniveau: gezonde uiers, solide beenwerk en uitzonderlijke levensduur.',
        nvi: 335,
        inet: 285,
        kgMilk: 1150,
        pctFat: 0.12,
        pctProtein: 0.08,
        fatKg: 62,
        proteinKg: 48,
        bovenbalk: {
            frame: 103,
            type: 102,
            udder: 106,
            feetLegs: 106,
            totalConformation: 106
        },
        traits: {
            stature: 102,
            chestWidth: 103,
            bodyDepth: 103,
            angularity: 102,
            conditionScore: 102,
            rumpAngle: 100,
            rumpWidth: 102,
            rearLegRear: 105,
            rearLegSide: 100,
            clawAngle: 103,
            frontLegStance: 102,
            locomotion: 105,
            foreUdder: 104,
            frontTeatPlacement: 102,
            teatLength: 100,
            udderDepth: 105,
            rearUdderHeight: 105,
            rearTeatPlacement: 101,
            udderBalance: 100,
            suspensoryLigament: 104,
            clawHealth: 106,
            udderHealth: 105,
            calvingEase: 104,
            robotIndex: 105
        }
    },
    show_conformation: {
        id: 'show_conformation',
        name: '🏆 Keuring & Exterieur (112)',
        breed: 'Zwartbont',
        description: 'Exterieurtopper: hoog ondiep uier (112), krachtige centrale ophangband (109) en harmonieus frame.',
        nvi: 275,
        inet: 210,
        kgMilk: 850,
        pctFat: 0.05,
        pctProtein: 0.04,
        fatKg: 42,
        proteinKg: 34,
        bovenbalk: {
            frame: 110,
            type: 112,
            udder: 112,
            feetLegs: 109,
            totalConformation: 112
        },
        traits: {
            stature: 108,
            chestWidth: 106,
            bodyDepth: 107,
            angularity: 110,
            conditionScore: 98,
            rumpAngle: 102,
            rumpWidth: 107,
            rearLegRear: 108,
            rearLegSide: 99,
            clawAngle: 106,
            frontLegStance: 104,
            locomotion: 108,
            foreUdder: 110,
            frontTeatPlacement: 106,
            teatLength: 102,
            udderDepth: 108,
            rearUdderHeight: 109,
            rearTeatPlacement: 105,
            udderBalance: 100,
            suspensoryLigament: 109,
            clawHealth: 103,
            udderHealth: 104,
            calvingEase: 102,
            robotIndex: 104
        }
    },
    pasture_health: {
        id: 'pasture_health',
        name: '🌿 Robuuste Weidekoe',
        breed: 'Blaarkop / FH',
        description: 'Profiel gefokt op weidegang, sterke klauw- en uiergezondheid, natuurlijke robuustheid en conditiebehoud.',
        nvi: 320,
        inet: 240,
        kgMilk: 780,
        pctFat: 0.22,
        pctProtein: 0.14,
        fatKg: 54,
        proteinKg: 40,
        bovenbalk: {
            frame: 100,
            type: 101,
            udder: 104,
            feetLegs: 108,
            totalConformation: 105
        },
        traits: {
            stature: 98,
            chestWidth: 105,
            bodyDepth: 104,
            angularity: 100,
            conditionScore: 106,
            rumpAngle: 101,
            rumpWidth: 102,
            rearLegRear: 107,
            rearLegSide: 100,
            clawAngle: 105,
            frontLegStance: 103,
            locomotion: 107,
            foreUdder: 104,
            frontTeatPlacement: 102,
            teatLength: 101,
            udderDepth: 104,
            rearUdderHeight: 103,
            rearTeatPlacement: 101,
            udderBalance: 100,
            suspensoryLigament: 103,
            clawHealth: 109,
            udderHealth: 108,
            calvingEase: 108,
            robotIndex: 103
        }
    },
    standard_neutral: {
        id: 'standard_neutral',
        name: '⚪ Standaard Populatie (100)',
        breed: 'Zwartbont',
        description: 'Gemiddelde Nederlandse melkveepopulatie (basis = 100 voor alle lineaire kenmerken).',
        nvi: 150,
        inet: 180,
        kgMilk: 500,
        pctFat: 0.00,
        pctProtein: 0.00,
        fatKg: 25,
        proteinKg: 20,
        bovenbalk: {
            frame: 100,
            type: 100,
            udder: 100,
            feetLegs: 100,
            totalConformation: 100
        },
        traits: {
            stature: 100,
            chestWidth: 100,
            bodyDepth: 100,
            angularity: 100,
            conditionScore: 100,
            rumpAngle: 100,
            rumpWidth: 100,
            rearLegRear: 100,
            rearLegSide: 100,
            clawAngle: 100,
            frontLegStance: 100,
            locomotion: 100,
            foreUdder: 100,
            frontTeatPlacement: 100,
            teatLength: 100,
            udderDepth: 100,
            rearUdderHeight: 100,
            rearTeatPlacement: 100,
            udderBalance: 100,
            suspensoryLigament: 100,
            clawHealth: 100,
            udderHealth: 100,
            calvingEase: 100,
            robotIndex: 100
        }
    },
    high_components: {
        id: 'high_components',
        name: '🧀 Hoge Gehalten',
        breed: 'Jersey / FH',
        description: 'Hoge gehalten aan vet en eiwit (+0,45% V, +0,28% E) met verhoogde kaasopbrengst.',
        nvi: 310,
        inet: 310,
        kgMilk: 280,
        pctFat: 0.45,
        pctProtein: 0.28,
        fatKg: 52,
        proteinKg: 38,
        longevity: 420,
        robotIndex: 108,
        bovenbalk: {
            frame: 98,
            type: 104,
            udder: 108,
            feetLegs: 104,
            totalConformation: 105
        },
        traits: {
            stature: 96,
            chestWidth: 102,
            bodyDepth: 103,
            angularity: 106,
            conditionScore: 104,
            rumpAngle: 100,
            rumpWidth: 100,
            rearLegRear: 104,
            rearLegSide: 101,
            clawAngle: 104,
            frontLegStance: 102,
            locomotion: 104,
            foreUdder: 108,
            frontTeatPlacement: 104,
            teatLength: 100,
            udderDepth: 107,
            rearUdderHeight: 108,
            rearTeatPlacement: 103,
            udderBalance: 100,
            suspensoryLigament: 106,
            clawHealth: 104,
            udderHealth: 107,
            calvingEase: 106,
            robotIndex: 108
        }
    },
    pasture_robust: null // will reference pasture_health below
};
BREEDING_PRESETS.pasture_robust = BREEDING_PRESETS.pasture_health;

export class BreedingManager {
    constructor() {
        this.currentPreset = 'delta_framework_red';
        this.traits = { ...BREEDING_PRESETS.delta_framework_red.traits };
        this.bovenbalk = { ...BREEDING_PRESETS.delta_framework_red.bovenbalk };
        this.production = {
            kgMilk: 738,
            pctFat: 0.19,
            pctProtein: 0.17,
            fatKg: 50,
            proteinKg: 42,
            nvi: 181,
            inet: 331,
            longevity: 212,
            feedEfficiency: 101,
            robotIndex: 107,
            milkingSpeed: 99,
            ketosis: 103,
            somaticCell: 104,
            udderHealth: 104,
            clawHealth: 106,
            fertility: 99,
            calvingEase: 107,
            temperament: 100,
            methaneReduction: 99
        };
    }

    setPreset(presetId) {
        if (BREEDING_PRESETS[presetId]) {
            const p = BREEDING_PRESETS[presetId];
            this.currentPreset = presetId;
            this.traits = { ...p.traits };
            this.bovenbalk = { ...p.bovenbalk };
            this.production = {
                kgMilk: p.kgMilk !== undefined ? p.kgMilk : 700,
                pctFat: p.pctFat !== undefined ? p.pctFat : 0.10,
                pctProtein: p.pctProtein !== undefined ? p.pctProtein : 0.05,
                fatKg: p.fatKg !== undefined ? p.fatKg : 45,
                proteinKg: p.proteinKg !== undefined ? p.proteinKg : 35,
                nvi: p.nvi !== undefined ? p.nvi : 180,
                inet: p.inet !== undefined ? p.inet : 300,
                longevity: p.longevity || 212,
                feedEfficiency: p.feedEfficiency || 101,
                robotIndex: p.robotIndex || 107,
                milkingSpeed: p.milkingSpeed || 99,
                ketosis: p.ketosis || 103,
                somaticCell: p.somaticCell || 104,
                udderHealth: p.traits.udderHealth || 104,
                clawHealth: p.traits.clawHealth || 106,
                fertility: p.fertility || 99,
                calvingEase: p.traits.calvingEase || 107,
                temperament: p.temperament || 100,
                methaneReduction: p.methaneReduction || 99
            };
        }
    }

    setTrait(traitKey, val) {
        if (this.traits[traitKey] !== undefined) {
            this.traits[traitKey] = Number(val);
            this.currentPreset = 'custom';
            this._recalculateBovenbalk();
        }
    }

    setProduction(prodKey, val) {
        if (this.production[prodKey] !== undefined) {
            this.production[prodKey] = Number(val);
            this.currentPreset = 'custom';
            // Herbereken vet/eiwit kg en economische indexen dynamisch
            if (prodKey === 'kgMilk' || prodKey === 'pctFat' || prodKey === 'pctProtein') {
                const milk = this.production.kgMilk;
                const fatPct = this.production.pctFat;
                const protPct = this.production.pctProtein;
                this.production.fatKg = Math.round(milk * 0.043 + fatPct * 85);
                this.production.proteinKg = Math.round(milk * 0.035 + protPct * 85);
                this.production.inet = Math.round(this.production.fatKg * 3.4 + this.production.proteinKg * 5.9);
                this.production.nvi = Math.round(this.production.inet * 0.45 + (this.bovenbalk.totalConformation - 100) * 7);
            }
        }
    }

    _recalculateBovenbalk() {
        const t = this.traits;
        const frame = Math.round((t.stature * 0.35 + t.chestWidth * 0.25 + t.bodyDepth * 0.25 + t.rumpWidth * 0.15));
        const type = Math.round((t.angularity * 0.5 + t.conditionScore * 0.25 + t.rumpAngle * 0.25));
        const udder = Math.round((t.foreUdder * 0.25 + t.rearUdderHeight * 0.20 + t.suspensoryLigament * 0.20 + t.udderDepth * 0.25 + t.frontTeatPlacement * 0.10));
        const feetLegs = Math.round((t.rearLegRear * 0.35 + t.locomotion * 0.35 + t.clawAngle * 0.15 + t.rearLegSide * 0.15));
        const total = Math.round(frame * 0.20 + type * 0.15 + udder * 0.35 + feetLegs * 0.30);
        this.bovenbalk = {
            frame,
            type,
            udder,
            feetLegs,
            totalConformation: total
        };
    }

    getTraits() {
        return this.traits;
    }

    getProduction() {
        return this.production;
    }

    getBovenbalk() {
        return this.bovenbalk;
    }

    getSummary() {
        const p = BREEDING_PRESETS[this.currentPreset];
        return {
            presetId: this.currentPreset,
            name: p ? p.name : '🛠️ Zelf Ingesteld',
            breed: p ? p.breed : 'Holstein',
            nvi: this.production.nvi,
            inet: this.production.inet,
            production: this.production,
            bovenbalk: this.bovenbalk,
            traits: this.traits
        };
    }
}
