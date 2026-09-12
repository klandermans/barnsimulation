/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BREEDINGVALUES.JS — Fokkerij & Fokwaarden (CRV / NVI / Interbull Standaard)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Standaard Nederlandse fokwaardenschaal:
 *  - 100 = Populatiegemiddelde (Holsteins in NL/VL)
 *  - Standaardafwijking = 4 punten (96 = -1 SD / benedengemiddeld, 108 = +2 SD / excellent)
 */

export const BREEDING_PRESETS = {
    balanced_nvi: {
        id: 'balanced_nvi',
        name: '⚖️ Gebalanceerde NVI Topper (+335 NVI)',
        description: 'All-round genetische topstier: gezonde uiers, solide benen en hoge levensduur.',
        nvi: 335,
        inet: 285,
        traits: {
            udderDepth: 105,
            cleft: 104,
            teatPlacement: 102,
            teatLength: 100,
            rearLegSide: 100,
            clawAngle: 103,
            stature: 102,
            chestWidth: 103,
            bodyCondition: 102,
            clawHealth: 106,
            udderHealth: 105,
            kgMilk: 1150,
            pctFat: 0.12,
            pctProtein: 0.08,
        }
    },
    show_conformation: {
        id: 'show_conformation',
        name: '🏆 Keurings- & Exterieurkampioen',
        description: 'Genetica gericht op nationale keuringen: hoog ondiep uier, diepe ophangband en statig frame.',
        nvi: 275,
        inet: 210,
        traits: {
            udderDepth: 108,
            cleft: 109,
            teatPlacement: 106,
            teatLength: 102,
            rearLegSide: 99,
            clawAngle: 106,
            stature: 108,
            chestWidth: 106,
            bodyCondition: 98,
            clawHealth: 103,
            udderHealth: 104,
            kgMilk: 850,
            pctFat: 0.05,
            pctProtein: 0.04,
        }
    },
    high_production: {
        id: 'high_production',
        name: '🥛 Extreme Productie / Melkstier (+1600 kg Melk)',
        description: 'Enorme melkaanleg en capaciteit. Scherpe melktypische conformatie met ruim uier.',
        nvi: 290,
        inet: 410,
        traits: {
            udderDepth: 97, // dieper uier door enorme melkcapaciteit
            cleft: 102,
            teatPlacement: 98,
            teatLength: 98,
            rearLegSide: 104, // iets sabelbenig
            clawAngle: 98,
            stature: 104,
            chestWidth: 101,
            bodyCondition: 95, // scherpe melkkoe (minder vetbedekking)
            clawHealth: 100,
            udderHealth: 101,
            kgMilk: 1650,
            pctFat: -0.08,
            pctProtein: -0.04,
        }
    },
    pasture_health: {
        id: 'pasture_health',
        name: '🌿 Robuuste Weidekoe & Klauwgezondheid',
        description: 'Genetica gefokt op weidegang, klauw- en uiergezondheid, natuurlijke robuustheid en conditiebehoud.',
        nvi: 320,
        inet: 240,
        traits: {
            udderDepth: 104,
            cleft: 103,
            teatPlacement: 101,
            teatLength: 101,
            rearLegSide: 100,
            clawAngle: 105,
            stature: 98, // compacter frame
            chestWidth: 105,
            bodyCondition: 106, // gemakkelijk conditie vasthouden
            clawHealth: 109, // uitzonderlijke klauwweerstand (geen Mortellaro)
            udderHealth: 108, // laag somatisch celgetal
            kgMilk: 780,
            pctFat: 0.22,
            pctProtein: 0.14,
        }
    }
};

export class BreedingManager {
    constructor() {
        this.currentPreset = 'balanced_nvi';
        this.traits = { ...BREEDING_PRESETS.balanced_nvi.traits };
    }

    setPreset(presetId) {
        if (BREEDING_PRESETS[presetId]) {
            this.currentPreset = presetId;
            this.traits = { ...BREEDING_PRESETS[presetId].traits };
        }
    }

    setTrait(traitKey, val) {
        if (this.traits[traitKey] !== undefined) {
            this.traits[traitKey] = Number(val);
            this.currentPreset = 'custom';
        }
    }

    getTraits() {
        return this.traits;
    }

    getSummary() {
        const p = BREEDING_PRESETS[this.currentPreset];
        return {
            name: p ? p.name : '🛠️ Aangepaste Fokkerij (Custom)',
            nvi: p ? p.nvi : Math.round(200 + (this.traits.udderHealth + this.traits.clawHealth + this.traits.udderDepth - 300) * 8),
            traits: this.traits
        };
    }
}
