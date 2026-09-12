/**
 * PastureEnvironment.js — Realistisch Hollands Weiland & Polderomgeving
 * 
 * Natuurgetrouwe weide-omgeving voor de melkveesimulatie:
 * - Eindeloos Hollands weiland met natuurlijk poldergras (diffuse, normal, roughness)
 * - Fijne volumetrische 3D weidegrashalmen (InstancedMesh) op weidehoogte (8-12 cm)
 * - Authentieke Hollandse polderhemel met zomers blauw zenit, zachte horizonnevel & stapelwolken
 * - Zonlicht (warme zonneschijn met zachte schaduwen) en weide-hemelsfeer (hemisphere light)
 * - Houten weideafrastering met weidepaaltjes en liggers
 * - Typische knotwilgen (Salix alba) langs de poldersloot
 * - Vlotte schakelaar tussen Weiland (Buiten) en Studio (Klinisch)
 */

import * as THREE from 'three';

export class PastureEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.mode = 'pasture'; // 'pasture' | 'studio'
        this.time = 0;

        this.pastureGroup = new THREE.Group();
        this.pastureGroup.name = 'PastureEnvironmentGroup';
        this.scene.add(this.pastureGroup);

        this.studioGroup = new THREE.Group();
        this.studioGroup.name = 'StudioEnvironmentGroup';
        this.scene.add(this.studioGroup);

        this._initStudioEnvironment();
        this._initPastureEnvironment();

        // Standaard actief: WEILAND (BUITEN)
        this.setMode('pasture');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Studio Omgeving (Klinisch donker voor inspectie)
    // ─────────────────────────────────────────────────────────────────────────
    _initStudioEnvironment() {
        // Vloer
        const groundGeo = new THREE.PlaneGeometry(30, 30);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x181818,
            roughness: 0.9,
            metalness: 0.0,
        });
        this.studioFloor = new THREE.Mesh(groundGeo, groundMat);
        this.studioFloor.rotation.x = -Math.PI / 2;
        this.studioFloor.receiveShadow = true;
        this.studioGroup.add(this.studioFloor);

        // Raster
        this.studioGrid = new THREE.GridHelper(30, 30, 0x444444, 0x2b2b2b);
        this.studioGrid.material.opacity = 0.15;
        this.studioGrid.material.transparent = true;
        this.studioGrid.visible = false;
        this.studioGroup.add(this.studioGrid);

        // Lichten
        this.studioAmbient = new THREE.AmbientLight(0xffffff, 0.45);
        this.studioGroup.add(this.studioAmbient);

        this.studioKey = new THREE.DirectionalLight(0xfff5e0, 2.2);
        this.studioKey.position.set(-6, 9, -4);
        this.studioKey.castShadow = true;
        this.studioKey.shadow.mapSize.set(2048, 2048);
        this.studioKey.shadow.camera.near = 0.5;
        this.studioKey.shadow.camera.far = 30;
        this.studioKey.shadow.camera.left   = -12;
        this.studioKey.shadow.camera.right  =  12;
        this.studioKey.shadow.camera.top    =  12;
        this.studioKey.shadow.camera.bottom = -12;
        this.studioKey.shadow.bias = -0.001;
        this.studioGroup.add(this.studioKey);

        this.studioFill = new THREE.DirectionalLight(0xd0e8ff, 0.7);
        this.studioFill.position.set(6, 6, -4);
        this.studioGroup.add(this.studioFill);

        this.studioRim = new THREE.DirectionalLight(0xffeedd, 0.9);
        this.studioRim.position.set(2, 4, 8);
        this.studioGroup.add(this.studioRim);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Realistisch Weiland (Buiten / Hollands Polderlandschap)
    // ─────────────────────────────────────────────────────────────────────────
    _initPastureEnvironment() {
        const textureLoader = new THREE.TextureLoader();

        // A. Polder Hemel & Wolken
        this._buildSkyDome();

        // B. Daglicht & Warme Zonnestraling
        this._buildDaylight();

        // C. Weiland Bodem / Uitgestrekt Grasland
        this._buildMeadowTerrain(textureLoader);

        // D. Fijne 3D Weidegras Halmen
        this._build3DGrassTufts();

        // E. Authentiek Houten Weidehek
        this._buildPastureFence(textureLoader);

        // F. Knotwilgen langs de weidesloot
        this._buildLandscapeElements();

        // Zachte poldernevel die vloeiend overloopt in de hemel
        this.pastureFog = new THREE.Fog(0xc2ddf2, 35, 160);
    }

    // A. Hollandse Polderhemel
    _buildSkyDome() {
        const skyGeo = new THREE.SphereGeometry(220, 32, 24);
        
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 horizonColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                vec3 col;
                if (h > 0.0) {
                    col = mix(horizonColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                } else {
                    col = mix(horizonColor, bottomColor, max(pow(max(-h, 0.0), 0.5), 0.0));
                }
                gl_FragColor = vec4(col, 1.0);
            }
        `;

        this.skyUniforms = {
            topColor:     { value: new THREE.Color(0x2876c2) }, // Diep Hollands zomerblauw
            horizonColor: { value: new THREE.Color(0xd2e7f6) }, // Lichte horizonnevel
            bottomColor:  { value: new THREE.Color(0x5a8740) }, // Weideschijn onder de horizon
            offset:       { value: 15 },
            exponent:     { value: 0.55 }
        };

        const skyMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: this.skyUniforms,
            side: THREE.BackSide,
            depthWrite: false
        });

        this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
        this.pastureGroup.add(this.skyMesh);

        this._buildClouds();
    }

    _buildClouds() {
        this.cloudsGroup = new THREE.Group();
        const cloudGeo = new THREE.DodecahedronGeometry(8, 1);
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.72,
            depthWrite: false
        });

        const cloudPositions = [
            [-50, 48, -100, 2.5],
            [ 35, 52, -120, 3.2],
            [-85, 45,   40, 2.8],
            [ 75, 50,   60, 2.4],
            [-20, 55,  110, 3.5]
        ];

        cloudPositions.forEach(([x, y, z, s]) => {
            const cluster = new THREE.Group();
            for (let i = 0; i < 6; i++) {
                const puff = new THREE.Mesh(cloudGeo, cloudMat);
                puff.position.set(
                    (Math.random() - 0.5) * 12,
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 12
                );
                const ps = 0.7 + Math.random() * 0.8;
                puff.scale.set(ps, ps * 0.5, ps);
                cluster.add(puff);
            }
            cluster.position.set(x, y, z);
            cluster.scale.set(s, s, s);
            this.cloudsGroup.add(cluster);
        });

        this.pastureGroup.add(this.cloudsGroup);
    }

    // B. Daglicht & Warme Zonnestraling
    _buildDaylight() {
        // Warme zon
        this.pastureSun = new THREE.DirectionalLight(0xfff8ea, 2.6);
        this.pastureSun.position.set(-14, 20, -10);
        this.pastureSun.castShadow = true;
        this.pastureSun.shadow.mapSize.set(2048, 2048);
        this.pastureSun.shadow.camera.near = 0.5;
        this.pastureSun.shadow.camera.far = 60;
        this.pastureSun.shadow.camera.left   = -16;
        this.pastureSun.shadow.camera.right  =  16;
        this.pastureSun.shadow.camera.top    =  16;
        this.pastureSun.shadow.camera.bottom = -16;
        this.pastureSun.shadow.bias = -0.0006;
        this.pastureGroup.add(this.pastureSun);

        // Hemelsfeer (boven: blauwe hemel, onder: weidegroen)
        this.pastureHemi = new THREE.HemisphereLight(0x8ec7f5, 0x4a7530, 1.35);
        this.pastureGroup.add(this.pastureHemi);

        // Tegenlicht / rim glans op vacht
        this.pastureRim = new THREE.DirectionalLight(0xffeed9, 0.5);
        this.pastureRim.position.set(10, 8, 12);
        this.pastureGroup.add(this.pastureRim);
    }

    // C. Weiland Bodem / Grasland
    _buildMeadowTerrain(textureLoader) {
        // Royaal weideveld (240 x 240 m) dat naadloos doorloopt tot in de horizonnevel
        const terrainGeo = new THREE.PlaneGeometry(260, 260, 1, 1);
        
        const grassDiff = textureLoader.load('textures/pasture_grass_diffuse.jpg');
        grassDiff.wrapS = grassDiff.wrapT = THREE.RepeatWrapping;
        grassDiff.repeat.set(32, 32);
        grassDiff.colorSpace = THREE.SRGBColorSpace;

        const grassNorm = textureLoader.load('textures/pasture_grass_normal.jpg');
        grassNorm.wrapS = grassNorm.wrapT = THREE.RepeatWrapping;
        grassNorm.repeat.set(32, 32);

        const grassRough = textureLoader.load('textures/pasture_grass_roughness.jpg');
        grassRough.wrapS = grassRough.wrapT = THREE.RepeatWrapping;
        grassRough.repeat.set(32, 32);

        const terrainMat = new THREE.MeshStandardMaterial({
            map: grassDiff,
            normalMap: grassNorm,
            normalScale: new THREE.Vector2(0.6, 0.6),
            roughnessMap: grassRough,
            roughness: 0.82,
            metalness: 0.01,
        });

        this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
        this.terrainMesh.rotation.x = -Math.PI / 2;
        this.terrainMesh.receiveShadow = true;
        this.pastureGroup.add(this.terrainMesh);
    }

    // D. Fijne 3D Weidegras Halmen (InstancedMesh)
    _build3DGrassTufts() {
        const tuftCount = 18000;

        // Natuurlijke weidehoogte (8 - 12 cm), zacht en fris
        const bladeGeo = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const colors = [];
        const indices = [];

        const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];
        const w = 0.032; // Fijne halm
        const h = 0.048; // Echte begraasde weilandzode (4.8 cm, klauwen blijven strak zichtbaar op het maaiveld)

        // Kleurverloop: van aarding/wortelgroen naar fris zonnig geelgroen op de bladtop
        const cRoot = [0.28, 0.48, 0.14]; // #477a24
        const cTip  = [0.56, 0.82, 0.26]; // #8fd142

        let vIdx = 0;
        angles.forEach(ang => {
            const cos = Math.cos(ang) * (w / 2);
            const sin = Math.sin(ang) * (w / 2);

            // Bladnormaal (loodrecht op het blad met lichte opwaartse neiging voor zonreflectie)
            const nx = -Math.sin(ang);
            const nz =  Math.cos(ang);
            const ny = 0.35;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

            // 4 vertices per blad:
            // 0: linksonder, 1: rechtsonder, 2: linksboven (gebogen), 3: rechtsboven
            positions.push(
                -cos, 0, -sin,
                 cos, 0,  sin,
                -cos * 0.4, h, -sin * 0.4,
                 cos * 0.4, h,  sin * 0.4
            );
            
            normals.push(
                nx / len, ny / len, nz / len,
                nx / len, ny / len, nz / len,
                nx / len, ny / len, nz / len,
                nx / len, ny / len, nz / len
            );

            // Kleurverloop per hoekpunt
            colors.push(
                cRoot[0], cRoot[1], cRoot[2],
                cRoot[0], cRoot[1], cRoot[2],
                cTip[0],  cTip[1],  cTip[2],
                cTip[0],  cTip[1],  cTip[2]
            );

            indices.push(
                vIdx, vIdx + 1, vIdx + 2,
                vIdx + 1, vIdx + 3, vIdx + 2
            );
            vIdx += 4;
        });

        bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        bladeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        bladeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        bladeGeo.setIndex(indices);

        // Fris, zonovergoten weidegras materiaal met natuurlijk kleurverloop
        const grassMat = new THREE.MeshLambertMaterial({
            side: THREE.DoubleSide,
            vertexColors: true,
            color: 0xffffff
        });

        this.grassInstanced = new THREE.InstancedMesh(bladeGeo, grassMat, tuftCount);
        this.grassInstanced.receiveShadow = false;
        this.grassInstanced.castShadow = false;

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        // Natuurgetrouwe kleuren van Engels raaigras, beemdgras en witte klaver
        const grassColors = [
            0x4d882c, // Rijk poldergroen
            0x5ea035, // Zomers weidegras
            0x72b842, // Fris jong blad
            0x85cc4e, // Zonnig groen
            0x98dc5a, // Zon-opgelicht bladpuntje
        ];

        // Posities van de 4 koeien om direct onder de klauwen de zode kort te houden (geen doorsnijding)
        const cowCenters = [
            { x: 0.3, z: 0.6 },
            { x: -2.6, z: -0.4 },
            { x: -0.6, z: -1.8 },
            { x: 0.9, z: 2.6 }
        ];

        let placed = 0;
        while (placed < tuftCount) {
            let r;
            if (Math.random() < 0.70) {
                // Hoge dichtheid rondom de weidezone (straal 0 tot 9 meter)
                r = Math.sqrt(Math.random()) * 9.0;
            } else {
                // Verspreid tot aan het weidehek
                r = 9.0 + Math.random() * 8.5;
            }
            const th = Math.random() * Math.PI * 2;

            const x = Math.cos(th) * r;
            const z = Math.sin(th) * r;

            // Bepaal afstand tot dichtstbijzijnde koe-staanplek
            let minCowDist = 999;
            for (const cc of cowCenters) {
                const d = Math.hypot(x - cc.x, z - cc.z);
                if (d < minCowDist) minCowDist = d;
            }

            // Onder de koeien is het gras kort vertrapt/begraasd (0.4x - 0.6x)
            let heightMult = 1.0;
            if (minCowDist < 0.9) {
                heightMult = 0.35 + minCowDist * 0.3; // 2cm kort gras onder de buik en hoeven
            } else if (minCowDist < 1.6) {
                heightMult = 0.65 + (minCowDist - 0.9) * 0.45;
            }

            const scale = 0.75 + Math.random() * 0.45;
            const rotY = Math.random() * Math.PI * 2;

            dummy.position.set(x, 0, z);
            dummy.rotation.set((Math.random() - 0.5) * 0.06, rotY, (Math.random() - 0.5) * 0.06);
            dummy.scale.set(scale, scale * heightMult * (0.85 + Math.random() * 0.25), scale);
            dummy.updateMatrix();

            this.grassInstanced.setMatrixAt(placed, dummy.matrix);

            const hex = grassColors[Math.floor(Math.random() * grassColors.length)];
            color.setHex(hex);
            this.grassInstanced.setColorAt(placed, color);

            placed++;
        }

        this.grassInstanced.instanceMatrix.needsUpdate = true;
        if (this.grassInstanced.instanceColor) {
            this.grassInstanced.instanceColor.needsUpdate = true;
        }

        this.pastureGroup.add(this.grassInstanced);
    }

    // E. Houten Weidehek & Afrastering
    _buildPastureFence(textureLoader) {
        this.fenceGroup = new THREE.Group();

        const woodTex = textureLoader.load('textures/wood_fence.jpg');
        woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
        woodTex.repeat.set(1, 2);

        const woodMat = new THREE.MeshStandardMaterial({
            map: woodTex,
            color: 0x9b8872,
            roughness: 0.88,
            metalness: 0.02
        });

        const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.25, 8);
        const railGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.8, 6);

        const postSpacing = 3.6;

        // Achterhek (Z = -13.5m)
        const zBack = -13.5;
        for (let i = -5; i <= 5; i++) {
            const x = i * postSpacing;
            const post = new THREE.Mesh(postGeo, woodMat);
            post.position.set(x, 0.6, zBack);
            post.rotation.y = Math.random() * Math.PI;
            post.castShadow = true;
            post.receiveShadow = true;
            this.fenceGroup.add(post);

            if (i < 5) {
                const rail1 = new THREE.Mesh(railGeo, woodMat);
                rail1.position.set(x + postSpacing / 2, 0.52, zBack);
                rail1.rotation.z = Math.PI / 2;
                rail1.castShadow = true;
                rail1.receiveShadow = true;
                this.fenceGroup.add(rail1);

                const rail2 = new THREE.Mesh(railGeo, woodMat);
                rail2.position.set(x + postSpacing / 2, 0.96, zBack);
                rail2.rotation.z = Math.PI / 2;
                rail2.castShadow = true;
                rail2.receiveShadow = true;
                this.fenceGroup.add(rail2);
            }
        }

        // Rechter weidegrens (X = 14.5m)
        const xRight = 14.5;
        for (let j = -3; j <= 3; j++) {
            const z = j * postSpacing;
            const post = new THREE.Mesh(postGeo, woodMat);
            post.position.set(xRight, 0.6, z);
            post.rotation.y = Math.random() * Math.PI;
            post.castShadow = true;
            post.receiveShadow = true;
            this.fenceGroup.add(post);

            if (j < 3) {
                const rail1 = new THREE.Mesh(railGeo, woodMat);
                rail1.position.set(xRight, 0.52, z + postSpacing / 2);
                rail1.rotation.x = Math.PI / 2;
                rail1.castShadow = true;
                this.fenceGroup.add(rail1);

                const rail2 = new THREE.Mesh(railGeo, woodMat);
                rail2.position.set(xRight, 0.96, z + postSpacing / 2);
                rail2.rotation.x = Math.PI / 2;
                rail2.castShadow = true;
                this.fenceGroup.add(rail2);
            }
        }

        this.pastureGroup.add(this.fenceGroup);
    }

    // F. Knotwilgen langs de weidesloot
    _buildLandscapeElements() {
        this.landscapeGroup = new THREE.Group();

        // 1. Karakteristieke Hollandse weidesloot achter het hek (Z = -15.5m)
        const ditchWaterGeo = new THREE.PlaneGeometry(120, 2.8);
        const ditchWaterMat = new THREE.MeshStandardMaterial({
            color: 0x3d6645,
            roughness: 0.4,
            metalness: 0.15
        });
        const ditchWater = new THREE.Mesh(ditchWaterGeo, ditchWaterMat);
        ditchWater.rotation.x = -Math.PI / 2;
        ditchWater.position.set(0, 0.015, -15.5);
        this.landscapeGroup.add(ditchWater);

        // Slootkant / rietkraag plukjes
        const reedGeo = new THREE.ConeGeometry(0.16, 0.75, 4);
        const reedMat = new THREE.MeshLambertMaterial({ color: 0x6e8a32 });
        for (let rx = -25; rx <= 25; rx += 2.2) {
            const reed = new THREE.Mesh(reedGeo, reedMat);
            reed.position.set(rx + (Math.random() - 0.5) * 1.2, 0.35, -14.1);
            reed.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.5, 0.8);
            this.landscapeGroup.add(reed);
        }

        // 2. Stam & takken voor knotwilgen (Salix alba)
        const trunkGeo = new THREE.CylinderGeometry(0.24, 0.34, 1.3, 8);
        const trunkMat = new THREE.MeshStandardMaterial({
            color: 0x4a3c2e,
            roughness: 0.95
        });

        const foliageGeo = new THREE.DodecahedronGeometry(1.2, 1);
        const foliageMats = [
            new THREE.MeshLambertMaterial({ color: 0x5a8338 }),
            new THREE.MeshLambertMaterial({ color: 0x689440 }),
            new THREE.MeshLambertMaterial({ color: 0x4e7230 })
        ];

        // 5 knotwilgen langs de sloot
        const willowPositions = [
            [-16, -18.5],
            [-8,  -20],
            [ 1,  -18.5],
            [ 9,  -21],
            [ 18, -19]
        ];

        willowPositions.forEach(([x, z]) => {
            const willow = new THREE.Group();

            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 0.65;
            trunk.rotation.y = Math.random() * Math.PI;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            willow.add(trunk);

            // Knotkruin bestaande uit 5 zachte bladerclusters
            for (let i = 0; i < 6; i++) {
                const mat = foliageMats[i % foliageMats.length];
                const leaf = new THREE.Mesh(foliageGeo, mat);
                leaf.position.set(
                    (Math.random() - 0.5) * 1.1,
                    1.45 + Math.random() * 0.6,
                    (Math.random() - 0.5) * 1.1
                );
                const s = 0.6 + Math.random() * 0.4;
                leaf.scale.set(s, s * 1.05, s);
                leaf.castShadow = true;
                leaf.receiveShadow = true;
                willow.add(leaf);
            }

            willow.position.set(x, 0, z);
            const scale = 0.95 + Math.random() * 0.3;
            willow.scale.set(scale, scale, scale);
            this.landscapeGroup.add(willow);
        });

        // Verre polderdijk op 60m afstand (groene horizonrug)
        const bankGeo = new THREE.CylinderGeometry(60, 60, 1.8, 32, 1, true, 0, Math.PI);
        const bankMat = new THREE.MeshStandardMaterial({
            color: 0x365a26,
            roughness: 0.92
        });
        const distantBank = new THREE.Mesh(bankGeo, bankMat);
        distantBank.position.set(0, 0.6, -18);
        distantBank.rotation.y = Math.PI * 0.5;
        this.landscapeGroup.add(distantBank);

        this.pastureGroup.add(this.landscapeGroup);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Omgevingsmodus Schakelen ('pasture' of 'studio')
    // ─────────────────────────────────────────────────────────────────────────
    setMode(mode) {
        this.mode = mode;

        if (mode === 'pasture') {
            this.pastureGroup.visible = true;
            this.studioGroup.visible = false;
            this.scene.fog = this.pastureFog;
            this.scene.background = new THREE.Color(0xa0caee); // Hollands luchtblauw als fallback
        } else {
            this.pastureGroup.visible = false;
            this.studioGroup.visible = true;
            this.scene.fog = null;
            this.scene.background = new THREE.Color(0x1a1a1a);
        }
    }

    toggleGrid(visible) {
        if (this.studioGrid) this.studioGrid.visible = visible;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Update (wind door gras en wolken)
    // ─────────────────────────────────────────────────────────────────────────
    update(dt) {
        if (this.mode !== 'pasture') return;
        this.time += dt;

        if (this.cloudsGroup) {
            this.cloudsGroup.position.x = Math.sin(this.time * 0.02) * 5;
        }

        if (this.grassInstanced) {
            this.grassInstanced.rotation.z = Math.sin(this.time * 2.0) * 0.008;
        }
    }
}
