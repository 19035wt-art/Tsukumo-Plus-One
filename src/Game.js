
import * as THREE from "three";
import GameCamera from "./Camera.js";
import Player from "./Player.js";
import Input from "./Input.js";
import World from "./World.js";
import UI from "./UI.js";

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

    }

    async init() {

        this.world = new World(this.scene);

        this.player = new Player(this.scene);

        await this.player.load();
        
        // UI の初期化
        this.ui.createHealthBar();
        this.ui.createAttackButton();
        this.ui.createSkillButton();
        
        // UI コールバック設定
        this.ui.onAttack = () => {
            this.handleAttack();
        };
        this.ui.onSkill = () => {
            this.handleSkill();
        };
        
        this.cameraController =
            new GameCamera(
                this.camera,
                this.player
            );

        // キャラクター切り替えコールバック
        this.input.onSwitchCharacter = () => {
            this.player.switchCharacter();
            this.updateUI();
        };

        this.animate();

    }

    updateUI() {
        this.ui.showCharacterUI(this.player.currentCharacter);
        this.ui.updateHealthBar(this.player.currentHealth, this.player.maxHealth);
    }

    handleAttack() {
        if (this.player.currentCharacter !== "player") {
            // 攻撃アニメーションを実行
            if (this.player.actions && this.player.actions["Attack_Loop"]) {
                this.player.animation.play("Attack_Loop");
            }
            console.log(this.player.currentCharacter + " が攻撃した!");
        }
    }

    handleSkill() {
        if (this.player.currentCharacter !== "player") {
            console.log(this.player.currentCharacter + " がスキルを使用した!");
            // スキル効果の実装
        }
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

        // UI の更新
        this.ui.updateHealthBar(this.player.currentHealth, this.player.maxHealth);

        this.cameraController.update(this.input);
        this.renderer.render(
            this.scene,
            this.camera
        );

    }

}
