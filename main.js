import { Renderer } from "./Rendering/Renderer.js";
import { Game } from "./Engine/Game.js";


const canvas = document.getElementById("gameCanvas");

const renderer = new Renderer(canvas);

const game = new Game(renderer);

game.start().catch(console.error);
