import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class Enemy {

    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.isAlive = true;
        this._hbSprite = null;
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

    // HP バーはシーン直下に追加してモデルのスケールを受けないようにする
    _createHealthBar() {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 32;
        this._hbCtx = canvas.getContext("2d");
        this._hbTexture = new THREE.CanvasTexture(canvas);

        const mat = new THREE.SpriteMaterial({
            map: this._hbTexture,
            depthTest: false,   // 壁越しでも常に表示
            sizeAttenuation: true,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1.6, 0.2, 1);

        // モデルとは独立してシーン直下に追加
        this.scene.add(sprite);
        this._hbSprite = sprite;

        // 初期描画
        this._redrawHealthBar();
        // 位置は update() で毎フレーム合わせる
        this._syncHealthBarPosition();
    }

    _syncHealthBarPosition() {
        if (!this._hbSprite || !this.model) return;
        // モデルのワールド座標の真上に配置（スケール変換の影響なし）
        this._hbSprite.position.set(
            this.model.position.x,
            this.model.position.y + 2.2,
            this.model.position.z
        );
    }

    _redrawHealthBar() {
        const ctx = this._hbCtx;
        const w = 256, h = 32;
        const ratio = Math.max(0, this.currentHealth / this.maxHealth);

        ctx.clearRect(0, 0, w, h);

        // 背景
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, w, h);

        // HP フィル（HP に応じて色変化）
        ctx.fillStyle = ratio > 0.5 ? "#4CAF50" : ratio > 0.25 ? "#FFC107" : "#ff4444";
        ctx.fillRect(2, 2, (w - 4) * ratio, h - 4);

        // 枠線
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);

        this._hbTexture.needsUpdate = true;
    }

    takeDamage(amount) {
        if (!this.isAlive) return;

        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this._redrawHealthBar();

        if (this.currentHealth <= 0) {
            this.isAlive = false;
            if (this._hbSprite) {
                this._hbSprite.visible = false;
            }
        }
    }

    update(delta) {
        if (!this.model) return;
        // HP バーの位置をモデルに追従させる
        this._syncHealthBarPosition();
        // AI は後で追加
    }
}
