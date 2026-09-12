import * as THREE from 'three';

export class CowRig {
    constructor(meshParts) {
        this.bones = {};
        this.rootGroup = new THREE.Group();
        this.meshParts = meshParts;
        this.buildRig();
        this.attachMeshes();
    }

    createBone(name, parent, position) {
        const bone = new THREE.Bone();
        bone.name = name;
        bone.position.copy(position);
        if (parent) {
            parent.add(bone);
        }
        this.bones[name] = bone;
        return bone;
    }

    buildRig() {
        // Root (Pelvis/Mid spine)
        const root = this.createBone('Root', null, new THREE.Vector3(0, 1.4, 0));
        this.rootGroup.add(root);

        // Spine chain
        const spineL = this.createBone('Spine_Lumbar', root, new THREE.Vector3(0, 0, 0.4));
        const spineT = this.createBone('Spine_Thoracic', spineL, new THREE.Vector3(0, 0, 0.5));
        const spineC = this.createBone('Spine_Cervical', spineT, new THREE.Vector3(0, 0, 0.5));
        
        // Neck & Head
        const neck = this.createBone('Neck', spineC, new THREE.Vector3(0, 0.3, 0.4));
        const head = this.createBone('Head', neck, new THREE.Vector3(0, 0.4, 0.3));
        this.createBone('Jaw', head, new THREE.Vector3(0, -0.2, 0.2));
        this.createBone('Ear_L', head, new THREE.Vector3(0.2, 0.2, -0.1));
        this.createBone('Ear_R', head, new THREE.Vector3(-0.2, 0.2, -0.1));

        // Front Legs
        const scapulaL = this.createBone('Scapula_L', spineT, new THREE.Vector3(0.4, 0, 0));
        const scapulaR = this.createBone('Scapula_R', spineT, new THREE.Vector3(-0.4, 0, 0));
        
        this.buildLegChain('FL', scapulaL, new THREE.Vector3(0, -0.3, 0));
        this.buildLegChain('FR', scapulaR, new THREE.Vector3(0, -0.3, 0));

        // Hind Legs
        const hipL = this.createBone('Hip_L', root, new THREE.Vector3(0.35, 0, -0.4));
        const hipR = this.createBone('Hip_R', root, new THREE.Vector3(-0.35, 0, -0.4));
        
        this.buildLegChain('HL', hipL, new THREE.Vector3(0, -0.3, 0));
        this.buildLegChain('HR', hipR, new THREE.Vector3(0, -0.3, 0));

        // Tail
        let currentTail = root;
        for (let i = 0; i < 5; i++) {
            const zOff = i === 0 ? -0.8 : -0.25;
            const yOff = i === 0 ? 0.1 : -0.1;
            currentTail = this.createBone(`Tail_${i}`, currentTail, new THREE.Vector3(0, yOff, zOff));
        }

        // Udder
        const udder = this.createBone('Udder', root, new THREE.Vector3(0, -0.4, -0.2));
        this.createBone('Teat_0', udder, new THREE.Vector3(0.1, -0.2, 0.1));
        this.createBone('Teat_1', udder, new THREE.Vector3(-0.1, -0.2, 0.1));
        this.createBone('Teat_2', udder, new THREE.Vector3(0.1, -0.2, -0.1));
        this.createBone('Teat_3', udder, new THREE.Vector3(-0.1, -0.2, -0.1));
    }

    buildLegChain(suffix, parent, startOffset) {
        const upper = this.createBone(`UpperLeg_${suffix}`, parent, startOffset);
        const lower = this.createBone(`LowerLeg_${suffix}`, upper, new THREE.Vector3(0, -0.5, 0));
        const pastern = this.createBone(`Pastern_${suffix}`, lower, new THREE.Vector3(0, -0.4, 0));
        this.createBone(`Hoof_${suffix}`, pastern, new THREE.Vector3(0, -0.15, 0.05));
    }

    attachMeshes() {
        // Because we are using segmented rigid meshes instead of skin weights for simplicity,
        // we add the mesh parts as children to the bones.
        
        const b = this.bones;
        const p = this.meshParts;

        // Offset meshes relative to bones to align pivots
        b.Root.add(p.body);
        
        b.Spine_Lumbar.add(p.rumen);
        p.rumen.position.set(0.4, -0.2, 0); // left flank

        b.Neck.add(p.neck);
        p.neck.position.set(0, 0.2, 0.15);
        p.neck.rotation.x = Math.PI / 4;

        b.Head.add(p.head);
        p.head.position.set(0, 0.1, 0.1);

        b.Jaw.add(p.muzzle);
        p.muzzle.position.set(0, 0, 0.2);

        b.Ear_L.add(p.earL);
        p.earL.position.set(0.2, 0, 0);
        b.Ear_R.add(p.earR);
        p.earR.position.set(-0.2, 0, 0);
        
        b.Head.add(p.eyeL);
        p.eyeL.position.set(0.2, 0.2, 0.2);
        b.Head.add(p.eyeR);
        p.eyeR.position.set(-0.2, 0.2, 0.2);

        b.Udder.add(p.udder);
        for(let i=0; i<4; i++) {
            b['Teat_'+i].add(p['teat'+i]);
            p['teat'+i].position.y = -0.07;
        }

        for(let i=0; i<5; i++) {
            b['Tail_'+i].add(p['tail'+i]);
            p['tail'+i].position.set(0, -0.15, 0);
        }

        ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
            b['UpperLeg_'+leg].add(p['upperLeg'+leg]);
            p['upperLeg'+leg].position.y = -0.25;

            b['LowerLeg_'+leg].add(p['lowerLeg'+leg]);
            p['lowerLeg'+leg].position.y = -0.2;

            b['Pastern_'+leg].add(p['pastern'+leg]);
            p['pastern'+leg].position.y = -0.1;

            b['Hoof_'+leg].add(p['hoof'+leg]);
            p['hoof'+leg].position.set(0, -0.05, 0);
        });
    }

    getSkeleton() {
        // Optional if you actually use SkinnedMesh, but since we parent objects to bones directly,
        // returning the root group is enough to add to the scene.
        return this.rootGroup;
    }
}
