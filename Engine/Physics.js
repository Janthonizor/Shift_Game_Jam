
export class Physics {

    constructor() {
        this.orb_capture_distance = null;
        this.engagedOrb = null;
        this.springCaptureMultiplier = 0.2;
        this.springStiffness = 4000;
        this.tangentialOrbForce = 40000;
        this.springDamping = 2000;

    }

    calculateOrbForce(player, orb) {

        const dx = orb.x - player.x;
        const dy = orb.y - player.y;

        const distance = Math.hypot(dx, dy);

        if (distance === 0) return { fx: 0, fy: 0 };

        // Radial direction
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Tangential direction
        const rotation = dirX * player.vy - dirY * player.vx;

        const direction = rotation >= 0 ? 1 : -1;

        const tangentX = -dirY * direction;
        const tangentY = dirX * direction;

        // Force magnitudes
        const springStiffness = this.springStiffness;

        // Spring force
        const stretch = distance - this.orb_capture_distance;
        const radialVelocity = player.vx * dirX + player.vy * dirY;

        const spring = springStiffness * stretch;
        const damper = this.springDamping * radialVelocity;

        const radialForce = spring - damper;

        const tangentialMultiplier = Math.min(
            1.0 / (distance**2)*100000,
            3
        );
        console.log("distance ratio:", this.orb_capture_distance / distance);

        const tangentialForce =
            this.tangentialOrbForce * tangentialMultiplier;
        
        console.log("orb capture distance:", this.orb_capture_distance);
        console.log("Tangential force:", tangentialForce);
        console.log("tangential multiplier:", tangentialMultiplier);
        return {
            fx: dirX * radialForce + tangentX *tangentialForce,
            fy: dirY * radialForce + tangentY * tangentialForce
        };

    }

    captureOrb(player, orbs) {

        if (this.engagedOrb !== null) return;
        if (orbs.length === 0) return;

        let closestOrb = null;
        let closestDistanceSquared = Infinity;

        for (const entry of orbs) {

            const distanceSquared = entry.distanceSquared;

            if (distanceSquared < closestDistanceSquared) {
                closestDistanceSquared = distanceSquared;
                closestOrb = entry.orb;
            }

        }

        if (closestOrb === null) return;

        this.engagedOrb = closestOrb;
        player.engaged = true;
        player.engagedOrb = this.engagedOrb;

        this.orb_capture_distance =
            Math.sqrt(closestDistanceSquared) * this.springCaptureMultiplier;

    }

    disengageOrb(player) {

        this.engagedOrb = null;
        this.orb_capture_distance = null;
        this.orbitDirection = 0;
        player.engaged = false;
        player.engagedOrb = null;

    }


    updatePlayer(player, input, orbs, dt) {

        let inputX = 0;
        let inputY = 0;

        if (input.a) inputX -= 1;
        if (input.d) inputX += 1;
        if (input.w) inputY += 1;
        if (input.s) inputY -= 1;
        if (input.shift && this.engagedOrb == null) {
            this.captureOrb(player, orbs);
            //console.log("Captured orb:", this.engagedOrb);
        }
        if (!input.shift && this.engagedOrb !== null) {
            this.disengageOrb(player);
        }
        

        

        // Rotate input into the player's direction of travel
        const direction = player.direction ?? 0;


        const cos = Math.cos(direction);
        const sin = Math.sin(direction);
        

        const rotatedInputX = inputY * cos - inputX * sin * 5;
        const rotatedInputY = inputY * sin + inputX * cos * 5;

        inputX = rotatedInputX;
        inputY = rotatedInputY;

        let orbForceX = 0;
        let orbForceY = 0;

        if (this.engagedOrb) {

            const orbForce = this.calculateOrbForce(
                player,
                this.engagedOrb
            );

            orbForceX = orbForce.fx;
            orbForceY = orbForce.fy;

        }
        /*
        console.log("Orb force:", {
            fx: orbForceX,
            fy: orbForceY
        });
        */

        const forceX = inputX * player.moveForce;
        const forceY = inputY * player.moveForce;

        const dragX = -player.vx * player.drag;
        const dragY = -player.vy * player.drag;

        player.ax = (forceX + dragX + orbForceX) / player.mass;
        player.ay = (forceY + dragY + orbForceY) / player.mass;

        player.vx += player.ax * dt;
        player.vy += player.ay * dt;
        player.speed = Math.hypot(player.vx, player.vy);

        player.rippleDistance += player.speed/20 * dt;

        // calculate direction of motion
        player.direction = Math.atan2(player.vy, player.vx);

        player.x += player.vx * dt;
        player.y += player.vy * dt;
    }


    constrainPlayer(player, bounds) {

        const radius = player.width / 2;

        const minX = bounds.x - bounds.width / 2 + radius;
        const maxX = bounds.x + bounds.width / 2 - radius;

        const minY = bounds.y - bounds.height / 2 + radius;
        const maxY = bounds.y + bounds.height / 2 - radius;

        // Left boundary
        if (player.x < minX) {
            player.x = minX;
            player.vx = Math.abs(player.vx) * player.bounciness;
        }

        // Right boundary
        if (player.x > maxX) {
            player.x = maxX;
            player.vx = -Math.abs(player.vx) * player.bounciness;
        }

        // Top boundary
        if (player.y < minY) {
            player.y = minY;
            player.vy = Math.abs(player.vy) * player.bounciness;
        }

        // Bottom boundary
        if (player.y > maxY) {
            player.y = maxY;
            player.vy = -Math.abs(player.vy) * player.bounciness;
        }
    }

    update(player, input, bounds, orbs, dt) {
        this.updatePlayer(player, input, orbs, dt);
        this.constrainPlayer(player, bounds);

    }

}
