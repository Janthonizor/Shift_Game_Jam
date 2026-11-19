export class LevelManager {

    constructor(levels) {
        this.levels = levels;
        this.currentLevelId = null;

        // First level is unlocked by default.
        this.unlockedLevelIds = new Set(
            levels.length > 0 ? [levels[0].id] : []
        );
    }

    getLevel(id) {
        return this.levels.find(level => level.id === id) ?? null;
    }

    isUnlocked(id) {
        return this.unlockedLevelIds.has(id);
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

}