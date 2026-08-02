import * as THREE from "three";
import GameCamera from "./Camera.js";
import Player from "./Player.js";
import Input from "./Input.js";
import World from "./World.js";
import UI from "./UI.js";
import { Enemy } from "./Enemy.js";

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
this.ui.onAttack = () => {
    this.player.attack();
};

this.ui.onSkill = () => {
    this.player.useSkill();
};

        // 攻撃ヒット判定：プレイヤーと敵の距離をチェックしてダメージを適用
        this.player.onAttackHit = (power, range) => {
            if (!this.enemies || this.enemies.length === 0) return;
            if (!this.player.model) return;

            // プレイヤーの攻撃範囲内にいるすべての敵にダメージを適用する
            this.enemies.forEach((enemy) => {
                if (!enemy.isAlive) return;
                if (!enemy.model) return;
                const dist = this.player.model.position.distanceTo(
                    enemy.model.position
                );
                if (dist <= range) {
                    enemy.takeDamage(power);
                }
            });
        };

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
            this.enemies.forEach((e) => e.update(delta, playerPos));
        }

        this.ui.updateHealthBar(
            this.player.currentHealth,
            this.player.maxHealth
        );

        this.ui.updateSkillCooldown(
            this.player.skillCooldown,
            this.player.skillCooldownMax
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
