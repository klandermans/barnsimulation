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
                document.querySelectorAll('.cow-select-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const behavior = this.scene.selectCow(btn.dataset.cow);
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
                document.querySelectorAll('.gait-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.behavior.setGait(btn.dataset.gait);
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
        bindChk('chkDogSitting',  'dogSitting');

        // ── 9. Zoötechniek, Dracht & Lichaamsconditie (Ferguson / Edmonson) ──
        this._bindSlider('bcsScore', v => {
            this.state.bcs = v;
            this._updateBcsLabel(v);
            this._syncCowPassportUI();
        });

        this._bindSlider('gestationDays', v => {
            this.state.gestationDays = Math.round(v);
            this._updateGestationLabel(Math.round(v));
            this._syncCowPassportUI();
        });

        this._bindSlider('parityScore', v => {
            this.state.parity = Math.round(v);
            this._updateParityLabel(Math.round(v));
            this._syncCowPassportUI();
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
                } else if (p === 'peak_lactation') {
                    this.state.parity = 3;
                    this.state.gestationDays = 60;
                    this.state.bcs = 2.25;
                } else if (p === 'late_gestation') {
                    this.state.parity = 4;
                    this.state.gestationDays = 275;
                    this.state.bcs = 3.50;
                } else if (p === 'pregnant_heifer') {
                    this.state.parity = 0;
                    this.state.gestationDays = 210;
                    this.state.bcs = 3.25;
                }
                this._syncZootechnicalUI();
                this._syncCowPassportUI();
            });
        });

        // ── Fysiologie & Lichaamsconditie Sliders ─────────────────────────────
        this._bindSlider('rumenFill', v => {
            this.state.rumenFill = v;
            const el = document.getElementById('rumenFillVal');
            if (el) el.textContent = Math.round(v * 100) + '%';
        });

        this._bindSlider('udderFill', v => {
            this.state.udderFill = v;
            const el = document.getElementById('udderFillVal');
            if (el) el.textContent = Math.round(v * 100) + '%';
        });

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

        // ── Fokkerij Sliders ────────────────────────────────────────────────
        const bvSliders = [
            { id: 'bvUdderDepth',    trait: 'udderDepth',    format: v => `${v} (${v > 102 ? 'Ondiep/Hoog' : (v < 98 ? 'Diep' : 'Gemiddeld')})` },
            { id: 'bvCleft',         trait: 'cleft',         format: v => `${v} (${v > 102 ? 'Sterke Band' : (v < 98 ? 'Vlak' : 'Gemiddeld')})` },
            { id: 'bvTeatPlacement', trait: 'teatPlacement', format: v => `${v} (${v > 102 ? 'Centraal' : (v < 98 ? 'Wijd' : 'Gemiddeld')})` },
            { id: 'bvTeatLength',    trait: 'teatLength',    format: v => `${v} (${(3.8 + (v - 96) * 0.2).toFixed(1)} cm)` },
            { id: 'bvRearLegSide',   trait: 'rearLegSide',   format: v => `${v} (${v > 102 ? 'Krom/Sabel' : (v < 98 ? 'Steil' : 'Ideaal')})` },
            { id: 'bvClawHealth',    trait: 'clawHealth',    format: v => `${v} (${v > 102 ? 'Resistent' : (v < 98 ? 'Gevoelig' : 'Gemiddeld')})` },
            { id: 'bvStature',       trait: 'stature',       format: v => `${v} (${(1.42 + (v - 96) * 0.01).toFixed(2)} m)` },
        ];

        bvSliders.forEach(s => {
            this._bindSlider(s.id, v => {
                if (this.behavior && this.behavior.breedingManager) {
                    this.behavior.breedingManager.setTrait(s.trait, v);
                    const el = document.getElementById(s.id + 'Val');
                    if (el) el.textContent = s.format(v);
                    this._updateBreedingSummary();
                    this._syncCowPassportUI();
                }
            });
        });

        // ── Vacht & Texturen ─────────────────────────────────────────────────
        document.querySelectorAll('.tex-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tex-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.scene.applyTexture) this.scene.applyTexture(btn.dataset.tex);
            });
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
        bindSync('rumenFill', 'rumenFillVal', Math.round((this.state.rumenFill || 0.65) * 100), '%');
        bindSync('udderFill', 'udderFillVal', Math.round((this.state.udderFill || 0.5) * 100), '%');
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

        // 7. Fokkerij & Fokwaarden (CRV / NVI)
        this._syncBreedingUI();

        // 8. Hondenzit
        const chkDog = document.getElementById('chkDogSitting');
        if (chkDog) chkDog.checked = !!this.state.dogSitting;

        // 9. Paspoort Badge (Kies je Koe)
        this._syncCowPassportUI();

        this._updateLocoScoreLabel();
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
                const sum = bm.getSummary();
                const sign = sum.nvi >= 0 ? '+' : '';
                pBreeding.textContent = `${sum.name} (${sign}${sum.nvi} NVI)`;
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
        const updateSlider = (id, val, format) => {
            const s = document.getElementById(id);
            const v = document.getElementById(id + 'Val');
            if (s) s.value = val;
            if (v) v.textContent = format(val);
        };

        updateSlider('bvUdderDepth', traits.udderDepth, v => `${v} (${v > 102 ? 'Ondiep/Hoog' : (v < 98 ? 'Diep' : 'Gemiddeld')})`);
        updateSlider('bvCleft', traits.cleft, v => `${v} (${v > 102 ? 'Sterke Band' : (v < 98 ? 'Vlak' : 'Gemiddeld')})`);
        updateSlider('bvTeatPlacement', traits.teatPlacement, v => `${v} (${v > 102 ? 'Centraal' : (v < 98 ? 'Wijd' : 'Gemiddeld')})`);
        updateSlider('bvTeatLength', traits.teatLength, v => `${v} (${(3.8 + (v - 96) * 0.2).toFixed(1)} cm)`);
        updateSlider('bvRearLegSide', traits.rearLegSide, v => `${v} (${v > 102 ? 'Krom/Sabel' : (v < 98 ? 'Steil' : 'Ideaal')})`);
        updateSlider('bvClawHealth', traits.clawHealth, v => `${v} (${v > 102 ? 'Resistent' : (v < 98 ? 'Gevoelig' : 'Gemiddeld')})`);
        updateSlider('bvStature', traits.stature, v => `${v} (${(1.42 + (v - 96) * 0.01).toFixed(2)} m)`);

        this._updateBreedingSummary();
    }

    _updateBreedingSummary() {
        if (!this.behavior || !this.behavior.breedingManager) return;
        const sum = this.behavior.breedingManager.getSummary();
        const t = sum.traits;

        const pName = document.getElementById('bvProfileName');
        const pNvi  = document.getElementById('bvNviVal');
        const pInet = document.getElementById('bvInetVal');
        const pUdder= document.getElementById('bvUdderHealthVal');
        const pClaw = document.getElementById('bvClawHealthVal');

        if (pName) pName.textContent = sum.name;
        if (pNvi)  pNvi.textContent = (sum.nvi >= 0 ? '+' : '') + sum.nvi;
        if (pInet) pInet.textContent = '€' + (sum.inet !== undefined ? sum.inet : Math.round(150 + (t.udderDepth + t.stature - 200) * 12));
        if (pUdder)pUdder.textContent = t.udderHealth || 105;
        if (pClaw) pClaw.textContent = t.clawHealth || 106;
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
        if (!el) return;
        let phase = 'Niet drachtig';
        if (days === 0) phase = 'Niet drachtig';
        else if (days < 100) phase = 'Vroegdracht';
        else if (days < 200) phase = 'Middendracht';
        else if (days < 265) phase = 'Laatdracht: Kalf rechts';
        else phase = 'A terme / Kalfklaar';
        el.textContent = `${days} d (${phase})`;
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

    _syncZootechnicalUI() {
        const bcs = this.state.bcs !== undefined ? this.state.bcs : 3.0;
        const gest = this.state.gestationDays !== undefined ? this.state.gestationDays : 0;
        const par = this.state.parity !== undefined ? this.state.parity : 2;

        const bcsS = document.getElementById('bcsScore');
        if (bcsS) bcsS.value = bcs;
        this._updateBcsLabel(bcs);

        const gestS = document.getElementById('gestationDays');
        if (gestS) gestS.value = gest;
        this._updateGestationLabel(gest);

        const parS = document.getElementById('parityScore');
        if (parS) parS.value = par;
        this._updateParityLabel(par);
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
            const nod = isFront ? 'Kop OMHOOG bij hoefslag' : 'Kop OMLAAG (gewichtsoverdracht)';
            const abduct = !isFront ? ' • Abductie buitenklauw (8°-20°)' : ' • Verkorte zwaaifase';
            summary = `Score ${s.toFixed(1)} [${legNames[leg]}]: ${nod}${abduct} • Kyfose`;
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
