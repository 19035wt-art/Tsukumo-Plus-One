import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import Animation from "./Animation.js";

export default class Player {

    constructor(scene) {
        this.rotation = 0;
        this.turnSpeed = 8;
        this.scene = scene;

        this.model = null;
        this.mixer = null;

        this.speed = 3;

        this.loader = new GLTFLoader();
        this.isAttacking = false;
        this.isUsingSkill = false;

        this.skillCooldown = 0;
        this.skillCooldownMax = 5; // 5秒
        // キャラクター管理
        this.currentCharacter = "player";
        this.availableCharacters = ["player", "ShooterA"];
        this.characterIndex = 0;

        // キャラクター固有の設定
        this.characterConfigs = {
            "player": {
                height: 1.8,
                scale: 1.0
            },
            "ShooterA": {
                height: 1.8,
                scale: 1.0
            }
        };

        // ステータス管理
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.isAlive = true;

    }

    async load(character = "player") {

        return new Promise((resolve) => {

            const modelPath = `/models/${character}.glb`;

            this.loader.load(modelPath, (gltf) => {

                // 既存のモデルを削除
                if (this.model) {
                    this.scene.remove(this.model);
                    if (this.mixer) {
                        this.mixer.stopAllAction();
                    }
                }

                this.model = gltf.scene;
                this.currentCharacter = character;
                this.currentHealth = this.maxHealth;
                this.isAlive = true;

                // キャラクターを同じ身長に調整
                const config = this.characterConfigs[character];
                if (config) {
                    this.model.scale.set(config.scale, config.scale, config.scale);

                    // モデルの高さを正規化（ボーンの最大高さを目標高さに合わせる）
                    let maxY = 0;
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            const boundingBox = new THREE.Box3().setFromObject(child);
                            maxY = Math.max(maxY, boundingBox.max.y);
                        }
                    });

                    if (maxY > 0) {
                        const heightScale = config.height / maxY;
                        this.model.scale.multiplyScalar(heightScale);
                    }
                }

                this.scene.add(this.model);

                this.mixer = new THREE.AnimationMixer(this.model);

                this.actions = {};

                gltf.animations.forEach((clip) => {

                    this.actions[clip.name] =
                        this.mixer.clipAction(clip);

                });

                this.animation = new Animation(this.actions);

                this.animation.play("Idle_Loop");

                this.mixer.addEventListener("finished", (e) => {
                    let clipName = null;
                    try {
                        if (e.action && typeof e.action.getClip === 'function') {
                            clipName = e.action.getClip().name;
                        } else if (e.action && e.action._clip && e.action._clip.name) {
                            clipName = e.action._clip.name;
                        }
                    } catch (err) { /* ignore */ }

                    const attackNames = ["attack", "Puch_Cross"];
                    if (clipName && attackNames.includes(clipName)) {
                        this.isAttacking = false;
                    }
                    if (clipName === "skill") {
                        this.isUsingSkill = false;
                    }
                });

                resolve();

            });

        });

    }

    async switchCharacter() {

        this.characterIndex = (this.characterIndex + 1) % this.availableCharacters.length;
        const nextCharacter = this.availableCharacters[this.characterIndex];

        await this.load(nextCharacter);

    }

    update(delta) {
        if (this.mixer) {

            this.mixer.update(delta);

        }
        if (this.skillCooldown > 0) {

            this.skillCooldown -= delta;

        }

        if (this.isAttacking || this.isUsingSkill) {

            return;

        }

    }

    move(x, y, delta, cameraYaw, dash = false) {

        if (!this.model) return;

        const dir = new THREE.Vector2(x, -y);

        if (dir.length() < 0.05) {

            this.animation.play("Idle_Loop");

            return;

        }

        let speed = this.speed;

        if (dash) {

            speed = 6;

            this.animation.play("Sprint_Loop");

        } else {

            this.animation.play("Walk_Loop");

        }
        dir.normalize();

        // カメラ基準の角度
        const angle = Math.atan2(dir.x, dir.y) + cameraYaw;

        this.rotation = THREE.MathUtils.lerp(

            this.rotation,

            angle,

            this.turnSpeed * delta

        );

        this.model.rotation.y = this.rotation;

        const forward = new THREE.Vector3(

            Math.sin(this.rotation),

            0,

            Math.cos(this.rotation)

        );

        this.model.position.addScaledVector(

            forward,

            speed * delta

        );

    }

    // 体力管理メソッド
    takeDamage(damage) {
        this.currentHealth = Math.max(0, this.currentHealth - damage);
        if (this.currentHealth <= 0) {
            this.isAlive = false;
            this.animation.play("Death_Loop");
        }
    }
    attack() {

        if (this.isAttacking || this.isUsingSkill) return;

        this.isAttacking = true;

        // キャラクターごとの攻撃アニメーション名を決定
        let animName = "attack";
        if (this.currentCharacter && (this.currentCharacter === "ShooterA" || this.currentCharacter.toLowerCase() === "shootera")) {
            animName = "Punch_Cross"; // ShooterA の攻撃モーション名
        }

        // 存在するアクション名から再生（無ければフォールバック）
        if (this.actions && this.actions[animName]) {
            this.animation.play(animName);
        } else if (this.actions && this.actions["attack"]) {
            // フォールバック
            this.animation.play("attack");
        } else {
            console.warn(`Attack animation not found for character: ${this.currentCharacter}`);
            this.isAttacking = false;
        }

    }
   useSkill() {

        if (this.isAttacking || this.isUsingSkill) return;

        if (this.skillCooldown > 0) return;

        this.isUsingSkill = true;

        this.skillCooldown = this.skillCooldownMax;

        this.animation.play("skill");

    } 
    heal(amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }

    getHealthPercentage() {
        return (this.currentHealth / this.maxHealth) * 100;
    }
}
