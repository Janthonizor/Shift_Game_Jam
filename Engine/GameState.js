export const GameState = Object.freeze({

    MAIN_MENU: "MAIN_MENU",
    LOADING: "LOADING",

    PLAYING: "PLAYING",
    PAUSED: "PAUSED",

    LEVEL_COMPLETED: "LEVEL_COMPLETED"

});


export class GameStateManager {

    constructor() {
        this.current = GameState.MAIN_MENU;
    }

    change(nextState) {
        if (this.current === nextState) return;
        this.current = nextState;
    }

    is(state) {
        return this.current === state;
    }

    get isPlaying() {
        return this.current === GameState.PLAYING;
    }

    get hasActiveLevel() {
        return [
            GameState.PLAYING,
            GameState.PAUSED,
            GameState.LEVEL_COMPLETED,
            GameState.LOADING
        ].includes(this.current);
    }

}