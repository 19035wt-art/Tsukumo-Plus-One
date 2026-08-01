import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class Enemy {

    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.isAlive = true;
        this._hbTexture = null;
        this._hbCtx = null;
    }

    async load() {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync("/models/enemy1.glb");

        this.model = gltf.scene;

        // プレイヤーと同じ身長に調整
        const targetHeight = 1.8;
        let maxY = 0;
        this.model.traverse((child) => {
            if (child.isMesh) {
                const bb = new THREE.Box3().setFromObject(child);
                maxY = Math.max(maxY, bb.max.y);
            }
        });
        if (maxY > 0) {
            this.model.scale.setScalar(targetHeight / maxY);
        }

        this.model.position.set(5, 0, 0);
        this.model.rotation.y = Math.PI;
        this.scene.add(this.model);

        this._createHealthBar();
    }

    // 頭上に Sprite で HP バーを表示
    _createHealthBar() {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 16;
        this._hbCtx = canvas.getContext("2d");
        this._hbTexture = new THREE.CanvasTexture(canvas);

        const mat = new THREE.SpriteMaterial({
            map: this._hbTexture,
            depthTest: false,   // 壁越しでも常に表示
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1.6, 0.2, 1);

        // モデルの高さの少し上に配置
        const box = new THREE.Box3().setFromObject(this.model);
        sprite.position.set(0, (box.max.y - box.min.y) + 0.35, 0);

        this.model.add(sprite);
        this._healthBarSprite = sprite;
        this._redrawHealthBar();
    }

    _redrawHealthBar() {
        const ctx = this._hbCtx;
        const w = 128, h = 16;
        const ratio = Math.max(0, this.currentHealth / this.maxHealth);

        ctx.clearRect(0, 0, w, h);

        // 背景
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, w, h);

        // HP フィル（HP に応じて色変化）
        ctx.fillStyle = ratio > 0.5 ? "#4CAF50" : ratio > 0.25 ? "#FFC107" : "#ff4444";
        ctx.fillRect(1, 1, (w - 2) * ratio, h - 2);

        // 枠線
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);

        this._hbTexture.needsUpdate = true;
    }

    takeDamage(amount) {
        if (!this.isAlive) return;

        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this._redrawHealthBar();

        if (this.currentHealth <= 0) {
            this.isAlive = false;
            // HPバーを非表示
            if (this._healthBarSprite) {
                this._healthBarSprite.visible = false;
            }
        }
    }

    update(delta) {
        if (!this.model) return;
        // AI は後で追加
    }
}
