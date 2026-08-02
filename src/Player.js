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
        this.skillCooldownMax = 0; // characterConfigsから動的に設定
        // キャラクター管理
        this.currentCharacter = "player";
        this.availableCharacters = ["player", "ShooterA"];
        this.characterIndex = 0;

        // キャラクター固有の設定
        // 新キャラ追加時はここにエントリを追加するだけでOK
        this.characterConfigs = {
            "player": {
                height: 1.8,
                scale: 1.0,
                attackAnim: null,
                skillAnim: null,
                skillCooldownMax: 0,
                attackPower: 0,
                attackRange: 0,
                attackAngle: 360,
                skillPower: 0,
                skillRange: 0,
                skillAngle: 360,
                rollCooldownMax: 0,
            },
            "ShooterA": {
                height: 1.8,
                scale: 1.0,
                attackAnim: "Punch_Cross",
                skillAnim: "OverhandThrow",
                skillCooldownMax: 5,
                attackPower: 20,
                attackRange: 2.5,
                attackAngle: 80,
                skillPower: 50,
                skillRange: 5.0,
                skillAngle: 120,
                rollCooldownMax: 3, // 回避クールタイム（秒）
            }
        };

        // 攻撃ヒット時のコールバック (power, range) => void
        // Game.js から登録して距離チェック・ダメージ適用を行う
        this.onAttackHit = null;

        // スキルヒット時のコールバック (power, range) => void
        this.onSkillHit = null;

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

                    // 全キャラの攻撃・スキルアニメーション名をconfigから動的に取得
                    const allAttackAnims = Object.values(this.characterConfigs)
                        .map(c => c.attackAnim).filter(Boolean);
                    const allSkillAnims = Object.values(this.characterConfigs)
                        .map(c => c.skillAnim).filter(Boolean);

                    if (clipName && allAttackAnims.includes(clipName)) {
                        this.isAttacking = false;
                        this.animation.play("Idle_Loop");
                    }
                    if (clipName && allSkillAnims.includes(clipName)) {
                        this.isUsingSkill = false;
                        this.animation.play("Idle_Loop");
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

        // 攻撃・スキル中は移動アニメーションで上書きしない
        if (this.isAttacking || this.isUsingSkill) return;

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

        // configから攻撃パラメータを取得してヒット判定コールバックを呼ぶ
        const config = this.characterConfigs[this.currentCharacter];
        if (this.onAttackHit && config?.attackPower > 0) {
            this.onAttackHit(config.attackPower, config.attackRange, config.attackAngle ?? 360);
        }

        // configから攻撃アニメーション名を取得
        const attackAnim = config?.attackAnim;

        if (attackAnim && this.actions?.[attackAnim]) {
            const action = this.actions[attackAnim];
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            this.animation.play(attackAnim);
        } else {
            console.warn(`Attack animation not found for character: ${this.currentCharacter}`);
            this.isAttacking = false;
        }

    }
   useSkill() {

        if (this.isAttacking || this.isUsingSkill) return;

        if (this.skillCooldown > 0) return;

        this.isUsingSkill = true;

        // configからクールタイムを取得してセット
        const config = this.characterConfigs[this.currentCharacter];
        const cooldownMax = config?.skillCooldownMax ?? 5;
        this.skillCooldownMax = cooldownMax;
        this.skillCooldown = cooldownMax;

        // スキルヒット判定コールバックを呼ぶ
        if (this.onSkillHit && config?.skillPower > 0) {
            this.onSkillHit(config.skillPower, config.skillRange, config.skillAngle ?? 360);
        }

        // configからスキルアニメーション名を取得
        const skillAnim = config?.skillAnim;

        if (skillAnim && this.actions?.[skillAnim]) {
            const action = this.actions[skillAnim];
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            this.animation.play(skillAnim);
        } else {
            console.warn(`Skill animation not found for character: ${this.currentCharacter}`);
            this.isUsingSkill = false;
        }

    } 
    heal(amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }

    getHealthPercentage() {
        return (this.currentHealth / this.maxHealth) * 100;
    }
}
