
export const GameState = Object.freeze({

    MAIN_MENU: "MAIN_MENU",
    SETTINGS: "SETTINGS",

    LOADING: "LOADING",

    PLAYING: "PLAYING",
    PAUSED: "PAUSED",

    LEVEL_FAILED: "LEVEL_FAILED",
    LEVEL_COMPLETED: "LEVEL_COMPLETED"

});


export class GameStateManager {

    constructor() {

        this.current = GameState.MAIN_MENU;
        this.previous = null;

    }


    change(nextState) {

        if (this.current === nextState) {
            return;
        }

        this.previous = this.current;
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
            GameState.LEVEL_FAILED,
            GameState.LEVEL_COMPLETED
        ].includes(this.current);
    }


    returnToPrevious() {

        if (this.previous === null) {
            return;
        }

        const previous = this.previous;

        this.current = previous;
        this.previous = null;

    }

}
