/**
 * PhysicsSpring.js — Enkelvoudige veer-demper (mass-spring-damper systeem)
 *
 * Wordt gebruikt voor:
 *   - Uier: secundaire beweging (slingering) synchroon met loopsnelheid
 *   - Staart: veer-ketting (5 segmenten)
 *   - Oren: snelle terugveer na flikkering
 *   - Pens: langzame uitzetting/inkrimping (0.05 Hz)
 *
 * Formule:
 *   F_spring  = -k * (currentValue - targetValue)
 *   F_damping = -c * velocity
 *   acceleration = (F_spring + F_damping) / mass
 *   velocity += acceleration * dt
 *   currentValue += velocity * dt
 *
 * Parameters:
 *   @param {number} targetValue  - rustpositie
 *   @param {number} mass         - massa (kg, schaal)
 *   @param {number} stiffness    - veerconstante k
 *   @param {number} damping      - dempingscoëfficiënt c
 *
 * Richtwaarden:
 *   Uier (los, schommelend):   stiffness=120, damping=12, mass=1
 *   Staart (vloeiend):         stiffness=60,  damping=5,  mass=1
 *   Oor (snel):                stiffness=200, damping=15, mass=1
 *   Pens (traag):              stiffness=20,  damping=8,  mass=1
 */
export class PhysicsSpring {
    constructor(targetValue = 0, mass = 1, stiffness = 100, damping = 10) {
        this.targetValue  = targetValue;
        this.currentValue = targetValue;
        this.velocity     = 0;
        this.mass         = Math.max(0.001, mass);
        this.stiffness    = stiffness;
        this.damping      = damping;
    }

    setTarget(target) {
        this.targetValue = target;
    }

    /** Voegt een impuls toe (instantane snelheidsverandering) */
    addImpulse(impulse) {
        this.velocity += impulse / this.mass;
    }

    /**
     * Update de veer met tijdstap dt.
     * @param  {number} dt  tijdstap in seconden
     * @returns {number}    huidige waarde
     */
    update(dt) {
        if (dt <= 0 || dt > 0.1) return this.currentValue; // sla vreemde dt's over

        // Halve-stap Euler integratie (stabiele dan gewone forward Euler)
        const displacement = this.currentValue - this.targetValue;
        const springForce  = -this.stiffness * displacement;
        const dampForce    = -this.damping * this.velocity;
        const acceleration = (springForce + dampForce) / this.mass;

        this.velocity     += acceleration * dt;
        this.currentValue += this.velocity * dt;

        return this.currentValue;
    }

    /** Reset naar rust */
    reset() {
        this.currentValue = this.targetValue;
        this.velocity = 0;
    }
}
