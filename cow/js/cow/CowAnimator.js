import * as THREE from 'three';
import { IKSolver } from '../utils/IKSolver.js';
import { PhysicsSpring } from '../utils/PhysicsSpring.js';

export class CowAnimator {
    constructor(rig) {
        this.rig = rig;
        this.time = 0;
        this.ikSolver = new IKSolver();
        
        this.state = {
            gait: 'idle', // idle, walk, trot, lieDown, standUp, grazing
            walkSpeed: 1.0,
            locomotionScore: 1.0, // 1-5
            lameLeg: 'FL',
            rumenFill: 0.5,
            udderFill: 0.5,
            breathingRate: 30, // bpm
            ruminating: false,
            headShake: false,
            earFlickL: false,
            earFlickR: false,
            tailSwishIntensity: 0.0,
            bellowing: false,
            defecation: false,
            estrus: false,
            heatStress: false,
            lyingFactor: 0.0 // 0=standing, 1=lying down
        };

        // Springs
        this.springs = {
            udderX: new PhysicsSpring(0, 1, 150, 10),
            udderZ: new PhysicsSpring(0, 1, 150, 10),
            tailX: new PhysicsSpring(0, 1, 80, 5),
            tailZ: new PhysicsSpring(0, 1, 80, 5)
        };
        
        // Rumen animation state
        this.ruminateCycle = 0;
        
        // IK targets
        this.legTargets = {
            FL: new THREE.Vector3(0.4, 0, 0.4),
            FR: new THREE.Vector3(-0.4, 0, 0.4),
            HL: new THREE.Vector3(0.35, 0, -0.8),
            HR: new THREE.Vector3(-0.35, 0, -0.8)
        };
        this.legPhases = { FL: 0.25, FR: 0.75, HL: 0.0, HR: 0.5 }; // Walk phase offsets
    }

    update(dt, stateParams) {
        this.time += dt;
        Object.assign(this.state, stateParams);

        // Reset poses slightly
        this.resetBasePose();

        // 1. Base breathing & Rumen
        this.updateBreathing(dt);
        this.updateRumen(dt);

        // 2. Locomotion & IK
        if (this.state.gait === 'walk' || this.state.gait === 'trot') {
            this.updateLocomotion(dt);
        } else if (this.state.gait === 'idle') {
            this.updateIdle(dt);
        }
        
        // 3. Posture adjustments (Lying, Lameness arch)
        this.updatePosture(dt);

        // 4. Micro-behaviors
        this.updateMicroBehaviors(dt);

        // 5. Spring physics (Udder, Tail)
        this.updatePhysics(dt);
    }

    resetBasePose() {
        // Reset major bones to 0 rotation before applying procedural logic
        const b = this.rig.bones;
        b.Root.position.y = 1.4;
        b.Root.rotation.set(0,0,0);
        b.Spine_Lumbar.rotation.set(0,0,0);
        b.Spine_Thoracic.rotation.set(0,0,0);
        b.Spine_Cervical.rotation.set(0,0,0);
        b.Neck.rotation.set(0,0,0);
        b.Head.rotation.set(0,0,0);
        b.Jaw.rotation.set(0,0,0);
    }

    updateBreathing(dt) {
        const freq = (this.state.breathingRate / 60) * Math.PI * 2;
        const breath = Math.sin(this.time * freq);
        
        // Expand ribs
        this.rig.bones.Spine_Thoracic.scale.set(1 + breath*0.02, 1 + breath*0.02, 1);
        
        // Heat stress modifies breathing deeply
        if (this.state.heatStress) {
            this.rig.bones.Spine_Thoracic.scale.set(1 + breath*0.05, 1 + breath*0.04, 1);
            this.rig.bones.Neck.rotation.x += 0.2; // Extended neck
            this.rig.bones.Head.rotation.x -= 0.2;
            this.rig.bones.Jaw.rotation.x = 0.3; // Mouth open
        }
    }

    updateRumen(dt) {
        // Scale rumen based on fill
        const fill = this.state.rumenFill;
        this.rig.meshParts.rumen.scale.set(0.5 + fill*0.2, 0.8 + fill*0.3, 1 + fill*0.2);

        if (this.state.ruminating) {
            this.ruminateCycle += dt;
            const chewCycle = (this.ruminateCycle % 1.0) * Math.PI * 2;
            // Jaw moves in circle
            this.rig.bones.Jaw.position.x = Math.sin(chewCycle) * 0.05;
            this.rig.bones.Jaw.position.y = Math.cos(chewCycle) * 0.02 - 0.2;
            // occasional pause/swallow logic simplified
        } else {
            this.rig.bones.Jaw.position.set(0, -0.2, 0.2);
        }
    }

    updateIdle(dt) {
        // Subtle weight shifting
        const shift = Math.sin(this.time * 0.5) * 0.02;
        this.rig.bones.Root.position.x = shift;
        this.rig.bones.Root.rotation.z = shift * 0.5;

        // Reset IK legs to default standing
        // In a full implementation, apply IK to keep feet planted
        ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
            this.rig.bones[`UpperLeg_${leg}`].rotation.set(0,0,0);
            this.rig.bones[`LowerLeg_${leg}`].rotation.set(0,0,0);
            this.rig.bones[`Pastern_${leg}`].rotation.set(0,0,0);
        });
    }

    updateLocomotion(dt) {
        const speed = this.state.walkSpeed;
        const cycleFreq = speed * 1.5;
        const phaseTime = (this.time * cycleFreq) % 1.0;
        
        const strideLength = 0.6;
        const stepHeight = 0.2;

        const isTrot = this.state.gait === 'trot';
        
        // Trot phases: diagonal pairs
        if (isTrot) {
            this.legPhases.FL = 0.0;
            this.legPhases.HR = 0.0;
            this.legPhases.FR = 0.5;
            this.legPhases.HL = 0.5;
        } else {
            // Walk: 4-beat
            this.legPhases.HL = 0.0;
            this.legPhases.FL = 0.25;
            this.legPhases.HR = 0.5;
            this.legPhases.FR = 0.75;
        }

        const ls = this.state.locomotionScore;
        const isLame = (leg) => this.state.lameLeg === leg && ls > 1;

        ['FL', 'FR', 'HL', 'HR'].forEach(leg => {
            let p = (phaseTime + this.legPhases[leg]) % 1.0;
            
            // Lame leg modifies duty cycle (shorter stance)
            let stanceThreshold = 0.6;
            if (isLame(leg)) {
                stanceThreshold = 0.4 - (ls - 1) * 0.05; // Shorter stance
            }

            let y = 0;
            let z = 0;
            
            if (p > stanceThreshold) { // Swing phase
                const swingP = (p - stanceThreshold) / (1 - stanceThreshold);
                y = Math.sin(swingP * Math.PI) * stepHeight;
                z = Math.cos(swingP * Math.PI) * (-strideLength / 2);
                if(isLame(leg) && leg.startsWith('H')) {
                    // Abduction for hind lame leg
                    const sign = leg === 'HL' ? 1 : -1;
                    this.rig.bones[`UpperLeg_${leg}`].rotation.z = Math.sin(swingP * Math.PI) * 0.2 * sign;
                }
            } else { // Stance phase
                const stanceP = p / stanceThreshold;
                y = 0;
                z = (1 - stanceP*2) * (strideLength / 2);
            }

            // Procedural forward kinematics approximation for simplicity
            // A full implementation would use the IKSolver here.
            const upper = this.rig.bones[`UpperLeg_${leg}`];
            const lower = this.rig.bones[`LowerLeg_${leg}`];
            const pastern = this.rig.bones[`Pastern_${leg}`];
            
            upper.rotation.x = -z * 1.5;
            lower.rotation.x = y > 0 ? y * 3 : 0;
            pastern.rotation.x = y > 0 ? -y * 2 : z * 0.5;
        });

        // Head bob
        if (this.state.gait === 'walk') {
            const headBob = Math.sin(phaseTime * Math.PI * 4) * 0.05;
            this.rig.bones.Neck.rotation.x = headBob;
            
            // Lameness head nod
            if (ls > 1) {
                if (this.state.lameLeg.startsWith('F')) {
                    const impactPhase = this.legPhases[this.state.lameLeg];
                    const nod = Math.sin((phaseTime - impactPhase) * Math.PI * 2);
                    if (nod > 0) this.rig.bones.Neck.rotation.x -= nod * (ls-1) * 0.05; // Head UP on lame front
                } else {
                    const impactPhase = this.legPhases[this.state.lameLeg];
                    const nod = Math.sin((phaseTime - impactPhase) * Math.PI * 2);
                    if (nod > 0) this.rig.bones.Neck.rotation.x += nod * (ls-1) * 0.05; // Head DOWN on lame hind
                }
            }
        }
        
        // Add impulses to springs
        this.springs.udderX.velocity += Math.sin(phaseTime * Math.PI * 4) * speed * 2;
        this.springs.udderZ.velocity += Math.cos(phaseTime * Math.PI * 2) * speed;
    }

    updatePosture(dt) {
        // Arched back for lameness
        if (this.state.locomotionScore > 1) {
            const arch = (this.state.locomotionScore - 1) * 0.05;
            this.rig.bones.Spine_Lumbar.rotation.x = arch;
            this.rig.bones.Spine_Thoracic.rotation.x = arch;
            this.rig.bones.Root.position.y += arch; // Compensate pelvis height
        }

        // Lying down
        if (this.state.gait === 'lieDown') {
            this.state.lyingFactor = Math.min(1, this.state.lyingFactor + dt * 0.5);
        } else if (this.state.gait === 'standUp') {
            this.state.lyingFactor = Math.max(0, this.state.lyingFactor - dt * 0.5);
        }

        if (this.state.lyingFactor > 0) {
            const f = this.state.lyingFactor;
            this.rig.bones.Root.position.y -= f * 0.9;
            this.rig.bones.UpperLeg_FL.rotation.x = f * -1.5;
            this.rig.bones.LowerLeg_FL.rotation.x = f * 2.5;
            this.rig.bones.UpperLeg_FR.rotation.x = f * -1.5;
            this.rig.bones.LowerLeg_FR.rotation.x = f * 2.5;
            this.rig.bones.UpperLeg_HL.rotation.x = f * -1.0;
            this.rig.bones.LowerLeg_HL.rotation.x = f * 2.0;
            this.rig.bones.UpperLeg_HR.rotation.x = f * -1.0;
            this.rig.bones.LowerLeg_HR.rotation.x = f * 2.0;
        }
    }

    updateMicroBehaviors(dt) {
        if (this.state.headShake) {
            this.rig.bones.Head.rotation.y = Math.sin(this.time * 20) * 0.2;
            this.rig.bones.Ear_L.rotation.z = Math.sin(this.time * 20) * 0.5;
            this.rig.bones.Ear_R.rotation.z = -Math.sin(this.time * 20) * 0.5;
        }

        if (this.state.earFlickL && !this.state.headShake) {
            this.rig.bones.Ear_L.rotation.z = Math.sin(this.time * 15) * 0.3;
        }
        if (this.state.earFlickR && !this.state.headShake) {
            this.rig.bones.Ear_R.rotation.z = -Math.sin(this.time * 15) * 0.3;
        }

        if (this.state.bellowing) {
            this.rig.bones.Head.rotation.x -= 0.3;
            this.rig.bones.Jaw.rotation.x = 0.4;
        }

        if (this.state.defecation) {
            this.rig.bones.Root.rotation.x = 0.1; // Tense hindquarters
            this.rig.bones.Tail_0.rotation.x = 0.6; // Raise tail base
        }

        if (this.state.estrus) {
            // Rigid pelvis, restless
            this.rig.bones.Root.rotation.x = -0.05; 
        }
    }

    updatePhysics(dt) {
        // Udder Fill size
        const f = this.state.udderFill;
        this.rig.meshParts.udder.scale.set(0.7 + f*0.6, 0.7 + f*0.6, 0.7 + f*0.6);

        // Update springs
        const ux = this.springs.udderX.update(dt);
        const uz = this.springs.udderZ.update(dt);
        this.rig.bones.Udder.rotation.set(uz * 0.1, 0, ux * 0.1);

        // Tail swish intensity pushes the spring target
        if (this.state.tailSwishIntensity > 0) {
            const swish = Math.sin(this.time * 5) * this.state.tailSwishIntensity * 1.5;
            this.springs.tailX.setTarget(swish);
        } else {
            this.springs.tailX.setTarget(0);
        }

        const tx = this.springs.tailX.update(dt);
        const tz = this.springs.tailZ.update(dt);

        for(let i=0; i<5; i++) {
            this.rig.bones[`Tail_${i}`].rotation.set(tz * 0.2, 0, tx * 0.2);
        }
    }
}
