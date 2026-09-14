/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROCEDURALSKINGENERATOR.JS — Realistische Huid- & Vachtensynthese voor Runderen
 * ═══════════════════════════════════════════════════════════════════════════════
 * Biedt methoden voor:
 *  1. Procedurale Canvas Vlekkengenerator (Organic metaballs + willekeurige piebald patronen)
 *  2. Authentieke Nederlandse en internationale rassen:
 *     - Holstein-Friesian Zwartbont (natuurlijke amorfe vlekken op witte ondergrond)
 *     - MRIJ / Red Holstein Roodbont (warme mahonie / kastanjerode vlekken)
 *     - Groninger Blaarkop (witte kop met karakteristieke oogblaren)
 *     - Lakenvelder (helderwitte buikband met zwarte of rode voor- en achterhand)
 *     - Witrug (aalstreep over de rug met gespikkelde flanken)
 *     - Jersey / Brown Swiss (karamel/tan verloop naar donkere extremiteiten)
 *     - Simmentaler / Fleckvieh (crèmerood bont met witte kop)
 *     - Black Angus (egaal diep antraciet)
 *     - Charolais (egaal crème-wit)
 *     - Freestyle Willekeurig (vrije zaadwaarde, dekking, vlekgrootte en kleuring)
 *  3. Masker-beveiliging: Mui (neusspiegel), ogen, hoeven, uier en oorbinnenzijde
 *     blijven altijd anatomisch correct bewaard via 'cow_f_mask.png'.
 *  4. Domain Randomization (snelle RGB/HSL tinting uit 'real').
 *  5. Morfologische Willekeur (girth +/-18%, lengte +/-8%, schofthoogte +/-6%, BCS).
 */

import * as THREE from 'three';

// Eenvoudige deterministische Pseudo-Random Number Generator (Mulberry32)
function createRNG(seed = 123456) {
    let s = Math.floor(Math.abs(seed)) || 1;
    return function() {
        s |= 0;
        s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export class ProceduralSkinGenerator {
    constructor() {
        this.canvasSize = 1024; // 1024x1024 voor razendsnelle generatie en haarscherpe weergave
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasSize;
        this.canvas.height = this.canvasSize;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        this.baseImage = null;
        this.maskImage = null;
        this.baseImageData = null;
        this.maskImageData = null;

        this.isLoaded = false;
        this._loadPrerequisites();
    }

    async _loadPrerequisites() {
        const loadImage = (src) => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Kon afbeelding niet laden: ' + src));
            img.src = src;
        });

        try {
            const [base, mask] = await Promise.all([
                loadImage('textures/cow_f_base.jpg'),
                loadImage('textures/cow_f_mask.png')
            ]);
            this.baseImage = base;
            this.maskImage = mask;

            // Cache pixeldata op gewenste canvasgrootte
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvasSize;
            tempCanvas.height = this.canvasSize;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(this.baseImage, 0, 0, this.canvasSize, this.canvasSize);
            this.baseImageData = tempCtx.getImageData(0, 0, this.canvasSize, this.canvasSize);

            tempCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);
            tempCtx.drawImage(this.maskImage, 0, 0, this.canvasSize, this.canvasSize);
            this.maskImageData = tempCtx.getImageData(0, 0, this.canvasSize, this.canvasSize);

            this.isLoaded = true;
        } catch (err) {
            console.warn('[ProceduralSkinGenerator] Masker/Basis niet geladen, fallback actief:', err);
        }
    }

    /**
     * Genereert een organische amoebe-achtige vlek met natuurlijke onregelmatige randen
     */
    _drawOrganicBlob(ctx, cx, cy, radius, color, rng, complexity = 5) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const points = 16;
        const angleStep = (Math.PI * 2) / points;
        const polyPoints = [];

        // Harmonische variatie rond de straal
        const f1 = 2 + Math.floor(rng() * 3);
        const f2 = 4 + Math.floor(rng() * 4);
        const p1 = rng() * Math.PI * 2;
        const p2 = rng() * Math.PI * 2;

        for (let i = 0; i < points; i++) {
            const angle = i * angleStep;
            const rMod = 1.0 
                + 0.32 * Math.sin(angle * f1 + p1) 
                + 0.22 * Math.cos(angle * f2 + p2)
                + (rng() * 0.18 - 0.09);
            const r = radius * Math.max(0.35, rMod);
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            polyPoints.push({ x, y });
        }

        // Vloeiende kromme door de punten
        ctx.moveTo((polyPoints[0].x + polyPoints[points - 1].x) / 2, (polyPoints[0].y + polyPoints[points - 1].y) / 2);
        for (let i = 0; i < points; i++) {
            const curr = polyPoints[i];
            const next = polyPoints[(i + 1) % points];
            const midX = (curr.x + next.x) / 2;
            const midY = (curr.y + next.y) / 2;
            ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
        }
        ctx.closePath();
        ctx.fill();

        // 2 tot 4 satellietvlekjes aan de rand voor typisch natuurlijk bontpatroon
        const satellites = Math.floor(rng() * complexity) + 1;
        for (let s = 0; s < satellites; s++) {
            const satAngle = rng() * Math.PI * 2;
            const satDist = radius * (0.85 + rng() * 0.5);
            const satR = radius * (0.15 + rng() * 0.25);
            const sx = cx + Math.cos(satAngle) * satDist;
            const sy = cy + Math.sin(satAngle) * satDist;

            ctx.beginPath();
            ctx.arc(sx, sy, satR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Hoofdmethode: Genereert een Three.js CanvasTexture met uniek vlekpatroon
     */
    generateSkin(options = {}) {
        const seed = options.seed !== undefined ? options.seed : Math.floor(Math.random() * 1000000);
        const rng = createRNG(seed);
        const pattern = options.pattern || 'holstein';
        const density = options.density !== undefined ? options.density : 0.50; // 0.1 = minimaal bont, 0.9 = bijna zwart
        const sizeMod = options.spotSize || 1.0;

        const ctx = this.ctx;
        const w = this.canvasSize;
        const h = this.canvasSize;
        ctx.clearRect(0, 0, w, h);

        // 1. Achtergrondvacht (Wit, Crème of Grondkleur)
        let bgCoat = '#f5f4ef'; // Natuurlijk melkwit
        if (pattern === 'jersey') bgCoat = '#c49a6c';
        else if (pattern === 'angus') bgCoat = '#1c1c1e';
        else if (pattern === 'charolais') bgCoat = '#f2ede4';
        else if (pattern === 'simmentaler') bgCoat = '#f8f6f0';
        else if (options.baseColor) bgCoat = options.baseColor;

        ctx.fillStyle = bgCoat;
        ctx.fillRect(0, 0, w, h);

        // 2. Vlekkenkleur bepalen
        let spotColor = '#18181b'; // Diepzwart voor Zwartbont
        if (pattern === 'roodbont') spotColor = '#94381e'; // Mahonierood voor Roodbont / MRIJ
        else if (pattern === 'blaarkop') spotColor = (rng() < 0.5) ? '#18181b' : '#94381e';
        else if (pattern === 'lakenvelder') spotColor = (options.variant === 'red' || rng() < 0.4) ? '#8c2d15' : '#18181b';
        else if (pattern === 'witrug') spotColor = (rng() < 0.5) ? '#1a1a1c' : '#8c2d15';
        else if (pattern === 'simmentaler') spotColor = '#bd5e38'; // Warme felle voskleur
        else if (pattern === 'jersey') spotColor = '#5e432c';
        else if (options.spotColor) spotColor = options.spotColor;

        // 3. Patroon-specifieke synthese
        if (pattern === 'holstein' || pattern === 'roodbont' || pattern === 'freestyle') {
            // Aantal vlekken schalen met dichtheid
            const baseCount = Math.floor(10 + density * 24);
            for (let i = 0; i < baseCount; i++) {
                const cx = rng() * w;
                const cy = rng() * h;
                const r = (55 + rng() * 110) * sizeMod * (0.8 + density * 0.4);
                this._drawOrganicBlob(ctx, cx, cy, r, spotColor, rng);
            }

            // Kleine spikkels en flanken-vegen
            const flecks = Math.floor(density * 35);
            for (let i = 0; i < flecks; i++) {
                const fx = rng() * w;
                const fy = rng() * h;
                const fr = 8 + rng() * 22;
                ctx.beginPath();
                ctx.arc(fx, fy, fr, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (pattern === 'blaarkop') {
            // Lichaam is egaal gekleurd
            ctx.fillStyle = spotColor;
            ctx.fillRect(0, 0, w, h);

            // Witte kopsectie
            ctx.fillStyle = '#f8f7f2';
            // De kop in de UV map beslaat de linkerhelft bovenaan
            ctx.beginPath();
            ctx.ellipse(w * 0.25, h * 0.28, w * 0.22, h * 0.24, 0, 0, Math.PI * 2);
            ctx.fill();

            // Oogblaren (typische gekleurde cirkels rond de ogen op de witte kop)
            ctx.fillStyle = spotColor;
            ctx.beginPath();
            ctx.ellipse(w * 0.18, h * 0.24, w * 0.055, h * 0.045, 0.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(w * 0.32, h * 0.24, w * 0.055, h * 0.045, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // Witte staartkwast en witte onderbenen
            ctx.fillStyle = '#f8f7f2';
            ctx.fillRect(w * 0.65, h * 0.75, w * 0.3, h * 0.2);

        } else if (pattern === 'lakenvelder') {
            // Lichaam is basiskleur (zwart of rood)
            ctx.fillStyle = spotColor;
            ctx.fillRect(0, 0, w, h);

            // Het 'Laken': een helderwitte brede band over middenribben en buik
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            // Dunne onregelmatige randen aan de zijkanten van de band
            const bandLeft = w * 0.34;
            const bandWidth = w * 0.30;
            ctx.rect(bandLeft, 0, bandWidth, h);
            ctx.fill();

            // Maak de randen van het laken natuurlijk licht golvend
            for (let y = 0; y < h; y += 30) {
                const waveL = (rng() - 0.5) * 20;
                const waveR = (rng() - 0.5) * 20;
                ctx.beginPath();
                ctx.arc(bandLeft + waveL, y, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(bandLeft + bandWidth + waveR, y, 16, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (pattern === 'witrug') {
            // Egaal gekleurde romp
            ctx.fillStyle = spotColor;
            ctx.fillRect(0, 0, w, h);

            // Witte rugstreep over de wervelkolom
            ctx.fillStyle = '#f5f4ef';
            ctx.beginPath();
            ctx.rect(w * 0.45, 0, w * 0.10, h);
            ctx.fill();

            // Druppels / spikkels langs de ruglijn
            for (let i = 0; i < 40; i++) {
                const spX = w * (0.40 + rng() * 0.20);
                const spY = rng() * h;
                const spR = 6 + rng() * 16;
                ctx.beginPath();
                ctx.arc(spX, spY, spR, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (pattern === 'jersey') {
            // Donkerdere aalstreep en donkerdere schouders/flanken
            const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, w * 0.1, w * 0.5, h * 0.5, w * 0.6);
            grad.addColorStop(0, '#be8f5d');
            grad.addColorStop(0.6, '#8b5f3a');
            grad.addColorStop(1, '#4f351f');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

        } else if (pattern === 'simmentaler') {
            // Witte kop & onderbuik
            const spotCount = Math.floor(6 + density * 12);
            for (let i = 0; i < spotCount; i++) {
                const cx = w * (0.2 + rng() * 0.7);
                const cy = h * (0.2 + rng() * 0.7);
                const r = (90 + rng() * 150) * sizeMod;
                this._drawOrganicBlob(ctx, cx, cy, r, spotColor, rng, 3);
            }
        }

        // 4. MASKER COMPOSITING: Mui, hoeven, uier en ogen ongemoeid laten!
        if (this.isLoaded && this.baseImageData && this.maskImageData) {
            const currentData = ctx.getImageData(0, 0, w, h);
            const curPix = currentData.data;
            const basePix = this.baseImageData.data;
            const maskPix = this.maskImageData.data;
            const total = curPix.length;

            for (let i = 0; i < total; i += 4) {
                const mask = maskPix[i] / 255.0; // 1 = vacht (vervangbaar), 0 = mui/hoef/oog/uier
                if (mask < 0.98) {
                    curPix[i]     = Math.round(curPix[i] * mask + basePix[i] * (1.0 - mask));
                    curPix[i + 1] = Math.round(curPix[i + 1] * mask + basePix[i + 1] * (1.0 - mask));
                    curPix[i + 2] = Math.round(curPix[i + 2] * mask + basePix[i + 2] * (1.0 - mask));
                }
            }
            ctx.putImageData(currentData, 0, 0);
        }

        // 5. Maak of update Three.js CanvasTexture
        const texture = new THREE.CanvasTexture(this.canvas);
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        return {
            texture: texture,
            pattern: pattern,
            seed: seed,
            spotColor: spotColor,
            bgCoat: bgCoat,
        };
    }

    /**
     * Domain Randomization: Directe tinting op het materiaal (razendsnel, zero draw cost)
     */
    applyDomainRandomization(cowModel, breedType = 'random') {
        if (!cowModel) return;

        let tint = new THREE.Color(0xffffff);
        if (breedType === 'random') {
            const rand = Math.random();
            if (rand < 0.35) {
                tint.setHex(0xffffff); // Holstein (geen tint)
            } else if (rand < 0.60) {
                tint.setRGB(0.85 + Math.random() * 0.1, 0.50 + Math.random() * 0.1, 0.35 + Math.random() * 0.1); // Roodbont
            } else if (rand < 0.80) {
                tint.setRGB(0.70 + Math.random() * 0.1, 0.58 + Math.random() * 0.1, 0.45 + Math.random() * 0.1); // Jersey / Brown Swiss
            } else if (rand < 0.92) {
                tint.setRGB(0.22 + Math.random() * 0.06, 0.22 + Math.random() * 0.06, 0.22 + Math.random() * 0.06); // Black Angus
            } else {
                tint.setRGB(0.96, 0.94, 0.88); // Charolais crème
            }
        } else if (breedType === 'red') {
            tint.setRGB(0.90, 0.52, 0.38);
        } else if (breedType === 'jersey') {
            tint.setRGB(0.72, 0.60, 0.48);
        } else if (breedType === 'angus') {
            tint.setRGB(0.20, 0.20, 0.22);
        } else if (breedType === 'charolais') {
            tint.setRGB(0.96, 0.94, 0.88);
        }

        cowModel.traverse(child => {
            if (child.isMesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(m => {
                    m.color.copy(tint);
                    m.needsUpdate = true;
                });
            }
        });

        return tint;
    }

    /**
     * Morfologische Willekeur (Lichaamsgirth +/-18%, romplengte +/-8%, schofthoogte +/-6%)
     */
    randomizeConformation(cowEntry) {
        if (!cowEntry || !cowEntry.model) return;

        const lengthScale  = 1.0 + (Math.random() * 0.16 - 0.08);   // +/- 8% romplengte
        const fatnessScale = 1.0 + (Math.random() * 0.36 - 0.18);  // +/- 18% borstomvang / girth
        const heightScale  = 1.0 + (Math.random() * 0.12 - 0.06);   // +/- 6% schofthoogte

        cowEntry.model.scale.set(lengthScale, fatnessScale, heightScale);

        // Update ook conformatie & conditiescore in CowBehavior indien aanwezig
        if (cowEntry.behavior) {
            cowEntry.behavior.parity = Math.floor(Math.random() * 5); // 0 (vaars) t/m 4
            cowEntry.behavior.bcs = 2.25 + Math.random() * 1.75;      // 2.25 (mager) t/m 4.0 (vet)
            cowEntry.behavior.gestationDays = Math.floor(Math.random() * 280); // 0 t/m 9 maanden dracht
            if (cowEntry.behavior.onConformationChanged) {
                cowEntry.behavior.onConformationChanged();
            }
        }

        return { lengthScale, fatnessScale, heightScale };
    }
}
