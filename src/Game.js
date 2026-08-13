import * as THREE from "three";
import GameCamera from "./Camera.js";
import Player from "./Player.js";
import Input from "./Input.js";
import World from "./World.js";
import UI from "./UI.js";
// import部分
import { Projectile } from "./Projectile.js";
import { Enemy, ENEMY_CONFIGS } from "./Enemy.js";

export default class Game {

    constructor() {

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
// constructor内
// 複数敵を管理する配列
this.enemies = [];
this.projectiles = [];
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
        this.ui = new UI();

        // 複数敵を管理する配列
        this.enemies = [];

        // リサイズ対応
        window.addEventListener("resize", () => {

            this.camera.aspect =
                window.innerWidth / window.innerHeight;

            this.camera.updateProjectionMatrix();

            this.renderer.setSize(
                window.innerWidth,
                window.innerHeight
            );

        });

    }

    async init() {

        this.world = new World(this.scene);

        this.player = new Player(this.scene);

        await this.player.load();

        // Enemyモデル読み込み（複数体）
        // ここで出現位置を指定して複数体を生成する
        const positions = [
            { x: 5, y: 0, z: -2 },
            { x: 7, y: 0, z: 0 },
            { x: 5, y: 0, z: 2 },
        ];

        // 並列でロードして配列に格納
        this.enemies = positions.map(() => new Enemy(this.scene));
        await Promise.all(this.enemies.map((e, i) => e.load("enemy1", positions[i])));

        // 各敵の攻撃ヒット時にプレイヤーへダメージを与えるコールバックを登録
        this.enemies.forEach((enemy) => {
            // 変更点: 攻撃ヒット時にダメージを即適用するのではなく、
            // ヒットが発生した "その瞬間" に距離・角度を再評価してから適用する。
            enemy.onAttackHit = (power) => {
                if (!this.player.isAlive) return;

                // ロール（回避）中はダメージ無効
                if (this.player.isRolling) return;

                if (!enemy.model || !this.player.model) return;

                // 攻撃が当たる距離・角度を再評価する
                const cfg = ENEMY_CONFIGS[enemy.currentType] ?? {};
                const attackRange = cfg.attackRange ?? cfg.stopDistance ?? 1.8;
                const attackAngle = cfg.attackAngle ?? 360;

                const dx = this.player.model.position.x - enemy.model.position.x;
                const dz = this.player.model.position.z - enemy.model.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > attackRange) {
                    // 範囲外 -> 命中しない
                    return;
                }

                if (attackAngle < 360 && dist > 0.001) {
                    const halfRad = (attackAngle / 2) * (Math.PI / 180);
                    const nx = dx / dist;
                    const nz = dz / dist;
                    // 敵の正面ベクトル（rotation.y 基準）
                    const fx = Math.sin(enemy.model.rotation.y);
                    const fz = Math.cos(enemy.model.rotation.y);
                    const dot = fx * nx + fz * nz;
                    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                    if (angle > halfRad) {
                        // 角度外 -> 命中しない
                        return;
                    }
                }

                // 当たっていればダメージを与える（ノックバック用に攻撃者位置を渡す）
                this.player.takeDamage(power, enemy.model.position);
            };
        });

        this.cameraController =
            new GameCamera(
                this.camera,
                this.player
            );

        // UI
        this.ui.createHealthBar();
        this.ui.createAttackButton();
        this.ui.createSkillButton();
        this.ui.createSkillCooldownGauge();
        this.ui.createRollButton(); // 追加
        // (roll 用のクールダウン表示は UI 側で生成済み)

        this.ui.onAttack = () => {
            this.player.attack();
        };

        this.ui.onSkill = () => {
            this.player.useSkill();
        };

        // 回避ボタンの接続
        this.ui.onRoll = () => {
            this.player.roll();
        };

        // 範囲＋角度内の生存敵にダメージを与える共通ヘルパー
        // angle: 扇形の全角度（度数）。360 なら全方向。
        const _hitEnemiesInRange = (power, range, angleDeg) => {
            if (!this.enemies || this.enemies.length === 0) return;
            if (!this.player.model) return;

            const halfRad = (angleDeg / 2) * (Math.PI / 180);
            const facingY = this.player.model.rotation.y; // プレイヤーの向き（ラジアン）

            this.enemies.forEach((enemy) => {
                if (!enemy.isAlive || !enemy.model) return;

                const dx = enemy.model.position.x - this.player.model.position.x;
                const dz = enemy.model.position.z - this.player.model.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > range) return;

                // 全方向指定なら角度チェックをスキップ
                if (angleDeg < 360) {
                    // プレイヤー正面ベクトル（rotation.y 基準）
                    const fx = Math.sin(facingY);
                    const fz = Math.cos(facingY);
                    // 敵への方向ベクトル（正規化）
                    const ex = dx / dist;
                    const ez = dz / dist;
                    // 内積 → なす角
                    const dot = fx * ex + fz * ez;
                    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                    if (angle > halfRad) return;
                }

                // ノックバック付きでダメージ与える（プレイヤーの位置を渡す）
                enemy.takeDamage(power, this.player.model.position);
            });
        };

        // 通常攻撃ヒット判定
        this.player.onAttackHit = (power, range, angle) => _hitEnemiesInRange(power, range, angle);
this.player.onFireProjectile = async ({ type, startPos, direction, power }) => {
    const projectile = new Projectile(
        this.scene,
        type,
        startPos,
        direction,
        power,
        (enemy, damage) => {
            if (!enemy?.isAlive || !enemy?.model) return;
            enemy.takeDamage(damage, this.player.model?.position ?? null);
        }
    );

    this.projectiles.push(projectile);
    await projectile.load();

    // ロード失敗などでモデルが作れなかった場合は次のフレームで回収
};
        // スキルヒット判定
        this.player.onSkillHit  = (power, range, angle) => _hitEnemiesInRange(power, range, angle);

        this.updateUI();

        this.input.onSwitchCharacter = async () => {

            await this.player.switchCharacter();

            this.updateUI();

        };

        this.animate();

    }

    updateUI() {

        this.ui.showCharacterUI(
            this.player.currentCharacter
        );

        this.ui.updateHealthBar(
            this.player.currentHealth,
            this.player.maxHealth
        );

    }

    handleAttack() {

        if (this.player.currentCharacter !== "player") {

            if (
                this.player.actions &&
                this.player.actions["Attack_Loop"]
            ) {

                this.player.animation.play(
                    "Attack_Loop"
                );

            }

            console.log(
                this.player.currentCharacter +
                " が攻撃した!"
            );

        }

    }

    handleSkill() {

        if (this.player.currentCharacter !== "player") {

            console.log(
                this.player.currentCharacter +
                " がスキルを使用した!"
            );

        }

    }

    animate = () => {

        requestAnimationFrame(this.animate);

        const delta =
            this.clock.getDelta();

        this.player.move(

            this.input.x,
            this.input.y,
            delta,
            this.cameraController.yaw,
            this.input.dash

        );

        this.player.update(delta);

        // Enemy更新（複数体対応）
        const playerPos = this.player.model?.position ?? null;
        if (this.enemies && this.enemies.length) {
            this.enemies.forEach((e) => e.update(delta, playerPos, this.enemies));
        }
// 飛び道具更新
if (this.projectiles.length) {
    for (const projectile of this.projectiles) {
        projectile.update(delta, this.enemies);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const projectile = this.projectiles[i];

        if (projectile.isAlive === false) {
            projectile.destroy();
            this.projectiles.splice(i, 1);
        }
    }
}
        this.ui.updateHealthBar(
            this.player.currentHealth,
            this.player.maxHealth
        );

        // スキルとロールのクールタイム表示を更新
        this.ui.updateSkillCooldown(
            this.player.skillCooldown,
            this.player.skillCooldownMax
        );
        this.ui.updateRollCooldown(
            this.player.rollCooldown,
            this.player.rollCooldownMax
        );

        this.cameraController.update(
            this.input
        );

        this.renderer.render(
            this.scene,
            this.camera
        );

    }

}
