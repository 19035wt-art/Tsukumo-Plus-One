import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Enemy {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
    }

    async load() {
        const loader = new GLTFLoader();

        const gltf = await loader.loadAsync("models/enemy1.glb");

        this.model = gltf.scene;

        this.model.position.set(5, 0, 0);
        this.model.rotation.y = Math.PI;

        this.scene.add(this.model);
    }

    update(delta) {
        if (!this.model) return;

        // AIは後で追加
    }
}
