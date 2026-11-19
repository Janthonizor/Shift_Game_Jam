
export function createLevelData(levelTemplate) {

    return {
        id: levelTemplate.id,
        name: levelTemplate.name,

        background: {
            ...levelTemplate.background,
            texture: null
        },

        start: {
            position: { ...levelTemplate.start.position },
            speed: { ...levelTemplate.start.speed }
        },

        orbs: levelTemplate.createOrbs(),

        checkpoints: levelTemplate.checkpoints.map(
            checkpoint => ({ ...checkpoint })
        )
    };

}


