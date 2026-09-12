/**
 * GaitController.js — Hulpklasse voor gait/lameness state
 * (Dunne wrapper rond CowBehavior.state voor de UI)
 */
export class GaitController {
    constructor(state) {
        this.state = state;
    }
    setGait(gait)   { this.state.gait = gait; }
    setLameLeg(leg) { this.state.lameLeg = leg; }
}
