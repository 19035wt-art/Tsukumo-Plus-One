import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import Animation from "./Animation.js";

export class Enemy {

    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.mixer = null;
        this.actions = {};
        this.animation = null;
        this.isHit = false;

        this.maxHealth = 100;
        this.currentHealth = 100;
        this.isAlive = true;

        this.currentType = "enemy1";

        // 敵種別ごとの設定
        // 新しい敵を追加するときはここにエントリを追加するだけでOK
        this.enemyConfigs = {
            "enemy1": {
                modelPath: "/models/enemy1.glb",
                height: 1.8,
                maxHealth: 100,
                idleAnim: "Zombie_Idle_Loop",
                hitAnim: "Hit_Chest",
            },
        };

        this._hbSprite = null;
        this._hbTexture = null;
        this._hbCtx = null;
    }

    async load(type = "enemy1") {
        const config = this.enemyConfigs[type];
        if (!config) {
            console.warn(`Enemy config not found for type: ${type}`);
            return;
        }

        this.currentType = type;
        this.maxHealth = config.maxHealth;
        this.currentHealth = config.maxHealth;
        this.isAlive = true;
        this.isHit = false;

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(config.modelPath);

        this.model = gltf.scene;

        // 身長を統一
        let maxY = 0;
        this.model.traverse((child) => {
            if (child.isMesh) {
                const bb = new THREE.Box3().setFromObject(child);
                maxY = Math.max(maxY, bb.max.y);
            }
        });
        if (maxY > 0) {
            this.model.scale.setScalar(config.height / maxY);
        }

        this.model.position.set(5, 0, 0);
        this.model.rotation.y = Math.PI;
        this.scene.add(this.model);

        // アニメーション設定
        this.mixer = new THREE.AnimationMixer(this.model);
        this.actions = {};
        gltf.animations.forEach((clip) => {
            this.actions[clip.name] = this.mixer.clipAction(clip);
        });
        this.animation = new Animation(this.actions);

        // 待機モーション再生
        this.animation.play(config.idleAnim);

        // アニメーション終了イベント（被弾後にアイドルへ戻る）
        this.mixer.addEventListener("finished", (e) => {
            let clipName = null;
            try {
                clipName = e.action?.getClip?.()?.name ?? e.action?._clip?.name ?? null;
            } catch (_) { /* ignore */ }

            const cfg = this.enemyConfigs[this.currentType];
            if (clipName && clipName === cfg?.hitAnim) {
                this.isHit = false;
                this.animation.play(cfg.idleAnim);
            }
        });

        this._createHealthBar();
    }

    // ── 被弾 ────────────────────────────────────────────────────
    takeDamage(amount) {
        if (!this.isAlive) return;

        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this._redrawHealthBar();

        if (this.currentHealth <= 0) {
            this.isAlive = false;
            if (this._hbSprite) this._hbSprite.visible = false;
            return;
        }

        // 被弾モーション（連打中は上書きしない）
        if (!this.isHit) {
            this._playHitAnim();
        }
    }

    _playHitAnim() {
        const config = this.enemyConfigs[this.currentType];
        const hitAnim = config?.hitAnim;
        if (!hitAnim || !this.actions?.[hitAnim]) return;

        this.isHit = true;
        const action = this.actions[hitAnim];
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        // 同名アニメが current でも強制再生できるようリセット
        this.animation.current = null;
        this.animation.play(hitAnim);
    }

    // ── HP バー（シーン直下で追従）────────────────────────────────
    _createHealthBar() {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 32;
        this._hbCtx = canvas.getContext("2d");
        this._hbTexture = new THREE.CanvasTexture(canvas);

        const mat = new THREE.SpriteMaterial({
            map: this._hbTexture,
            depthTest: false,
            sizeAttenuation: true,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1.6, 0.2, 1);

        this.scene.add(sprite);
        this._hbSprite = sprite;

        this._redrawHealthBar();
        this._syncHealthBarPosition();
    }

    _syncHealthBarPosition() {
        if (!this._hbSprite || !this.model) return;
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
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = ratio > 0.5 ? "#4CAF50" : ratio > 0.25 ? "#FFC107" : "#ff4444";
        ctx.fillRect(2, 2, (w - 4) * ratio, h - 4);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        this._hbTexture.needsUpdate = true;
    }

    // ── 毎フレーム更新 ────────────────────────────────────────────
    update(delta) {
        if (!this.model) return;
        if (this.mixer) this.mixer.update(delta);
        this._syncHealthBarPosition();
    }
}
