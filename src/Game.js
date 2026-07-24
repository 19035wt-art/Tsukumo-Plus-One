
import * as THREE from "three";
import GameCamera from "./Camera.js";
import Player from "./Player.js";
import Input from "./Input.js";
import World from "./World.js";

export default class Game {

    constructor() {

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        this.camera.position.set(0, 2, 5);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.renderer.shadowMap.enabled = true;

        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.input = new Input();

    }

    async init() {

        this.world = new World(this.scene);

        this.player = new Player(this.scene);

        await this.player.load();
        this.cameraController =
            new GameCamera(
                this.camera,
                this.player
            );
        this.animate();

    }

    animate = () => {

        requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();
        this.player.move(

            this.input.x,
            this.input.y,
            delta,
            this.cameraController.yaw,
            this.input.dash

        );

        this.player.update(delta);

        this.cameraController.update(this.input);
        this.renderer.render(
            this.scene,
            this.camera
        );

    }

}