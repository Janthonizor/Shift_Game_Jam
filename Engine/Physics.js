
export class Physics {

    constructor() {
        this.orb_capture_distance = null;
        this.engagedOrb = null;

        this.springCaptureMultiplier = 0.2;
        this.springStiffness = 8000;
        this.orbTorque = 20000000;
        this.springDamping = 700;
    }


    calculateOrbForce(player, orb, dt) {

        const dx = orb.x - player.x;
        const dy = orb.y - player.y;

        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
            return { fx: 0, fy: 0 };
        }

        // Radial direction
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Fixed tangential direction
        const tangentX = -dirY;
        const tangentY = dirX;

        // Radial spring
        const stretch = distance - this.orb_capture_distance;
        const radialVelocity = player.vx * dirX + player.vy * dirY;

        const spring = this.springStiffness * stretch;
        const damper = this.springDamping * radialVelocity;

        const radialForce = spring - damper;

        // Orb motor
        const tangentialVelocity =
            player.vx * tangentX + player.vy * tangentY;

        const angularVelocity = tangentialVelocity / distance;

        const momentOfInertia = player.mass * distance ** 2;

        const torque = Math.sign(angularVelocity) * this.orbTorque;

        const angularAcceleration = torque / momentOfInertia;

        const newAngularVelocity =
            angularVelocity + angularAcceleration * dt;

        const tangentialAcceleration =
            (newAngularVelocity - angularVelocity) * distance / dt;

        const tangentialForce = tangentialAcceleration * player.mass;

        return {
            fx: dirX * radialForce + tangentX * tangentialForce,
            fy: dirY * radialForce + tangentY * tangentialForce,
            radialForce,
            tangentialForce,
            radialVelocity,
            angularVelocity,
            torque,
            distance
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
        }

        if (!input.shift && this.engagedOrb !== null) {
            this.disengageOrb(player);
        }

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
                this.engagedOrb,
                dt
            );

            orbForceX = orbForce.fx;
            orbForceY = orbForce.fy;

        }

        const forceX = inputX * player.moveForce;
        const forceY = inputY * player.moveForce;

        const dragX = -player.vx * player.drag;
        const dragY = -player.vy * player.drag;

        player.ax = (forceX + dragX + orbForceX) / player.mass;
        player.ay = (forceY + dragY + orbForceY) / player.mass;

        player.vx += player.ax * dt;
        player.vy += player.ay * dt;
        // Clamp maximum speed
        const speed = Math.hypot(player.vx, player.vy);

        if (speed > player.maxSpeed) {
            const scale = player.maxSpeed / speed;
            player.vx *= scale;
            player.vy *= scale;
        }


        player.speed = Math.hypot(player.vx, player.vy);

        player.rippleDistance += player.speed / 20 * dt;

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
