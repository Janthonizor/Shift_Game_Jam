
import { GameState } from "../Engine/GameState.js";

export const ButtonLayouts = {

    [GameState.MAIN_MENU]: {

        topLeft: {
            icon: "play",
            action: "startLevel"
        },

        topRight: {
            icon: "settings",
            action: "toggleSettings"
        },

        bottomLeft: {
            icon: "previous",
            action: "previousMenu"
        },

        bottomRight: {
            icon: "next",
            action: "nextMenu"
        }

    },

    [GameState.PLAYING]: {

        topLeft: {
            icon: "menu",
            action: "openMenu"
        },

        topRight: {
            icon: "settings",
            action: "toggleSettings"
        },

        bottomLeft: {
            icon: "restart",
            action: "restartLevel"
        },

        bottomRight: {
            icon: "pause",
            action: "pause"
        }

    },

    [GameState.PAUSED]: {

        topLeft: {
            icon: "menu",
            action: "openMenu"
        },

        topRight: {
            icon: "settings",
            action: "toggleSettings"
        },

        bottomLeft: {
            icon: "restart",
            action: "restartLevel"
        },

        bottomRight: {
            icon: "play",
            action: "resume"
        }

    },

    [GameState.LEVEL_COMPLETED]: {

        topLeft: {
            icon: "menu",
            action: "openMenu"
        },

        topRight: {
            icon: "settings",
            action: "toggleSettings"
        },

        bottomLeft: {
            icon: "restart",
            action: "restartLevel"
        },

        bottomRight: {
            icon: "next",
            action: "nextLevel"
        }

    },

    [GameState.LOADING]: {}

};

