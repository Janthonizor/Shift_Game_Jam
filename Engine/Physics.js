
export class Physics {

    constructor() {

        this.orb_capture_distance = null;
        this.engagedOrb = null;

        this.springCaptureMultiplier = 0.2;
        this.springStiffness = 8000;
        this.orbTorque = 20000000;
        this.springDamping = 2000;

        this.checkpointDistance = Infinity;

        this.checkpointing = false;
        this.checkpointComplete = false;

        // Initial spring rest length = 10% of checkpoint radius
        this.checkpointSpringStart = 0.1;

        // How quickly the spring contracts toward zero
        this.checkpointContractionRate = 2.0;

        // Spring and damping
        this.checkpointSpringStiffness = 20000;
        this.checkpointSpringDamping = 6000;
        this.checkpointTangentialDamping = 8000;

        // Completion conditions
        this.checkpointCompleteDistance = 1.0;
        this.checkpointCompleteSpeed = 2.0;

        this.checkpointSpringLength = 0;
    }


    calculateOrbForce(player, orb, dt) {

        const dx = orb.x - player.x;
        const dy = orb.y - player.y;

        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
            return { fx: 0, fy: 0 };
        }

        const dirX = dx / distance;
        const dirY = dy / distance;

        const tangentX = -dirY;
        const tangentY = dirX;

        const stretch = distance - this.orb_capture_distance;

        const radialVelocity =
            player.vx * dirX + player.vy * dirY;

        const spring = this.springStiffness * stretch;
        const damper = this.springDamping * radialVelocity;

        const radialForce = spring - damper;

        const tangentialVelocity =
            player.vx * tangentX + player.vy * tangentY;

        const angularVelocity = tangentialVelocity / distance;

        const momentOfInertia = player.mass * distance ** 2;

        const torque =
            Math.sign(angularVelocity) * this.orbTorque;

        const angularAcceleration = torque / momentOfInertia;

        const newAngularVelocity =
            angularVelocity + angularAcceleration * dt;

        const tangentialAcceleration =
            (newAngularVelocity - angularVelocity) * distance / dt;

        const tangentialForce =
            tangentialAcceleration * player.mass;

        return {
            fx: dirX * radialForce + tangentX * tangentialForce,
            fy: dirY * radialForce + tangentY * tangentialForce
        };
    }


    captureOrb(player, orbs) {

        if (this.checkpointing) return;
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
        this.engagedOrb.engagedOnce = true;

        player.engaged = true;
        player.engagedOrb = this.engagedOrb;

        this.orb_capture_distance =
            Math.sqrt(closestDistanceSquared) *
            this.springCaptureMultiplier;
    }


    disengageOrb(player) {

        this.engagedOrb = null;
        this.orb_capture_distance = null;
        this.orbitDirection = 0;

        player.engaged = false;
        player.engagedOrb = null;
    }


    beginCheckpoint(player, checkpointPosition, checkpointRadius, checkpointUnlocked) {

        if (this.checkpointing) return;
        if (!checkpointPosition) return;
        if (!checkpointUnlocked) return;

        const dx = checkpointPosition[0] - player.x;
        const dy = checkpointPosition[1] - player.y;

        const centerDistance = Math.hypot(dx, dy);

        this.checkpointDistance = Math.max(
            0,
            centerDistance - player.radius
        );

        // Activate when the player's edge enters the radius
        if (this.checkpointDistance <= checkpointRadius) {

            this.checkpointing = true;

            // Initialize contracting spring
            this.checkpointSpringLength =
                checkpointRadius * this.checkpointSpringStart;

            // Immediately release any engaged orb
            this.disengageOrb(player);
        }
    }


    updateCheckpointHoming(player, checkpointPosition, dt) {

        const dx = checkpointPosition[0] - player.x;
        const dy = checkpointPosition[1] - player.y;

        const distance = Math.hypot(dx, dy);

        if (distance > 0.0001) {

            const dirX = dx / distance;
            const dirY = dy / distance;

            // Contract the spring rest length toward zero
            this.checkpointSpringLength *= Math.exp(
                -this.checkpointContractionRate * dt
            );

            // Spring extension
            const stretch = Math.max(
                0,
                distance - this.checkpointSpringLength
            );

            // Spring force
            const springForce =
                this.checkpointSpringStiffness * stretch;

            // Project velocity along the spring direction
            const radialVelocity =
                player.vx * dirX + player.vy * dirY;

            const tangentX = -dirY;
            const tangentY = dirX;

            const tangentialVelocity =
                player.vx * tangentX + player.vy * tangentY;

            // Contract spring rest length
            this.checkpointSpringLength *= Math.exp(
                -this.checkpointContractionRate * dt
            );

            const radialDamping =
                this.checkpointSpringDamping * radialVelocity;

            const radialForce = springForce - radialDamping;

            // Tangential damping
            const tangentialForce =
                -this.checkpointTangentialDamping * tangentialVelocity;

            // Combine forces
            const forceX =
                dirX * radialForce +
                tangentX * tangentialForce;

            const forceY =
                dirY * radialForce +
                tangentY * tangentialForce;

            player.ax = forceX / player.mass;
            player.ay = forceY / player.mass;

            player.ax = forceX / player.mass;
            player.ay = forceY / player.mass;

        } else {

            player.ax = 0;
            player.ay = 0;
        }

        // Integrate velocity
        player.vx += player.ax * dt;
        player.vy += player.ay * dt;

        // Limit checkpoint capture speed
        const speed = Math.hypot(player.vx, player.vy);

        if (speed > player.maxSpeed) {

            const scale = player.maxSpeed / speed;

            player.vx *= scale;
            player.vy *= scale;
        }

        player.speed = Math.hypot(player.vx, player.vy);

        player.rippleDistance += player.speed / 20 * dt;

        if (player.speed > 0.001) {
            player.direction = Math.atan2(player.vy, player.vx);
        }

        // Integrate position
        player.x += player.vx * dt;
        player.y += player.vy * dt;

        this.checkpointDistance = Math.hypot(
            checkpointPosition[0] - player.x,
            checkpointPosition[1] - player.y
        );
    }


    updatePlayer(player, input, orbs, dt) {

        // Checkpoint capture takes complete control of movement
        if (this.checkpointing) {
            return;
        }

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

        const rotatedInputX =
            inputY * cos - inputX * sin * 5;

        const rotatedInputY =
            inputY * sin + inputX * cos * 5;

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

        player.ax = (
            forceX + dragX + orbForceX
        ) / player.mass;

        player.ay = (
            forceY + dragY + orbForceY
        ) / player.mass;

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

        const radius = player.radius;

        const minX = bounds.x - bounds.width / 2 + radius;
        const maxX = bounds.x + bounds.width / 2 - radius;

        const minY = bounds.y - bounds.height / 2 + radius;
        const maxY = bounds.y + bounds.height / 2 - radius;

        if (player.x < minX) {
            player.x = minX;
            player.vx = Math.abs(player.vx) * player.bounciness;
        }

        if (player.x > maxX) {
            player.x = maxX;
            player.vx = -Math.abs(player.vx) * player.bounciness;
        }

        if (player.y < minY) {
            player.y = minY;
            player.vy = Math.abs(player.vy) * player.bounciness;
        }

        if (player.y > maxY) {
            player.y = maxY;
            player.vy = -Math.abs(player.vy) * player.bounciness;
        }
    }


    resetCheckpoint() {

        this.checkpointing = false;
        this.checkpointComplete = false;

        this.checkpointDistance = Infinity;
        this.checkpointSpringLength = 0;
    }


    update(
        player,
        input,
        bounds,
        orbs,
        dt,
        checkpointPosition,
        checkpointRadius,
        checkpointUnlocked
    ) {

        if (this.checkpointComplete) {
            return true;
        }

        // Detect checkpoint entry before normal movement
        this.beginCheckpoint(
            player,
            checkpointPosition,
            checkpointRadius,
            checkpointUnlocked
        );

        // Normal movement or checkpoint homing
        if (this.checkpointing) {

            this.updateCheckpointHoming(
                player,
                checkpointPosition,
                dt
            );

        } else {

            this.updatePlayer(
                player,
                input,
                orbs,
                dt
            );
        }

        this.constrainPlayer(player, bounds);

        if (!this.checkpointing) {
            return false;
        }

        // Center-to-center completion check
        const dx = checkpointPosition[0] - player.x;
        const dy = checkpointPosition[1] - player.y;

        const distance = Math.hypot(dx, dy);
        const speed = Math.hypot(player.vx, player.vy);

        this.checkpointDistance = distance;

        if (
            distance <= this.checkpointCompleteDistance &&
            speed <= this.checkpointCompleteSpeed
        ) {

            player.x = checkpointPosition[0];
            player.y = checkpointPosition[1];

            player.vx = 0;
            player.vy = 0;
            player.ax = 0;
            player.ay = 0;
            player.speed = 0;

            this.checkpointComplete = true;

            return true;
        }

        return false;
    }
}
