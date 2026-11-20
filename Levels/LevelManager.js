export class LevelManager {

    constructor(levels) {
        this.levels = levels;
        this.currentLevelId = null;

        // First level is unlocked by default.
        this.unlockedLevelIds = new Set(
            levels.length > 0 ? [levels[0].id] : []
        );
        this.completedLevelIds = new Set();
    }


    createLevel(id) {

        const level = this.getLevel(id);

        if (!level || !this.isUnlocked(id)) {
            return null;
        }

        return {
            id: level.id,
            name: level.name,

            background: {
                ...level.background,
                texture: null
            },

            start: {
                position: { ...level.start.position },
                speed: { ...level.start.speed }
            },

            orbs: level.orbs.map(orb => ({
                ...orb,
                inRange: false,
                alignment: 0,
                spinAngle: 0,
                engagedOnce: false
            })),

            checkpoint_position: [...level.checkpoint_position],
            checkpoint_radius: level.checkpoint_radius
        };
    }


    getLevel(id) {
        return this.levels.find(level => level.id === id) ?? null;
    }

    isUnlocked(id) {
        return this.unlockedLevelIds.has(id);
    }

    isCompleted(id) {
        return this.completedLevelIds.has(id);
    }

    completeLevel(id) {

        if (!this.getLevel(id)) return false;
        if (this.isCompleted(id)) return false;

        this.completedLevelIds.add(id);

        const nextLevelId = this.getNextLevelId();

        if (nextLevelId !== null) {
            this.unlockLevel(nextLevelId);
        }

        return true;
    }

    unlockLevel(id) {

        if (!this.getLevel(id)) return false;

        this.unlockedLevelIds.add(id);
        return true;
    }

    setCurrentLevel(id) {

        if (!this.getLevel(id) || !this.isUnlocked(id)) {
            return false;
        }

        this.currentLevelId = id;
        return true;
    }

    getNextLevelId() {

        const index = this.levels.findIndex(
            level => level.id === this.currentLevelId
        );

        if (index === -1) return null;

        return this.levels[index + 1]?.id ?? null;
    }

    areAllOrbsEngaged(level) {
        return level.orbs.every(orb => orb.engagedOnce);
    }

}

