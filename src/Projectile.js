import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * 飛び道具設定
 * 各種飛び道具の3Dモデル、速度、サイズなどを定義
 */
export const PROJECTILE_CONFIGS = {
    "bullet": {
        modelPath: "/models/Bullet.glb",
        speed: 20,           // m/s
        lifetime: 5,         // 秒
        scale: 1.0,
        collisionRadius: 0.5,
        trailEnabled: false,
    },
    "icebolt": {
        modelPath: "/models/projectile_icebolt.glb",
        speed: 25,
        lifetime: 4,
        scale: 0.8,
        collisionRadius: 0.4,
        trailEnabled: true,
    },
    "energywave": {
        modelPath: "/models/projectile_wave.glb",
        speed: 18,
        lifetime: 6,
        scale: 1.2,
        collisionRadius: 0.6,
        trailEnabled: true,
    },
};

/**
 * 飛び道具クラス
 * 発射された3Dモデルが移動し、敵に当たったらダメージを与える
 */
export class Projectile {
    /**
     * @param {THREE.Scene} scene - シーン
     * @param {string} type - 飛び道具タイプ（PROJECTILE_CONFIGS のキー）
     * @param {THREE.Vector3} startPos - 発射開始位置
     * @param {THREE.Vector3} direction - 発射方向（正規化されていることを想定）
     * @param {number} power - ダメージ量
     * @param {Function} onHit - 敵に当たった時のコールバック (enemy) => void
     */
    constructor(scene, type = "fireball", startPos = new THREE.Vector3(0, 0, 0),
                direction = new THREE.Vector3(0, 0, 1), power = 20, onHit = null) {
        this.scene = scene;
        this.type = type;
        this.power = power;
        this.onHit = onHit;

        this.model = null;
        this.direction = direction.clone().normalize();
        this.position = startPos.clone();

        const config = PROJECTILE_CONFIGS[type] || {};
        this.speed = config.speed ?? 20;
        this.lifetime = config.lifetime ?? 5;
        this.collisionRadius = config.collisionRadius ?? 0.5;
        this.trailEnabled = config.trailEnabled ?? false;

        this._elapsedTime = 0;
        this._hitTargets = new Set(); // 既に当たった敵を追跡（複数ヒット防止）
        this._trail = null;
        this._trailPositions = [];
    }

    /**
     * 飛び道具モデルを読み込んでシーンに追加
     */
    async load() {
        const config = PROJECTILE_CONFIGS[this.type];
        if (!config) {
            console.warn(`Projectile config not found: ${this.type}`);
            return;
        }

        const loader = new GLTFLoader();
        try {
            const gltf = await loader.loadAsync(config.modelPath);
            this.model = gltf.scene;

            // スケール設定
            const scale = config.scale ?? 1.0;
            this.model.scale.setScalar(scale);

            // 初期位置を設定
            this.model.position.copy(this.position);

            this.scene.add(this.model);

            // トレイルエフェクトを有効にする場合
            if (this.trailEnabled) {
                this._createTrail();
            }
        } catch (err) {
            console.error(`Failed to load projectile model: ${config.modelPath}`, err);
        }
    }

    /**
     * トレイル（軌跡）エフェクトを作成
     */
    _createTrail() {
        const material = new THREE.LineBasicMaterial({ color: 0x88ccff, linewidth: 2 });
        const geometry = new THREE.BufferGeometry();
        this._trail = new THREE.Line(geometry, material);
        this.scene.add(this._trail);
        this._trailPositions = [];
    }

    /**
     * トレイルを更新
     */
    _updateTrail() {
        if (!this._trail || !this.model) return;

        this._trailPositions.push(this.model.position.clone());

        // トレイルの長さを制限（古い点を削除）
        const maxTrailPoints = 30;
        if (this._trailPositions.length > maxTrailPoints) {
            this._trailPositions.shift();
        }

        const geometry = this._trail.geometry;
        geometry.dispose();
        const newGeometry = new THREE.BufferGeometry();
        newGeometry.setFromPoints(this._trailPositions);
        this._trail.geometry = newGeometry;
    }

    /**
     * 敵との衝突判定と処理
     * @param {Enemy[]} enemies - 敵の配列
     */
    _checkCollisions(enemies) {
        if (!this.model) return;

        for (const enemy of enemies) {
            if (!enemy.isAlive || !enemy.model) continue;

            // 既に当たった敵はスキップ（複数ヒット防止）
            if (this._hitTargets.has(enemy)) continue;

            // 距離チェック
            const dist = this.model.position.distanceTo(enemy.model.position);
            if (dist < this.collisionRadius + 0.5) {
                // 敵に当たった！
                this._hitTargets.add(enemy);

                // ダメージを与える
                if (this.onHit) {
                    this.onHit(enemy, this.power);
                }

                // 敵が1体のみに当たるタイプの場合ここで消滅
                // （複数敵に当たるタイプの場合は lifetime で自動消滅）
                this.isAlive = false;
            }
        }
    }

    /**
     * 毎フレーム更新
     * @param {number} delta - フレーム時間差分（秒）
     * @param {Enemy[]} enemies - 敵の配列（衝突判定用）
     */
    update(delta, enemies = []) {
        if (!this.model) return;

        this._elapsedTime += delta;

        // ライフタイム終了で消滅
        if (this._elapsedTime >= this.lifetime) {
            this.isAlive = false;
            return;
        }

        // 移動
        const displacement = this.direction.clone().multiplyScalar(this.speed * delta);
        this.model.position.addVectors(this.model.position, displacement);
        this.position.copy(this.model.position);

        // トレイル更新
        if (this.trailEnabled) {
            this._updateTrail();
        }

        // 敵との衝突判定
        this._checkCollisions(enemies);
    }

    /**
     * シーンから削除してリソースをクリーンアップ
     */
    destroy() {
        if (this.model && this.scene) {
            this.scene.remove(this.model);
            this.model = null;
        }
        if (this._trail && this.scene) {
            this.scene.remove(this._trail);
            this._trail = null;
        }
        if (this._trail && this._trail.geometry) {
            this._trail.geometry.dispose();
        }
    }
}
