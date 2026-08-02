import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import Animation from "./Animation.js";

// ─────────────────────────────────────────────────────────────────
// 敵種別設定（新しい敵を追加するときはここにエントリを足すだけ）
// ─────────────────────────────────────────────────────────────────
export const ENEMY_CONFIGS = {
    "enemy1": {
        modelPath:      "/models/enemy1.glb",
        height:         1.8,
        maxHealth:      100,
        idleAnim:       "Zombie_Idle_Loop",
        hitAnim:        "Hit_Chest",
        walkAnim:       "Zombie_Walk",   // 存在しない場合は無視される
        moveSpeed:      2.5,             // 追跡時の移動速度 (m/s)
        detectionRange: 12,              // この距離以内でプレイヤーを検知
        stopDistance:   1.5,             // プレイヤーとの最小距離（重ならない）
    },
    // "enemy2": {
    //     modelPath: "/models/enemy2.glb",
    //     height: 2.0,
    //     maxHealth: 200,
    //     idleAnim: "Idle",
    //     hitAnim: "HitReaction",
    //     walkAnim: "Walk",
    //     moveSpeed: 2.0,
    //     detectionRange: 15,
    //     stopDistance: 1.8,
    // },
};

export class Enemy {

    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.mixer = null;
        this.actions = {};
        this.animation = null;
        this.isHit = false;
        this.isChasing = false;

        this.maxHealth = 100;
        this.currentHealth = 100;
        this.isAlive = true;

        this.currentType = null;

        this._hbSprite = null;
        this._hbTexture = null;
        this._hbCtx = null;
    }

    /**
     * @param {string} type      - ENEMY_CONFIGS のキー ("enemy1" など)
     * @param {{ x?: number, y?: number, z?: number }} position - 出現座標
     */
    async load(type = "enemy1", position = { x: 5, y: 0, z: 0 }) {
        const config = ENEMY_CONFIGS[type];
        if (!config) {
            console.warn(`Enemy config not found for type: ${type}`);
            return;
        }

        this.currentType = type;
        this.maxHealth = config.maxHealth;
        this.currentHealth = config.maxHealth;
        this.isAlive = true;
        this.isHit = false;
        this.isChasing = false;

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

        this.model.position.set(
            position.x ?? 5,
            position.y ?? 0,
            position.z ?? 0,
        );
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

            const cfg = ENEMY_CONFIGS[this.currentType];
            if (clipName && clipName === cfg?.hitAnim) {
                this.isHit = false;
                // 追跡中ならウォーク、そうでなければアイドル
                this._playMoveOrIdle();
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
            this._die();
            return;
        }

        // 被弾モーション（連打中は上書きしない）
        if (!this.isHit) {
            this._playHitAnim();
        }
    }

    _die() {
        this.isAlive = false;

        // モデルをシーンから削除
        if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
        }

        // HP バーをシーンから削除
        if (this._hbSprite) {
            this.scene.remove(this._hbSprite);
            this._hbSprite = null;
        }

        // テクスチャ解放
        if (this._hbTexture) {
            this._hbTexture.dispose();
            this._hbTexture = null;
        }
    }

    _playHitAnim() {
        const config = ENEMY_CONFIGS[this.currentType];
        const hitAnim = config?.hitAnim;
        if (!hitAnim || !this.actions?.[hitAnim]) return;

        this.isHit = true;
        const action = this.actions[hitAnim];
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        this.animation.current = null;
        this.animation.play(hitAnim);
    }

    _playMoveOrIdle() {
        const cfg = ENEMY_CONFIGS[this.currentType];
        if (!cfg) return;
        if (this.isChasing && cfg.walkAnim && this.actions[cfg.walkAnim]) {
            this.animation.play(cfg.walkAnim);
        } else {
            this.animation.play(cfg.idleAnim);
        }
    }

    // ── AI 追跡 ────────────────────────────────────────────────
    _updateAI(delta, playerPos) {
        if (!this.isAlive || !this.model || this.isHit) return;

        const cfg = ENEMY_CONFIGS[this.currentType];
        const detectionRange = cfg?.detectionRange ?? 10;
        const stopDistance   = cfg?.stopDistance   ?? 1.5;
        const moveSpeed      = cfg?.moveSpeed      ?? 2;

        const dx = playerPos.x - this.model.position.x;
        const dz = playerPos.z - this.model.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        const wasChasing = this.isChasing;

        if (dist <= detectionRange) {
            this.isChasing = true;

            if (dist > stopDistance) {
                // プレイヤーの方向へ移動
                const step = Math.min(moveSpeed * delta, dist - stopDistance);
                const nx = dx / dist;
                const nz = dz / dist;
                this.model.position.x += nx * step;
                this.model.position.z += nz * step;

                // プレイヤーの方向を向く
                this.model.rotation.y = Math.atan2(nx, nz);
            }
        } else {
            this.isChasing = false;
        }

        // 追跡状態が切り替わったときだけアニメを変更
        if (this.isChasing !== wasChasing) {
            this._playMoveOrIdle();
        }
    }

    // ── 敵同士の分離 ──────────────────────────────────────────────
    /**
     * 他の敵と重ならないよう押し合う
     * @param {Enemy[]} others - 自分以外の敵リスト
     */
    _applySeparation(others) {
        if (!this.isAlive || !this.model) return;

        const cfg = ENEMY_CONFIGS[this.currentType];
        // 敵同士の最小距離（stopDistance と同程度か少し広め）
        const separationRadius = (cfg?.stopDistance ?? 1.5) * 1.4;

        for (const other of others) {
            if (other === this || !other.isAlive || !other.model) continue;

            const dx = this.model.position.x - other.model.position.x;
            const dz = this.model.position.z - other.model.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < separationRadius && dist > 0.001) {
                // 重なり量に比例した強さで押し出す
                const overlap = separationRadius - dist;
                const nx = dx / dist;
                const nz = dz / dist;
                // 双方向で0.5ずつ負担（対称）
                this.model.position.x  += nx * overlap * 0.5;
                this.model.position.z  += nz * overlap * 0.5;
                other.model.position.x -= nx * overlap * 0.5;
                other.model.position.z -= nz * overlap * 0.5;
            }
        }
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
    /**
     * @param {number} delta
     * @param {THREE.Vector3|null} playerPos  - プレイヤーの座標（null なら AI 無効）
     * @param {Enemy[]}            allEnemies - 全敵リスト（分離処理用）
     */
    update(delta, playerPos = null, allEnemies = []) {
        if (!this.model) return;
        if (this.mixer) this.mixer.update(delta);
        if (playerPos) this._updateAI(delta, playerPos);
        this._applySeparation(allEnemies);
        this._syncHealthBarPosition();
    }
}
