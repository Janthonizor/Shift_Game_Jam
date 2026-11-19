
export function createLevelData(definition) {

    return {
        id: definition.id,
        name: definition.name,

        background: {
            ...definition.background,
            texture: null
        },

        start: {
            position: { ...definition.start.position },
            speed: { ...definition.start.speed }
        },

        orbs: definition.createOrbs(),

        checkpoints: definition.checkpoints.map(
            checkpoint => ({ ...checkpoint })
        )
    };

}
