import * as THREE from 'three';

export class CowMesh {
    constructor() {
        this.group = new THREE.Group();
        this.materials = {
            body: new THREE.MeshLambertMaterial({ color: 0xffffff }), // Black and white patches will be simulated
            hoof: new THREE.MeshLambertMaterial({ color: 0x111111 }),
            udder: new THREE.MeshLambertMaterial({ color: 0xffb6c1 }),
            eye: new THREE.MeshLambertMaterial({ color: 0x050505 }),
            nose: new THREE.MeshLambertMaterial({ color: 0xffc0cb })
        };
        
        // Let's create a hierarchical mesh that can be parented to bones instead of complex skin weights.
        // It's much simpler for a purely procedural segmented cow.
        
        this.parts = {};
    }

    createMeshes() {
        // Body (Capsule/Box)
        const bodyGeo = new THREE.CapsuleGeometry(0.7, 1.8, 4, 16);
        bodyGeo.rotateX(Math.PI / 2);
        this.parts.body = new THREE.Mesh(bodyGeo, this.materials.body);

        // Rumen bulge (Sphere)
        const rumenGeo = new THREE.SphereGeometry(0.6, 16, 16, 0, Math.PI, 0, Math.PI);
        this.parts.rumen = new THREE.Mesh(rumenGeo, this.materials.body);
        this.parts.rumen.scale.set(0.5, 0.8, 1);
        
        // Neck
        const neckGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 12);
        this.parts.neck = new THREE.Mesh(neckGeo, this.materials.body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.4, 0.5, 0.6);
        this.parts.head = new THREE.Mesh(headGeo, this.materials.body);

        // Muzzle
        const muzzleGeo = new THREE.BoxGeometry(0.38, 0.3, 0.4);
        this.parts.muzzle = new THREE.Mesh(muzzleGeo, this.materials.nose);

        // Ears
        const earGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
        this.parts.earL = new THREE.Mesh(earGeo, this.materials.body);
        this.parts.earR = new THREE.Mesh(earGeo, this.materials.body);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
        this.parts.eyeL = new THREE.Mesh(eyeGeo, this.materials.eye);
        this.parts.eyeR = new THREE.Mesh(eyeGeo, this.materials.eye);

        // Udder
        const udderGeo = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        this.parts.udder = new THREE.Mesh(udderGeo, this.materials.udder);
        this.parts.udder.scale.set(1, 0.8, 1);
        this.parts.udder.rotation.x = Math.PI; // point down

        // Teats
        const teatGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.15, 8);
        for(let i=0; i<4; i++) {
            this.parts['teat'+i] = new THREE.Mesh(teatGeo, this.materials.udder);
        }

        // Tail
        const tailSegGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.3, 8);
        for(let i=0; i<5; i++) {
            this.parts['tail'+i] = new THREE.Mesh(tailSegGeo, this.materials.body);
        }

        // Legs
        const upperLegGeo = new THREE.CylinderGeometry(0.15, 0.1, 0.6, 8);
        const lowerLegGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.5, 8);
        const pasternGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.2, 8);
        const hoofGeo = new THREE.BoxGeometry(0.14, 0.1, 0.16);
        
        ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
            this.parts['upperLeg'+leg] = new THREE.Mesh(upperLegGeo, this.materials.body);
            this.parts['lowerLeg'+leg] = new THREE.Mesh(lowerLegGeo, this.materials.body);
            this.parts['pastern'+leg] = new THREE.Mesh(pasternGeo, this.materials.body);
            this.parts['hoof'+leg] = new THREE.Mesh(hoofGeo, this.materials.hoof);
        });

        // Set shadows
        Object.values(this.parts).forEach(mesh => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        });

        return this.parts;
    }
}
