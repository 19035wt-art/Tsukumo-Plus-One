import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class Enemy {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
    }

    async load() {
        const loader = new GLTFLoader();

        const gltf = await loader.loadAsync("models/enemy1.glb");

        this.model = gltf.scene;
// プレイヤーと同じ身長に調整
const targetHeight = 1.8;

let maxY = 0;
this.model.traverse((child) => {
    if (child.isMesh) {
        const boundingBox = new THREE.Box3().setFromObject(child);
        maxY = Math.max(maxY, boundingBox.max.y);
    }
});

if (maxY > 0) {
    const scale = targetHeight / maxY;
    this.model.scale.setScalar(scale);
}
        this.model.position.set(5, 0, 0);
        this.model.rotation.y = Math.PI;

        this.scene.add(this.model);
    }

    update(delta) {
        if (!this.model) return;

        // AIは後で追加
    }
}
