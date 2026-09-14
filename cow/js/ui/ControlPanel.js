/**
 * ControlPanel.js — HTML-overlay bedieningspaneel
 * Koppelt alle UI-elementen, biologische parameters, 4-hoeven multilaterale kreupelheid
 * en research telemetrie / paper benchmarking aan CowBehavior.
 */

export class ControlPanel {
    constructor(containerId, cowBehavior, sceneController) {
        this.container = document.getElementById(containerId);
        this.behavior = cowBehavior;
        this.state = cowBehavior.state;
        this.scene = sceneController;
        this._attachEvents();
        this._syncHoofSlidersUI();
        this._updateLocoScoreLabel();
        this._syncBreedingUI();
        this._syncProductionUI();
        this._syncCowPassportUI();
    }

    _attachEvents() {
        // ── Panel toggle ─────────────────────────────────────────────────────
        const toggleBtn = document.getElementById('panel-toggle');
        const panel = document.getElementById('control-panel');
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('collapsed');
                toggleBtn.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
            });
        }

        // ── Tab Navigatie (Exterieur, Gangwerk, Welzijn, Kudde) ───────────────
        document.querySelectorAll('.tab-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                document.querySelectorAll('.tab-nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const targetPane = document.getElementById(tabId);
                if (targetPane) targetPane.classList.add('active');
            });
        });

        // ── 0. Weergavemodus: 1 Dier (Solo) vs Kudde (4 Koeien) ─────────────
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setDisplayMode(mode);
            });
        });

        // ── 0b. Kudde & Koe Selectie (4 Koeien) ─────────────────────────────
        document.querySelectorAll('.cow-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cowId = btn.dataset.cow;
                document.querySelectorAll('.cow-select-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.cow === cowId);
                });
                const behavior = this.scene.selectCow(cowId);
                if (behavior) {
                    this.behavior = behavior;
                    this.state = behavior.state;
                    this._syncUIWithCurrentState();
                }
            });
        });

        // Sociale Interacties & Kudde-Ethologie
        document.querySelectorAll('.interaction-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Schakel automatisch terug naar kudde-modus indien we in solo waren
                if (this.scene.displayMode === 'solo') {
                    this.setDisplayMode('herd');
                }
                document.querySelectorAll('.interaction-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.scene.setHerdInteraction(btn.dataset.interaction);
                this._syncUIWithCurrentState();
            });
        });

        // ── Gait buttons ─────────────────────────────────────────────────────
        document.querySelectorAll('.gait-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetGait = btn.dataset.gait;
                if (targetGait === 'downerCow' && this.behavior.state.gait === 'downerCow') {
                    // Toggle off: koe staat op
                    this.behavior.setGait('standUp');
                    document.querySelectorAll('.gait-btn').forEach(b => b.classList.remove('active'));
                    const idleBtn = document.querySelector('.gait-btn[data-gait="idle"]');
                    if (idleBtn) idleBtn.classList.add('active');
                    this._updateLocoScoreLabel();
                    return;
                }
                document.querySelectorAll('.gait-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.behavior.setGait(targetGait);
                this._updateLocoScoreLabel();
            });
        });

        // ── Walk speed ───────────────────────────────────────────────────────
        this._bindSlider('walkSpeed', v => {
            this.state.walkSpeed = v;
            const el = document.getElementById('walkSpeedVal');
            if (el) el.textContent = v.toFixed(2) + ' m/s';
            this.behavior.onLamenessChanged();
        });

        // ── 2. Kreupelheid per Hoef (Alle 4 Hoeven Multilateraal) ──────────────
        // Presets
        document.querySelectorAll('.hoof-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.hoof-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.behavior.setLamenessPreset(btn.dataset.preset);
                this._syncHoofSlidersUI();
                this._updateLocoScoreLabel();
            });
        });

        // Individuele 4-hoeven schuifregelaars
        document.querySelectorAll('.hoof-slider').forEach(slider => {
            slider.addEventListener('input', e => {
                const leg = slider.dataset.leg;
                const val = parseFloat(e.target.value);
                const valSpan = document.getElementById(`scoreVal${leg}`);
                if (valSpan) valSpan.textContent = val.toFixed(1);

                // Verwijder active class van preset buttons bij handmatige instelling
                document.querySelectorAll('.hoof-preset-btn').forEach(b => b.classList.remove('active'));

                this.behavior.setHoofScore(leg, val);
                this._updateLocoScoreLabel();
            });
        });

        // ── Anatomische Kinetica Toggles (research.md) & Hondenzit ───────────
        const bindChk = (id, prop) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', e => { this.state[prop] = e.target.checked; });
        };
        bindChk('chkSynsarcosis', 'enableSynsarcosis');
        bindChk('chkReciprocal',  'enableReciprocal');
        bindChk('chkFetlock',     'enableFetlockSpring');
        bindChk('chkEyelids',     'enableEyelidBlink');
        bindChk('chkDogSitting',        'dogSitting');
        bindChk('chkDogSittingWelzijn', 'dogSitting');

        // ── 9. Zoötechniek, Dracht, Conditie & Koesignalen ───────────────────
        this._bindSlider('bcsScore', v => {
            this.state.bcs = v;
            if (this.behavior) this.behavior._lastConformationKey = null;
            this._updateBcsLabel(v);
            this._syncCowPassportUI();
        });

        this._bindSlider('gestationDays', v => {
            this.state.gestationDays = Math.round(v);
            if (this.behavior) this.behavior._lastConformationKey = null;
            this._updateGestationLabel(Math.round(v));
            this._syncCowPassportUI();
        });

        this._bindSlider('parityScore', v => {
            this.state.parity = Math.round(v);
            if (this.behavior) this.behavior._lastConformationKey = null;
            this._updateParityLabel(Math.round(v));
            this._syncCowPassportUI();
            if (this.behavior) this.behavior.onLamenessChanged();
        });

        this._bindSlider('rumenScoreSlider', v => {
            this.state.rumenScore = v;
            this.state.rumenFill = Math.max(0, Math.min(1, (v - 1.0) / 4.0));
            if (this.behavior) this.behavior._lastConformationKey = null;
            this._updateRumenScoreLabel(v);
        });

        this._bindSlider('dungScoreSlider', v => {
            this.state.dungScore = Math.round(v);
            this._updateDungScoreLabel(Math.round(v));
        });

        this._bindSlider('hockLesionScore', v => {
            this.state.hockScore = Math.round(v);
            this._updateHockLesionLabel(Math.round(v));
        });

        this._bindSlider('teatConditionScore', v => {
            this.state.teatScore = Math.round(v);
            this._updateTeatConditionLabel(Math.round(v));
        });

        this._bindSlider('udderFill', v => {
            this.state.udderFill = v;
            const el = document.getElementById('udderFillVal');
            if (el) el.textContent = Math.round(v * 100) + '%';
        });

        document.querySelectorAll('.zt-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.zt-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const p = btn.dataset.zt;
                if (p === 'fresh_heifer') {
                    this.state.parity = 1;
                    this.state.gestationDays = 0;
                    this.state.bcs = 3.25;
                    this.state.rumenScore = 2.5;
                    this.state.dungScore = 2;
                } else if (p === 'peak_lactation') {
                    this.state.parity = 3;
                    this.state.gestationDays = 60;
                    this.state.bcs = 2.25;
                    this.state.rumenScore = 3.0;
                    this.state.dungScore = 3;
                } else if (p === 'mid_lactation') {
                    this.state.parity = 2;
                    this.state.gestationDays = 150;
                    this.state.bcs = 2.75;
                    this.state.rumenScore = 3.5;
                    this.state.dungScore = 3;
                } else if (p === 'late_gestation') {
                    this.state.parity = 4;
                    this.state.gestationDays = 275;
                    this.state.bcs = 3.50;
                    this.state.rumenScore = 4.0;
                    this.state.dungScore = 4;
                }
                this.state.rumenFill = Math.max(0, Math.min(1, ((this.state.rumenScore || 3.0) - 1.0) / 4.0));
                if (this.behavior) this.behavior._lastConformationKey = null;
                this._syncZootechnicalUI();
                this._syncCowPassportUI();
            });
        });

        // ── Hoornstatus Knoppen & Sliders ────────────────────────────────────
        document.querySelectorAll('.horn-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.horn-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const hornType = btn.dataset.horn;
                let scale = 0.0;
                if (hornType === 'horned') scale = 1.0;
                else if (hornType === 'scurs') scale = 0.35;
                else scale = 0.0;

                if (this.scene && this.scene.setHorns) {
                    this.scene.setHorns(scale);
                } else if (this.behavior && this.behavior.setHorns) {
                    this.behavior.setHorns(scale);
                }
                this._syncHornUI();
                this._syncCowPassportUI();
            });
        });

        this._bindSlider('hornLengthSlider', v => {
            if (this.scene && this.scene.setHorns) {
                this.scene.setHorns(v);
            } else if (this.behavior && this.behavior.setHorns) {
                this.behavior.setHorns(v);
            }
            this._syncHornUI();
            this._syncCowPassportUI();
        });

        // ── Ademhaling & Fysiologie Sliders ──────────────────────────────────

        this._bindSlider('breathRate', v => {
            this.state.breathingRate = Math.round(v);
            const el = document.getElementById('breathRateVal');
            if (el) el.textContent = Math.round(v) + ' bpm';
        });

        this._bindSlider('ruminateRate', v => {
            this.state.ruminateRate = Math.round(v);
            const el = document.getElementById('ruminateRateVal');
            if (el) el.textContent = Math.round(v) + ' bpm';
        });

        this._bindSlider('pantingScore', v => {
            const score = Math.round(v);
            this.state.pantingScore = score;
            this.state.heatStress = (score > 0);
            const el = document.getElementById('pantingScoreVal');
            if (el) el.textContent = 'Score ' + score;
            // Update heatStress micro-button active class
            document.querySelectorAll('.micro-btn[data-state="heatStress"]').forEach(b => {
                b.classList.toggle('active', score > 0);
            });
        });

        // ── Micro-gedrag toggle buttons ──────────────────────────────────────
        document.querySelectorAll('.micro-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.state;
                this.state[key] = !this.state[key];
                btn.classList.toggle('active', !!this.state[key]);

                // Sync panting score if heatStress toggled
                if (key === 'heatStress') {
                    this.state.pantingScore = this.state.heatStress ? 3 : 0;
                    const el = document.getElementById('pantingScoreVal');
                    const slider = document.getElementById('pantingScore');
                    if (el) el.textContent = 'Score ' + this.state.pantingScore;
                    if (slider) slider.value = this.state.pantingScore;
                }
            });
        });

        // ── Staartgezwaai intensiteit ─────────────────────────────────────────
        this._bindSlider('tailSwish', v => {
            this.state.tailSwishIntensity = v;
            const el = document.getElementById('tailSwishVal');
            if (el) el.textContent = Math.round(v * 100) + '%';
        });

        // ── Fokkerij & Fokwaarden Presets (CRV / NVI) ────────────────────────
        document.querySelectorAll('.bv-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.bv-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const p = btn.dataset.bv;
                if (this.behavior && this.behavior.breedingManager) {
                    this.behavior.breedingManager.setPreset(p);
                    this._syncBreedingUI();
                    this._syncCowPassportUI();
                }
            });
        });

        // ── CRV Lineaire Exterieurkenmerken Sliders (88 - 112) ──────────────
        const crvSliders = [
            // Frame & Inhoud
            { id: 'bvStature',            trait: 'stature' },
            { id: 'bvChestWidth',         trait: 'chestWidth' },
            { id: 'bvBodyDepth',          trait: 'bodyDepth' },
            { id: 'bvAngularity',         trait: 'angularity' },
            { id: 'bvRumpAngle',          trait: 'rumpAngle' },
            { id: 'bvRumpWidth',          trait: 'rumpWidth' },
            // Benen & Klauwen
            { id: 'bvRearLegRear',        trait: 'rearLegRear' },
            { id: 'bvRearLegSide',        trait: 'rearLegSide' },
            { id: 'bvClawAngle',          trait: 'clawAngle' },
            { id: 'bvFrontLegStance',     trait: 'frontLegStance' },
            { id: 'bvLocomotion',         trait: 'locomotion' },
            { id: 'bvClawHealth',         trait: 'clawHealth' },
            // Uier & Spenen
            { id: 'bvUdderDepth',         trait: 'udderDepth' },
            { id: 'bvForeUdder',          trait: 'foreUdder' },
            { id: 'bvCleft',              trait: 'suspensoryLigament' },
            { id: 'bvFrontTeatPlacement', trait: 'frontTeatPlacement' },
            { id: 'bvRearTeatPlacement',  trait: 'rearTeatPlacement' },
            { id: 'bvTeatLength',         trait: 'teatLength' },
            { id: 'bvRearUdderHeight',    trait: 'rearUdderHeight' },
        ];

        crvSliders.forEach(s => {
            this._bindSlider(s.id, v => {
                if (this.behavior && this.behavior.breedingManager) {
                    this.behavior.breedingManager.setTrait(s.trait, v);
                    const el = document.getElementById(s.id + 'Val');
                    if (el) el.textContent = v;
                    if (this.behavior) this.behavior._lastConformationKey = null;
                    this._updateBreedingSummary();
                    this._syncCowPassportUI();
                }
            });
        });

        // ── Productie & Fokwaarde Presets ────────────────────────────────────
        document.querySelectorAll('.prod-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.prod-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const p = btn.dataset.prodpreset;
                if (this.behavior && this.behavior.breedingManager) {
                    this.behavior.breedingManager.setPreset(p);
                    if (this.behavior) this.behavior._lastConformationKey = null;
                    this._syncBreedingUI();
                    this._syncProductionUI();
                    this._syncCowPassportUI();
                }
            });
        });

        // ── Productie & Gehalten Sliders ──────────────────────────────────────
        const prodSliders = [
            { id: 'prodKgMilk',         key: 'kgMilk',           format: v => (v >= 0 ? '+' : '') + v + ' kg' },
            { id: 'prodPctFat',         key: 'pctFat',           format: v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%' },
            { id: 'prodPctProtein',     key: 'pctProtein',       format: v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%' },
            { id: 'prodLongevity',      key: 'longevity',        format: v => (v >= 0 ? '+' : '') + v + ' d' },
            { id: 'prodFeedEfficiency', key: 'feedEfficiency',   format: v => v },
            { id: 'prodRobotIndex',     key: 'robotIndex',       format: v => v },
            { id: 'prodMilkingSpeed',   key: 'milkingSpeed',     format: v => v },
            { id: 'prodSomaticCell',    key: 'somaticCell',      format: v => v },
            { id: 'prodClawHealth',     key: 'clawHealth',       format: v => v },
            { id: 'prodKetosis',        key: 'ketosis',          format: v => v },
            { id: 'prodFertility',      key: 'fertility',        format: v => v },
            { id: 'prodCalvingEase',    key: 'calvingEase',      format: v => v },
            { id: 'prodTemperament',    key: 'temperament',      format: v => v },
            { id: 'prodMethane',        key: 'methaneReduction', format: v => v },
        ];

        prodSliders.forEach(s => {
            this._bindSlider(s.id, v => {
                if (this.behavior && this.behavior.breedingManager) {
                    this.behavior.breedingManager.setProduction(s.key, v);
                    const el = document.getElementById(s.id + 'Val') || document.getElementById(s.id + 'SliderVal');
                    if (el) el.textContent = s.format(v);
                    this._updateProductionSummary();
                    this._syncCowPassportUI();
                }
            });
        });

        // ── Vacht, Rassen & Procedurale Generator ───────────────────────────
        document.querySelectorAll('.tex-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tex-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.scene.applyTexture) this.scene.applyTexture(btn.dataset.tex);
            });
        });

        // 🎲 Willekeurige Huid Genereren (Proceduraal via Canvas)
        document.getElementById('btnGenRandomSkin')?.addEventListener('click', () => {
            const density = parseFloat(document.getElementById('skinDensity')?.value || 0.5);
            const spotSize = parseFloat(document.getElementById('skinSpotSize')?.value || 1.0);
            const activeTex = document.querySelector('.tex-btn.active')?.dataset.tex || 'holstein';
            const pat = ['blackwhite', 'holstein'].includes(activeTex) ? 'holstein' :
                        ['redwhite', 'roodbont'].includes(activeTex) ? 'roodbont' : activeTex;
            if (this.scene.generateProceduralSkin) {
                this.scene.generateProceduralSkin({
                    pattern: pat,
                    density: density,
                    spotSize: spotSize,
                    seed: Math.floor(Math.random() * 999999)
                });
            }
        });

        // 🐄 Kudde Volledig Randomizen (Unieke vachten, morfologie & conditie)
        document.getElementById('btnRandomizeHerd')?.addEventListener('click', () => {
            if (this.scene.randomizeEntireHerd) {
                this.scene.randomizeEntireHerd();
                this._syncUIWithCurrentState();
            }
        });

        // 🌈 Domain Randomization (Snelle kleurtinting uit 'real')
        document.querySelectorAll('.tint-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.scene.applyDomainRandomization) {
                    this.scene.applyDomainRandomization(btn.dataset.tint);
                }
            });
        });

        // Sliders voor procedurale vlekgrootte en dekking
        document.getElementById('skinDensity')?.addEventListener('input', e => {
            const val = Math.round(parseFloat(e.target.value) * 100);
            const el = document.getElementById('skinDensityVal');
            if (el) el.textContent = val + '%';
        });
        document.getElementById('skinSpotSize')?.addEventListener('input', e => {
            const val = parseFloat(e.target.value).toFixed(1);
            const el = document.getElementById('skinSpotSizeVal');
            if (el) el.textContent = val + 'x';
        });

        // 💎 PBR Reliëf Toggle (Normals, AO & Glans)
        document.getElementById('chkPbrEnabled')?.addEventListener('change', e => {
            if (this.scene.togglePBR) {
                this.scene.togglePBR(e.target.checked);
            }
        });

        // ⚖️ Lichaamsmorfologie & Conformatie Randomizen
        document.getElementById('btnRandomMorphology')?.addEventListener('click', () => {
            if (this.scene.randomizeConformation) {
                this.scene.randomizeConformation();
                this._syncUIWithCurrentState();
            }
        });

        // ↶ Echte 90° Draaistappen (Links / Rechts)
        document.getElementById('btnTurnL90')?.addEventListener('click', () => {
            if (this.scene.turnSelectedCow) this.scene.turnSelectedCow('left');
        });
        document.getElementById('btnTurnR90')?.addEventListener('click', () => {
            if (this.scene.turnSelectedCow) this.scene.turnSelectedCow('right');
        });

        // ── Display checkboxes ───────────────────────────────────────────────
        document.getElementById('showSkeleton')?.addEventListener('change', e => {
            this.scene.toggleSkeleton(e.target.checked);
        });
        document.getElementById('showGrid')?.addEventListener('change', e => {
            this.scene.toggleGrid(e.target.checked);
        });
        document.getElementById('showIKTargets')?.addEventListener('change', e => {
            this.scene.toggleIKTargets(e.target.checked);
        });
        document.getElementById('wireframe')?.addEventListener('change', e => {
            this.scene.setWireframe(e.target.checked);
        });

        // ── Omgeving Buttons (Weiland vs Studio) ─────────────────────────────
        document.querySelectorAll('.env-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.scene.setEnvironment(btn.dataset.env);
            });
        });

        // ── Camera buttons ───────────────────────────────────────────────────
        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.scene.setCameraMode(btn.dataset.cam);
            });
        });

        // ── Research Drawer Toggle ───────────────────────────────────────────
        const resToggle = document.getElementById('research-toggle');
        const resContent = document.getElementById('research-content');
        const resArrow = document.getElementById('research-arrow');
        if (resToggle && resContent) {
            resToggle.addEventListener('click', () => {
                resContent.classList.toggle('collapsed');
                if (resArrow) resArrow.textContent = resContent.classList.contains('collapsed') ? '▶' : '▼';
            });
        }
    }

    /**
     * Schakelt tussen Solo (1 dier) en Kudde (4 koeien) in de UI en in de scène
     */
    setDisplayMode(mode, triggerScene = true) {
        document.querySelectorAll('.view-mode-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === mode);
        });

        const btnCowAll = document.getElementById('btnCowAll');
        const socialGroup = document.getElementById('socialInteractionsGroup');
        const soloHint = document.getElementById('soloModeHint');
        const cowLabel = document.getElementById('cowSelectorLabel');

        if (mode === 'solo') {
            if (btnCowAll) btnCowAll.style.display = 'none';
            if (socialGroup) socialGroup.classList.add('dimmed-in-solo');
            if (soloHint) soloHint.style.display = 'block';
            if (cowLabel) cowLabel.textContent = 'Kies zichtbaar dier (1 actief):';

            // Als 'all' geselecteerd was, val terug naar dier 0
            if (this.scene.herd && this.scene.herd.selectedCowIndex === 'all') {
                const firstBtn = document.querySelector('.cow-select-btn[data-cow="0"]');
                if (firstBtn) {
                    document.querySelectorAll('.cow-select-btn').forEach(b => b.classList.remove('active'));
                    firstBtn.classList.add('active');
                }
            }
        } else {
            if (btnCowAll) btnCowAll.style.display = '';
            if (socialGroup) socialGroup.classList.remove('dimmed-in-solo');
            if (soloHint) soloHint.style.display = 'none';
            if (cowLabel) cowLabel.textContent = 'Selecteer koe voor bediening:';
        }

        if (triggerScene) {
            this.scene.setDisplayMode(mode);
            this.behavior = this.scene.behavior;
            if (this.behavior) {
                this.state = this.behavior.state;
                this._syncUIWithCurrentState();
            }
        }
    }

    _bindSlider(id, callback) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', e => callback(parseFloat(e.target.value)));
    }

    _syncUIWithCurrentState() {
        if (!this.state) return;

        // 1. Gait buttons
        document.querySelectorAll('.gait-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.gait === this.state.gait);
        });

        // 2. Walk speed
        const speedSlider = document.getElementById('walkSpeed');
        const speedVal = document.getElementById('walkSpeedVal');
        if (speedSlider) speedSlider.value = this.state.walkSpeed || 1.0;
        if (speedVal) speedVal.textContent = (this.state.walkSpeed || 1.0).toFixed(2) + ' m/s';

        // 3. 4-Hoof Sliders & Presets
        this._syncHoofSlidersUI();

        // 4. Lichaamsconditie & Fysiologie
        const bindSync = (sliderId, valId, val, suffix = '') => {
            const s = document.getElementById(sliderId);
            const v = document.getElementById(valId);
            if (s) s.value = val;
            if (v) v.textContent = val + suffix;
        };
        bindSync('breathRate', 'breathRateVal', Math.round(this.state.breathingRate || 26), ' bpm');
        bindSync('ruminateRate', 'ruminateRateVal', Math.round(this.state.ruminateRate || 60), ' bpm');
        bindSync('pantingScore', 'pantingScoreVal', 'Score ' + (this.state.pantingScore || 0));

        // 5. Micro buttons
        document.querySelectorAll('.micro-btn').forEach(btn => {
            const key = btn.dataset.state;
            btn.classList.toggle('active', !!this.state[key]);
        });

        // 6. Zoötechniek & Lichaamsconditie
        this._syncZootechnicalUI();

        // 6b. Hoornstatus & Hoornlengte
        this._syncHornUI();

        // 7. Fokkerij & Fokwaarden (CRV / NVI)
        this._syncBreedingUI();

        // 7b. Productie, Gehalten & Indexen
        this._syncProductionUI();

        // 8. Hondenzit
        const chkDog = document.getElementById('chkDogSitting');
        if (chkDog) chkDog.checked = !!this.state.dogSitting;

        // 9. Paspoort Badge (Kies je Koe)
        this._syncCowPassportUI();

        this._updateLocoScoreLabel();
    }

    _syncHornUI() {
        if (!this.state) return;
        const scale = this.state.hornScale !== undefined ? this.state.hornScale : (this.state.hasHorns ? 1.0 : 0.0);

        // Knoppen actief zetten
        document.querySelectorAll('.horn-btn').forEach(btn => {
            const t = btn.dataset.horn;
            let match = false;
            if (t === 'polled' && scale < 0.15) match = true;
            else if (t === 'scurs' && scale >= 0.15 && scale < 0.65) match = true;
            else if (t === 'horned' && scale >= 0.65) match = true;
            btn.classList.toggle('active', match);
        });

        // Slider en tekst
        const slider = document.getElementById('hornLengthSlider');
        const valEl = document.getElementById('hornLengthVal');
        if (slider) slider.value = scale;
        if (valEl) valEl.textContent = Math.round(scale * 100) + '%';

        // Diagnostische status badge
        const badge = document.getElementById('hornStatusBadge');
        if (badge) {
            if (scale < 0.05) {
                badge.textContent = '✨ Onthoorn (Hoornloos)';
                badge.style.color = '#38bdf8';
            } else if (scale < 0.65) {
                badge.textContent = '🔹 Hoornstompjes (Scurs)';
                badge.style.color = '#fbbf24';
            } else {
                badge.textContent = '🐂 Volledig Gehoornd';
                badge.style.color = '#4ade80';
            }
        }
    }

    _syncCowPassportUI() {
        const herd = this.scene.herd;
        if (!herd) return;
        const cow = herd.getSelectedCow ? herd.getSelectedCow() : herd.cows[0];
        if (!cow) return;

        const pName = document.getElementById('passportName');
        const pParity = document.getElementById('passportParity');
        const pGestation = document.getElementById('passportGestation');
        const pBcs = document.getElementById('passportBcs');
        const pBreeding = document.getElementById('passportBreeding');
        const pHorns = document.getElementById('passportHorns');

        if (pName) {
            pName.textContent = `🐄 ${cow.name} — ${cow.breed}`;
        }
        if (pParity) {
            const par = (this.state && this.state.parity !== undefined) ? this.state.parity : (cow.behavior.state.parity ?? 2);
            pParity.textContent = par === 0 ? 'Vaars (0e)' : `${par}e kalfs`;
        }
        if (pGestation) {
            const gest = (this.state && this.state.gestationDays !== undefined) ? this.state.gestationDays : (cow.behavior.state.gestationDays ?? 0);
            pGestation.textContent = `${gest} d`;
        }
        if (pBcs) {
            const bcs = (this.state && this.state.bcs !== undefined) ? this.state.bcs : (cow.behavior.state.bcs ?? 3.0);
            pBcs.textContent = `BCS ${bcs.toFixed(2)}`;
        }
        if (pBreeding) {
            const bm = (this.behavior && this.behavior.breedingManager) ? this.behavior.breedingManager : cow.behavior.breedingManager;
            if (bm) {
                const bb = bm.getBovenbalk ? bm.getBovenbalk() : null;
                const tot = bb ? bb.totalConformation : 108;
                pBreeding.textContent = `Totaal ${tot}`;
            }
        }
        if (pHorns) {
            const hs = (this.state && this.state.hornScale !== undefined) ? this.state.hornScale : (cow.behavior.state.hornScale ?? (cow.behavior.state.hasHorns ? 1.0 : 0.0));
            if (hs < 0.05) {
                pHorns.textContent = '✨ Onthoorn';
                pHorns.style.color = '#38bdf8';
            } else if (hs < 0.65) {
                pHorns.textContent = '🔹 Stompjes';
                pHorns.style.color = '#fbbf24';
            } else {
                pHorns.textContent = '🐂 Gehoornd';
                pHorns.style.color = '#4ade80';
            }
        }
    }

    _syncBreedingUI() {
        if (!this.behavior || !this.behavior.breedingManager) return;
        const bm = this.behavior.breedingManager;
        const traits = bm.getTraits();
        const preset = bm.currentPreset;

        // Preset knoppen actief zetten
        document.querySelectorAll('.bv-preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bv === preset);
        });

        // Sliders updaten
        const updateSlider = (id, val) => {
            const s = document.getElementById(id);
            const v = document.getElementById(id + 'Val');
            if (s && val !== undefined) s.value = val;
            if (v && val !== undefined) v.textContent = val;
        };

        // Frame & Inhoud
        updateSlider('bvStature', traits.stature);
        updateSlider('bvChestWidth', traits.chestWidth);
        updateSlider('bvBodyDepth', traits.bodyDepth);
        updateSlider('bvAngularity', traits.angularity);
        updateSlider('bvRumpAngle', traits.rumpAngle);
        updateSlider('bvRumpWidth', traits.rumpWidth);

        // Benen & Klauwen
        updateSlider('bvRearLegRear', traits.rearLegRear);
        updateSlider('bvRearLegSide', traits.rearLegSide);
        updateSlider('bvClawAngle', traits.clawAngle);
        updateSlider('bvFrontLegStance', traits.frontLegStance);
        updateSlider('bvLocomotion', traits.locomotion);
        updateSlider('bvClawHealth', traits.clawHealth);

        // Uier & Spenen
        updateSlider('bvUdderDepth', traits.udderDepth);
        updateSlider('bvForeUdder', traits.foreUdder);
        updateSlider('bvCleft', traits.suspensoryLigament);
        updateSlider('bvFrontTeatPlacement', traits.frontTeatPlacement);
        updateSlider('bvRearTeatPlacement', traits.rearTeatPlacement);
        updateSlider('bvTeatLength', traits.teatLength);
        updateSlider('bvRearUdderHeight', traits.rearUdderHeight);

        this._updateBreedingSummary();
    }

    _updateBreedingSummary() {
        if (!this.behavior || !this.behavior.breedingManager) return;
        const bm = this.behavior.breedingManager;
        const bb = bm.getBovenbalk ? bm.getBovenbalk() : null;

        // CRV Bovenbalk badges
        if (bb) {
            const bFrame = document.getElementById('crvBvFrame');
            const bType  = document.getElementById('crvBvType');
            const bUdder = document.getElementById('crvBvUdder');
            const bFeet  = document.getElementById('crvBvFeetLegs');
            const bTotal = document.getElementById('crvBvTotal');

            if (bFrame) bFrame.textContent = bb.frame;
            if (bType)  bType.textContent = bb.type;
            if (bUdder) bUdder.textContent = bb.udder;
            if (bFeet)  bFeet.textContent = bb.feetLegs;
            if (bTotal) bTotal.textContent = bb.totalConformation;
        }
    }

    _syncProductionUI() {
        if (!this.behavior || !this.behavior.breedingManager) return;
        const bm = this.behavior.breedingManager;
        const prod = bm.getProduction ? bm.getProduction() : null;
        if (!prod) return;

        // Activeer juiste preset knop
        document.querySelectorAll('.prod-preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.prodpreset === bm.currentPreset);
        });

        const updateSlider = (id, val, textVal) => {
            const s = document.getElementById(id);
            const v = document.getElementById(id + 'Val') || document.getElementById(id + 'SliderVal');
            if (s && val !== undefined) s.value = val;
            if (v && val !== undefined) v.textContent = (textVal !== undefined) ? textVal : val;
        };

        updateSlider('prodKgMilk', prod.kgMilk, (prod.kgMilk >= 0 ? '+' : '') + prod.kgMilk + ' kg');
        updateSlider('prodPctFat', prod.pctFat, (prod.pctFat >= 0 ? '+' : '') + prod.pctFat.toFixed(2) + '%');
        updateSlider('prodPctProtein', prod.pctProtein, (prod.pctProtein >= 0 ? '+' : '') + prod.pctProtein.toFixed(2) + '%');
        updateSlider('prodLongevity', prod.longevity, (prod.longevity >= 0 ? '+' : '') + prod.longevity + ' d');
        updateSlider('prodFeedEfficiency', prod.feedEfficiency);
        updateSlider('prodRobotIndex', prod.robotIndex);
        updateSlider('prodMilkingSpeed', prod.milkingSpeed);
        updateSlider('prodSomaticCell', prod.somaticCell);
        updateSlider('prodClawHealth', prod.clawHealth);
        updateSlider('prodKetosis', prod.ketosis);
        updateSlider('prodFertility', prod.fertility);
        updateSlider('prodCalvingEase', prod.calvingEase);
        updateSlider('prodTemperament', prod.temperament);
        updateSlider('prodMethane', prod.methaneReduction);

        this._updateProductionSummary();
    }

    _updateProductionSummary() {
        if (!this.behavior || !this.behavior.breedingManager) return;
        const bm = this.behavior.breedingManager;
        const prod = bm.getProduction ? bm.getProduction() : null;
        if (!prod) return;

        const nviEl = document.getElementById('prodNviVal');
        if (nviEl) nviEl.textContent = (prod.nvi >= 0 ? '+' : '') + prod.nvi;
        const inetEl = document.getElementById('prodInetVal');
        if (inetEl) inetEl.textContent = '€' + prod.inet;
        const longevEl = document.getElementById('prodLongevityVal');
        if (longevEl) longevEl.textContent = (prod.longevity >= 0 ? '+' : '') + prod.longevity + ' d';

        const fatBadge = document.getElementById('prodFatKgBadge');
        if (fatBadge) fatBadge.textContent = (prod.fatKg >= 0 ? '+' : '') + prod.fatKg + ' kg V';
        const protBadge = document.getElementById('prodProteinKgBadge');
        if (protBadge) protBadge.textContent = (prod.proteinKg >= 0 ? '+' : '') + prod.proteinKg + ' kg E';

        // Update ook bvSummaryCard in Tab 1
        const bvNvi = document.getElementById('bvNviVal');
        if (bvNvi) bvNvi.textContent = (prod.nvi >= 0 ? '+' : '') + prod.nvi;
        const bvInet = document.getElementById('bvInetVal');
        if (bvInet) bvInet.textContent = '€' + prod.inet;
    }

    _updateBcsLabel(bcs) {
        const el = document.getElementById('bcsScoreVal');
        const card = document.getElementById('bcsDiagCard');
        if (!el) return;

        let cat = 'Optimaal';
        let diag = '';
        let color = '#38bdf8';

        if (bcs <= 1.5) {
            cat = 'Ernstig Mager / Cachectisch';
            diag = '<strong>🦴 Zaagrug & Diepe V-hoek:</strong> Scherpe processus spinosi steken dakvormig uit. Heup- en zitbeenderen zijn vlijmscherp. Diepe uitholling rond staartbasis en holle hongergroeve.';
            color = '#ef4444';
        } else if (bcs <= 2.25) {
            cat = 'Schraal (Pieklactatie / NEB)';
            diag = '<strong>📉 Scherpe V-hoek & Ribtekening:</strong> Uitgesproken V-lijn tussen hooks en pins. Korte lendenribben vormen een richel met groeven. Ribbenkast duidelijk afgetekend.';
            color = '#f97316';
        } else if (bcs <= 2.75) {
            cat = 'Licht Schraal';
            diag = '<strong>📐 Overgang V naar U-hoek:</strong> Heupknobbels nog hoekig, lichte weefselbedekking over de ribben, matig ingevallen fossa paralumbalis.';
            color = '#eab308';
        } else if (bcs <= 3.25) {
            cat = 'Optimaal (Gezonde Melkkoe)';
            diag = '<strong>⚖️ Ronde U-hoek & Balans:</strong> Zachte U-lijn tussen hooks en pins, heupknobbels afgerond, rugkam vlak-glad, lendenen en flanken evenwichtig gevuld.';
            color = '#22c55e';
        } else if (bcs <= 4.0) {
            cat = 'Rond / Ruim (Droogstand)';
            diag = '<strong>🌾 Brede U-vorm & Vetbedekking:</strong> Hooks en pins diep ingebed in subcutaan vet. Hongergroeve vlak tot licht bol. Ribben niet meer individueel zichtbaar.';
            color = '#06b6d4';
        } else {
            cat = 'Vetzucht / Obese (Ketose-risico)';
            diag = '<strong>⚠️ Komvormig Bekken & Vetbulten:</strong> Uitpuilende vetkussens (fat patches) naast de staartbasis, ruggeul over de wervelkolom, zware vette boegkwab (dewlap).';
            color = '#ec4899';
        }

        el.textContent = `${bcs.toFixed(2)} (${cat})`;
        if (card) {
            card.innerHTML = diag;
            card.style.borderLeftColor = color;
        }
    }

    _updateGestationLabel(days) {
        const el = document.getElementById('gestationDaysVal');
        const card = document.getElementById('gestationDiagCard');
        if (!el) return;
        let phase = 'Niet drachtig';
        let diag = '<strong>🍼 Drachtstatus:</strong> Niet drachtig (cyclisch / tochtigheidswaardig).';
        let color = '#10b981';

        if (days === 0) {
            phase = 'Niet drachtig';
            diag = '<strong>🍼 Niet drachtig:</strong> Normale oestruscyclus van ~21 dagen. Actieve follikelgroei.';
            color = '#10b981';
        } else if (days < 90) {
            phase = 'Trimester 1';
            diag = '<strong>🌱 Trimester 1 (0-90d):</strong> Nidation en embryonale organogenese in de baarmoeder. Nog geen uitwendige buikexpansie.';
            color = '#38bdf8';
        } else if (days < 190) {
            phase = 'Trimester 2';
            diag = '<strong>📈 Trimester 2 (90-190d):</strong> Foetale groei en vruchwateraccumulatie. Lichte ventrale buikdoorhang zichtbaar.';
            color = '#60a5fa';
        } else if (days < 265) {
            phase = 'Hoogdrachtig';
            diag = '<strong>🐮 Trimester 3 / Hoogdrachtig (&gt;190d):</strong> Snelle gewichtstoename van het kalf (30-45 kg). Duidelijke asymmetrische uitzetting van de rechterflank!';
            color = '#f59e0b';
        } else {
            phase = 'A terme / Kalfklaar';
            diag = '<strong>🚨 A terme / Afkalven nabij (&gt;265d):</strong> Volgroeid kalf (45-55 kg). Relaxine zorgt voor het verslappen van de brede bekkenbanden en verweking van de geboorteweg.';
            color = '#ef4444';
        }
        el.textContent = `${days} d (${phase})`;
        if (card) {
            card.innerHTML = diag;
            card.style.borderLeftColor = color;
        }
    }

    _updateParityLabel(parity) {
        const el = document.getElementById('parityScoreVal');
        if (!el) return;
        let desc = '2e kalfs';
        if (parity === 0) desc = 'Vaars / Pink (0e)';
        else if (parity === 1) desc = '1e kalfs (Melkvaars)';
        else if (parity === 2) desc = '2e kalfs';
        else if (parity === 3) desc = '3e kalfs (Volwassen)';
        else desc = `${parity}e kalfs (Meerkalfs)`;
        el.textContent = desc;
    }

    _updateRumenScoreLabel(score) {
        const el = document.getElementById('rumenScoreVal');
        const card = document.getElementById('rumenDiagCard');
        if (!el) return;
        let diag = '';
        let color = '#38bdf8';

        if (score <= 1.5) {
            diag = '<strong>⚠️ Score 1: Ernstig Hol (&gt;1 handbreedte)</strong>: Diepe driehoekige uitholling onder dwarsuitsteeksels. Koe vreet nauwelijks. Acuut risico op ketose en lebmaagverplaatsing!';
            color = '#ef4444';
        } else if (score <= 2.5) {
            diag = '<strong>📉 Score 2: Holle Flank (1 handbreedte)</strong>: Flank valt schuin naar binnen. Te lage drogestof-opname of te snelle verteringspassage.';
            color = '#f97316';
        } else if (score <= 3.5) {
            diag = '<strong>🌿 Score 3: Optimaal Kuiltje (0.5 handbreedte)</strong>: Lichte uitholling onder de lendenribben. Ideale pensvulling voor koeien in volle melkproductie!';
            color = '#22c55e';
        } else if (score <= 4.5) {
            diag = '<strong>🌾 Score 4: Vlak tot Licht Bol</strong>: Geen kuil meer zichtbaar, buikwand welt naar buiten. Uitstekende ruwvoeropname, hoogproductieve koe of laat in lactatie.';
            color = '#06b6d4';
        } else {
            diag = '<strong>🌾 Score 5: Bolle Tonvorm</strong>: Ronde overgang zonder scheiding tussen ribben, lendenen en flank. Typisch voor droge koeien met volumineus ruwvoer.';
            color = '#38bdf8';
        }
        el.textContent = `Score ${score.toFixed(1)}`;
        if (card) {
            card.innerHTML = diag;
            card.style.borderLeftColor = color;
        }
    }

    _updateDungScoreLabel(score) {
        const el = document.getElementById('dungScoreVal');
        const card = document.getElementById('dungDiagCard');
        if (!el) return;
        let cat = 'Optimaal';
        let diag = '';
        let color = '#22c55e';

        if (score === 1) {
            cat = 'Waterdun';
            diag = '<strong>⚠️ Score 1: Waterdun &amp; Spuitend</strong>: Geen ringvorming, spat breed uiteen. Duidt op acute pensverzuring (subacute ruminale acidose / SARA) of extreem jong najaarsgras.';
            color = '#ef4444';
        } else if (score === 2) {
            cat = 'Dun / Spattend';
            diag = '<strong>📉 Score 2: Dunne Vlaai (&lt;2.5 cm)</strong>: Spat uiteen bij contact met de vloer. Eiwitoverschot of tekort aan effectieve structuur / vroege lactatie.';
            color = '#f97316';
        } else if (score === 3) {
            cat = 'Optimaal';
            diag = '<strong>⚖️ Score 3: Ideaal (3-4 cm dik)</strong>: Vlaai vormt concentrische ringen met een kuiltje in het midden. Maakt een zacht \'plop\' geluid. Optimale pensfermentatie!';
            color = '#22c55e';
        } else if (score === 4) {
            cat = 'Dik / Pasteus';
            diag = '<strong>🌾 Score 4: Dik &amp; Pasteus (&gt;5 cm)</strong>: Blijft als een compacte hoop liggen. Veel structuur/stro, typisch voor droogstaande koeien of oudere pinken.';
            color = '#06b6d4';
        } else {
            cat = 'Paardenvijgen';
            diag = '<strong>⚠️ Score 5: Harde Ballen / Paardenvijgen</strong>: Zeer droge compacte keutels. Ernstig watertekort (dehydratie) of extreme overmaat aan onverteerbaar stro.';
            color = '#eab308';
        }
        el.textContent = `Score ${score} (${cat})`;
        if (card) {
            card.innerHTML = diag;
            card.style.borderLeftColor = color;
        }
    }

    _updateHockLesionLabel(score) {
        const el = document.getElementById('hockLesionScoreVal');
        const card = document.getElementById('hockDiagCard');
        if (!el) return;
        let cat = 'Gaaf';
        let diag = '';
        let color = '#22c55e';

        if (score === 1) {
            cat = 'Gaaf';
            diag = '<strong>🦵 Score 1: Gaaf &amp; Behaard</strong>: Geen haaruitval of schaafplekken. Zacht ligbed met ruim voldoende strooisel (DeLaval comfortnorm).';
            color = '#22c55e';
        } else if (score === 2) {
            cat = 'Kaal';
            diag = '<strong>⚠️ Score 2: Kale Schuurplek (&lt;2.5 cm)</strong>: Kaalgeschuurde hakken door wrijving tegen een ruwe vloer of te dunne strooisellaag.';
            color = '#f59e0b';
        } else if (score === 3) {
            cat = 'Korsten / Zwelling';
            diag = '<strong>🩹 Score 3: Korsten &amp; Duidelijke Zwelling</strong>: Schaafwonden en zwelling door te harde ligboxbodem of contact met de achterrand.';
            color = '#f97316';
        } else {
            cat = 'Bursitis / Open';
            diag = '<strong>🚨 Score 4: Ernstig Gezwel / Bursitis</strong>: Grote vochtbult (hygroom) of open wond. Slecht ligboxontwerp en ernstige belemmering van het liggedrag.';
            color = '#ef4444';
        }
        el.textContent = `Score ${score} (${cat})`;
        if (card) {
            card.innerHTML = diag;
            card.style.borderLeftColor = color;
        }
    }

    _updateTeatConditionLabel(score) {
        const el = document.getElementById('teatConditionScoreVal');
        const card = document.getElementById('teatDiagCard');
        if (!el) return;
        let cat = 'Glad';
        let diag = '';
        let color = '#22c55e';

        if (score === 1) {
            cat = 'Glad (N)';
            diag = '<strong>✨ Score 1: Gladde Speenpunt (N)</strong>: Perfect gave kring zonder eeltvorming. Ideale melktechniek en vacuümniveau van de melkrobot.';
            color = '#22c55e';
        } else if (score === 2) {
            cat = 'Gladde ring (S)';
            diag = '<strong>🔹 Score 2: Gladde Eeltring (S)</strong>: Lichte eeltkraag zonder barsten. Normale fysiologische adaptatie aan machinaal melken.';
            color = '#38bdf8';
        } else if (score === 3) {
            cat = 'Ruwe kraag (R)';
            diag = '<strong>⚠️ Score 3: Ruwe Eeltring (R)</strong>: Ruwe kraag met kleine rafels en stervormige groeven. Te hoog melkvacuüm of te lang namelken.';
            color = '#f59e0b';
        } else {
            cat = 'Bloemkool (VR)';
            diag = '<strong>🚨 Score 4: Bloemkoolspeen (VR)</strong>: Ernstig geëverteerde, gebarsten eeltring. Hoog risico op mastitis (subklinisch en klinisch).';
            color = '#ef4444';
        }
        el.textContent = `Score ${score} (${cat})`;
        if (card) {
            card.innerHTML = diag;
            card.style.borderLeftColor = color;
        }
    }

    _syncZootechnicalUI() {
        const bcs = this.state.bcs !== undefined ? this.state.bcs : 3.0;
        const gest = this.state.gestationDays !== undefined ? this.state.gestationDays : 0;
        const par = this.state.parity !== undefined ? this.state.parity : 2;
        const rumen = this.state.rumenScore !== undefined ? this.state.rumenScore : 3.0;
        const dung = this.state.dungScore !== undefined ? this.state.dungScore : 3;
        const hock = this.state.hockScore !== undefined ? this.state.hockScore : 1;
        const teat = this.state.teatScore !== undefined ? this.state.teatScore : 1;
        const udder = this.state.udderFill !== undefined ? this.state.udderFill : 0.5;

        const bcsS = document.getElementById('bcsScore');
        if (bcsS) bcsS.value = bcs;
        this._updateBcsLabel(bcs);

        const gestS = document.getElementById('gestationDays');
        if (gestS) gestS.value = gest;
        this._updateGestationLabel(gest);

        const parS = document.getElementById('parityScore');
        if (parS) parS.value = par;
        this._updateParityLabel(par);

        const rumenS = document.getElementById('rumenScoreSlider');
        if (rumenS) rumenS.value = rumen;
        this._updateRumenScoreLabel(rumen);

        const dungS = document.getElementById('dungScoreSlider');
        if (dungS) dungS.value = dung;
        this._updateDungScoreLabel(dung);

        const hockS = document.getElementById('hockLesionScore');
        if (hockS) hockS.value = hock;
        this._updateHockLesionLabel(hock);

        const teatS = document.getElementById('teatConditionScore');
        if (teatS) teatS.value = teat;
        this._updateTeatConditionLabel(teat);

        const udderS = document.getElementById('udderFill');
        const udderV = document.getElementById('udderFillVal');
        if (udderS) udderS.value = udder;
        if (udderV) udderV.textContent = Math.round(udder * 100) + '%';
    }

    _syncHoofSlidersUI() {
        const scores = this.state.hoofScores || { FL: 1, FR: 1, HL: 1, HR: 1 };
        ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
            const val = scores[leg] !== undefined ? scores[leg] : 1.0;
            const slider = document.getElementById(`score${leg}`);
            const valSpan = document.getElementById(`scoreVal${leg}`);
            if (slider) slider.value = val;
            if (valSpan) valSpan.textContent = val.toFixed(1);
        });
    }

    _updateLocoScoreLabel() {
        const labelEl = document.getElementById('loco-score-label');
        if (!labelEl) return;

        const scores = this.state.hoofScores || { FL: 1, FR: 1, HL: 1, HR: 1 };
        const legNames = { FL: 'Linksvoor', FR: 'Rechtsvoor', HL: 'Linksachter', HR: 'Rechtsachter' };
        const legCodes = { FL: 'LV', FR: 'RV', HL: 'LA', HR: 'RA' };

        const lameHoeven = Object.entries(scores).filter(([_, s]) => s > 1.0);
        const maxScore = Math.max(...Object.values(scores));

        if (lameHoeven.length === 0 || maxScore <= 1.0) {
            labelEl.textContent = 'Score 1.0: Normaal gangwerk (vlakke ruglijn, symmetrisch 4-takt, 62% standfase)';
            labelEl.className = 'score-label';
            return;
        }

        let css = 'mild';
        if (maxScore >= 4.0) css = 'severe';
        else if (maxScore >= 2.5) css = 'moderate';

        // Beschrijving afleiden naar biomechanische patronen
        let summary = '';
        if (lameHoeven.length === 4 && maxScore >= 3.5) {
            summary = `Laminitis / Bevangenheid [Alle 4]: Ernstige kyfose (${(maxScore*2.2).toFixed(1)}°) • Korte schuifelpas • Diffuse pootontlasting`;
        } else if (lameHoeven.length === 2 && scores.HL > 1.0 && scores.HR > 1.0) {
            summary = `Bilateraal Achter [LA ${scores.HL.toFixed(1)} + RA ${scores.HR.toFixed(1)}]: Wijdsporig gangwerk • Sprecher Kyfose • Eierenlopen`;
        } else if (lameHoeven.length === 2 && scores.FL > 1.0 && scores.FR > 1.0) {
            summary = `Bilateraal Voor [LV ${scores.FL.toFixed(1)} + RV ${scores.FR.toFixed(1)}]: Steile pas • Verlaagde starre kophouding • Korte zwaaifase`;
        } else if (lameHoeven.length === 1) {
            const [leg, s] = lameHoeven[0];
            const isFront = leg.startsWith('F');
            const nod = isFront ? 'Kop OMHOOG bij pijnlijke slag ("Down on sound" bij gezonde poot)' : 'Kopduik bij pijnlijke slag • Bekkendaling';
            const abduct = !isFront ? ' • Abductie buitenklauw' : ' • Stijve koot & pootontlasting';
            summary = `Score ${s.toFixed(1)} [${legNames[leg]}]: Asymmetrisch hinken • ${nod}${abduct} • Kyfose`;
        } else {
            const details = lameHoeven.map(([l, s]) => `${legCodes[l]}:${s.toFixed(1)}`).join(', ');
            summary = `Multilateraal [${details}]: Max ${maxScore.toFixed(1)} • Gecombineerde kopdeining & rugboog`;
        }

        labelEl.textContent = summary;
        labelEl.className = 'score-label ' + css;
    }

    /**
     * Update live telemetrie in de Research Drawer (aangeroepen vanuit animate loop)
     */
    updateTelemetry(tel) {
        if (!tel) return;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('telHeadNod', (tel.headNodDeg >= 0 ? '+' : '') + tel.headNodDeg.toFixed(1) + '°');
        setVal('telSpineArch', tel.spineArchDeg.toFixed(1) + '°');
        setVal('telAbduction', tel.abductionDeg.toFixed(1) + '°');
        setVal('telPelvicTilt', tel.pelvicTiltDeg.toFixed(1) + '°');

        const scores = this.state.hoofScores || { FL: 1, FR: 1, HL: 1, HR: 1 };

        // Duty cycle bars & GRF Badges per hoef
        const updateHoofTelemetry = (legKey) => {
            const pct = tel.dutyCycles ? tel.dutyCycles[legKey] : 0.62;
            const bar = document.getElementById(`dutyBar${legKey}`);
            const val = document.getElementById(`dutyVal${legKey}`);
            const grf = document.getElementById(`grfVal${legKey}`);
            const p = Math.round(pct * 100);

            if (bar) {
                bar.style.height = Math.max(10, Math.min(100, p)) + '%';
                bar.classList.toggle('lame', (scores[legKey] || 1.0) > 1.5);
            }
            if (val) val.textContent = p + '%';

            if (grf && tel.grfRelief) {
                const grfPct = tel.grfRelief[legKey] !== undefined ? tel.grfRelief[legKey] : 100;
                grf.textContent = grfPct + '% Fz';
                if (grfPct <= 60) {
                    grf.style.color = '#ff5252';
                } else if (grfPct <= 80) {
                    grf.style.color = '#ffb142';
                } else {
                    grf.style.color = '#888';
                }
            }
        };

        ['FL', 'FR', 'HL', 'HR'].forEach(updateHoofTelemetry);

        // ── Kauwslagenteller per brok (Jan Hulsen Koesignalen) ────────────────
        const chewCounterEl = document.getElementById('chewCounterLiveVal');
        if (chewCounterEl) {
            if (this.state && this.state.ruminating) {
                const count = tel.bolusChews || 0;
                let status = (count >= 50 && count <= 65) ? ' (Optimaal)' : (count < 50 ? ' (Kort)' : ' (Vezelrijk)');
                chewCounterEl.textContent = `${count} slagen${status}`;
                chewCounterEl.style.color = (count >= 50 && count <= 65) ? '#10b981' : (count < 50 ? '#fbbf24' : '#60a5fa');
            } else {
                chewCounterEl.textContent = 'Rust / Niet actief';
                chewCounterEl.style.color = '#94a3b8';
            }
        }

        // ── Wetenschappelijke Benchmark Toetsing (Live Validatie) ───────────────
        if (tel.dutyCycles) {
            const minDuty = Math.min(tel.dutyCycles.FL, tel.dutyCycles.FR, tel.dutyCycles.HL, tel.dutyCycles.HR);
            const maxDuty = Math.max(tel.dutyCycles.FL, tel.dutyCycles.FR, tel.dutyCycles.HL, tel.dutyCycles.HR);
            const dutyDiff = Math.round((maxDuty - minDuty) * 100);
            const bmDuty = document.getElementById('bmDutyStatus');
            if (bmDuty) {
                if (dutyDiff > 5) {
                    bmDuty.textContent = `✅ Δ${dutyDiff}% (min ${Math.round(minDuty * 100)}%)`;
                    bmDuty.className = 'bm-status ' + (minDuty < 0.35 ? 'severe' : 'moderate');
                } else {
                    bmDuty.textContent = '✅ Symmetrisch (62%)';
                    bmDuty.className = 'bm-status';
                }
            }
        }

        const bmSpine = document.getElementById('bmSpineStatus');
        if (bmSpine) {
            const arch = tel.spineArchDeg || 0;
            if (arch > 0.8) {
                bmSpine.textContent = `✅ ${arch.toFixed(1)}° Boog`;
                bmSpine.className = 'bm-status ' + (arch > 6.0 ? 'severe' : 'moderate');
            } else {
                bmSpine.textContent = '✅ Vlak (0.0°)';
                bmSpine.className = 'bm-status';
            }
        }

        const bmGrf = document.getElementById('bmGrfStatus');
        if (bmGrf && tel.grfRelief) {
            const minGrf = Math.min(...Object.values(tel.grfRelief));
            if (minGrf < 95) {
                bmGrf.textContent = `✅ ${minGrf}% Fz (-${100 - minGrf}%)`;
                bmGrf.className = 'bm-status ' + (minGrf < 70 ? 'severe' : 'moderate');
            } else {
                bmGrf.textContent = '✅ 100% Symm Fz';
                bmGrf.className = 'bm-status';
            }
        }

        const bmAbduct = document.getElementById('bmAbductStatus');
        if (bmAbduct) {
            const abd = tel.abductionDeg || 0;
            if (abd > 0.8) {
                bmAbduct.textContent = `✅ ${abd.toFixed(1)}° Abductie`;
                bmAbduct.className = 'bm-status ' + (abd > 10.0 ? 'severe' : 'moderate');
            } else {
                bmAbduct.textContent = '✅ Rechtsporig (0°)';
                bmAbduct.className = 'bm-status';
            }
        }
    }
}
