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

        // 回避（Roll）用
        this.isRolling = false;
        this.rollCooldown = 0;
        this.rollCooldownMax = 0;
        this._rollTimer = 0;

        // キャラクター管理
        this.currentCharacter = "player";
        this.availableCharacters = ["player", "ShooterA"];
        this.characterIndex = 0;

        // キャラクター固有の設定
        // 新キャラ追加時はここにエントリを追加するだけでOK
        // attackAnimSpeed / skillAnimSpeed を追加してアニメーション再生速度を個別設定できるようにする
        // combo 関連設定を追加: comboMax, comboTimeout, comboDamageStep, comboKnockbackStep
        // skillEffect / skillBuff を追加して将来のサポート系スキル（バフ付与）に対応
        // ── 攻撃・スキルの遠距離/近接設定 ──
        // attackType: "melee" (近接) or "ranged" (遠距離)
        // skillType: "melee" or "ranged"
        // projectileType: 飛び道具のタイプ（ranged の場合に使用、cf. Projectile.js の PROJECTILE_CONFIGS）
        this.characterConfigs = {
            "player": {
                height: 1.8,
                scale: 1.0,
                attackAnim: null,
                skillAnim: null,
                skillCooldownMax: 0,
                attackPower: 0,
                attackRange: 0,
                attackAngle: 360, // 度数（360 = 全方向）
                attackType: "melee", // "melee" or "ranged"
                skillPower: 0,
                skillRange: 0,
                skillAngle: 360,
                skillType: "melee",
                projectileType: null, // ranged の場合の飛び道具タイプ
                rollAnim: null, // 追加
                rollCooldownMax: 0,
                rollSpeed: 0,
                rollDuration: 0,
                // アニメーション速度（1.0 が通常）
                attackAnimSpeed: 1.0,
                skillAnimSpeed: 1.0,
                // コンボ設定（デフォルト: コンボなし）
                comboMax: 1,
                comboTimeout: 1.5,
                comboDamageStep: 0.15,
                comboKnockbackStep: 0.2,
                // 例: サポート向けのバフ定義（未使用のままでもOK）
                // skillBuff: { stat: 'attack'|'defense', magnitude: 0.2, duration: 8 }
            },
            "ShooterA": {
                height: 1.8,
                scale: 1.0,
                attackAnim: "Punch_Cross",
                skillAnim: "OverhandThrow",
                skillCooldownMax: 5,
                attackPower: 20,
                attackRange: 2.5,
                attackAngle: 80,   // 正面±40°の扇形
                attackType: "melee",  // 通常攻撃は近接
                skillPower: 30,
                skillRange: 5.0,
                skillAngle: 120,   // 正面±60°の扇形（スキルは広め）
                skillType: "ranged",  // スキルは遠距離
                projectileType: "fireball",  // 発射する飛び道具
                // 回避設定（例）
                rollAnim: "Roll",
                rollCooldownMax: 3, // 秒
                rollSpeed: 8, // ロール時の速度（m/s 相当）
                rollDuration: 0.4, // ロール継続時間（秒）
                // アニメーション速度（必要に応じて調整）
                attackAnimSpeed: 2.0,
                skillAnimSpeed: 1.5,
                // コンボ設定
                comboMax: 4,
                comboTimeout: 1.6,
                // ダメージ増加（1ヒット目は増加なし。2ヒット目以降は (comboCount-1)*comboDamageStep が乗る）
                comboDamageStep: 0.18,
                // ノックバック増加倍率ステップ（1.0 が基準、累積は 1 + (comboCount-1)*comboKnockbackStep）
                comboKnockbackStep: 0.25,
                skillBuff: { stat: 'attack', magnitude: 0.1, duration: 8, source: 'ShooterA' },
            }
        };

        // コンボ状態
        this.comboCount = 0;      // 現在のコンボヒット回数（1 から始まる）
        this._comboTimer = 0;     // 残り時間（秒） コンボのリセットタイマー

        // 攻撃ヒット時のコールバック (power, range, angle) => void
        // Game.js から登録して距離チェック・ダメージ適用を行う
        this.onAttackHit = null;

        // スキルヒット時のコールバック (power, range, angle) => void
        this.onSkillHit = null;

        // 飛び道具発射時のコールバック (projectile) => void
        // Game.js から登録してシーンに追加・管理する
        this.onFireProjectile = null;

        // ステータス管理
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.isAlive = true;

        // ノックバック関連
        this.knockbackVelocity = new THREE.Vector3(0, 0, 0);
        this.isKnockedBack = false;
        this.knockbackTimer = 0;

        // pending for deferred hit application
        this._pendingAttack = null; // { power, range, angle, type, projectileType }
        this._pendingSkill = null;  // { power, range, angle, buff, type, projectileType }
        this._pendingAttackTimer = 0; // seconds until hit application
        this._pendingSkillTimer = 0;  // seconds until hit application

        // バフ管理: プレイヤーにかかっているバフのリスト
        // 各バフ: { id, stat: 'attack'|'defense', magnitude: number (0.2 = +20%), remaining: seconds, source }
        this.buffs = [];

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

                // ノックバックをリセット
                this.knockbackVelocity.set(0, 0, 0);
                this.isKnockedBack = false;
                this.knockbackTimer = 0;

                // コンボをリセット
                this.comboCount = 0;
                this._comboTimer = 0;

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
                    const allRollAnims = Object.values(this.characterConfigs)
                        .map(c => c.rollAnim).filter(Boolean);

                    if (clipName && allAttackAnims.includes(clipName)) {
                        this.isAttacking = false;
                        // previously applied pending on finish; now hits occur mid-animation via timers
                        this.animation.play("Idle_Loop");
                    }
                    if (clipName && allSkillAnims.includes(clipName)) {
                        this.isUsingSkill = false;
                        this.animation.play("Idle_Loop");
                    }
                    if (clipName && allRollAnims.includes(clipName)) {
                        this.isRolling = false;
                        this._rollTimer = 0;
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

        // クールタイム減算（skill と roll）
        if (this.skillCooldown > 0) {
            this.skillCooldown -= delta;
            if (this.skillCooldown < 0) this.skillCooldown = 0;
        }
        if (this.rollCooldown > 0) {
            this.rollCooldown -= delta;
            if (this.rollCooldown < 0) this.rollCooldown = 0;
        }

        // バフの更新（残り時間を減らし、期限切れは除去）
        if (this.buffs && this.buffs.length) {
            for (let i = this.buffs.length - 1; i >= 0; --i) {
                const b = this.buffs[i];
                b.remaining -= delta;
                if (b.remaining <= 0) {
                    this.buffs.splice(i, 1);
                }
            }
        }

        // コンボタイマー更新（一定時間ヒットが無ければコンボをリセット）
        if (this._comboTimer > 0) {
            this._comboTimer -= delta;
            if (this._comboTimer <= 0) {
                this.comboCount = 0;
                this._comboTimer = 0;
            }
        }

        // pending attack timer (apply hit mid-animation)
        if (this._pendingAttackTimer > 0) {
            this._pendingAttackTimer -= delta;
            if (this._pendingAttackTimer <= 0 && this._pendingAttack) {
                const { power, range, angle, type, projectileType } = this._pendingAttack;
                
                if (type === "ranged" && this.onFireProjectile && projectileType) {
                    // 遠距離攻撃：飛び道具を発射
                    this._fireProjectile(projectileType, power, angle);
                } else if (this.onAttackHit && power > 0) {
                    // 近接攻撃：通常のダメージ判定
                    const { damageMul } = this.getComboMultipliers();
                    const attackBuffMul = this.getAttackBuffMultiplier();
                    const finalPower = power * damageMul * attackBuffMul;
                    this.onAttackHit(finalPower, range, angle ?? 360);
                }
                this._pendingAttack = null;
                this._pendingAttackTimer = 0;
            }
        }

        // pending skill timer
        if (this._pendingSkillTimer > 0) {
            this._pendingSkillTimer -= delta;
            if (this._pendingSkillTimer <= 0 && this._pendingSkill) {
                const { power, range, angle, buff, type, projectileType } = this._pendingSkill;
                
                // 先にバフを適用（これによりスキルで同時にバフ+ダメージを行う場合、バフがダメージに影響する）
                if (buff) {
                    try {
                        // buff: { stat, magnitude, duration, source }
                        this.applyBuff(buff);
                    } catch (e) { /* ignore */ }
                }

                if (type === "ranged" && this.onFireProjectile && projectileType) {
                    // 遠距離スキル：飛び道具を発射
                    this._fireProjectile(projectileType, power, angle);
                } else if (this.onSkillHit && power > 0) {
                    // 近接スキル：通常のダメージ判定
                    const { damageMul } = this.getComboMultipliers();
                    const attackBuffMul = this.getAttackBuffMultiplier();
                    const finalPower = power * damageMul * attackBuffMul;
                    this.onSkillHit(finalPower, range, angle ?? 360);
                }
                this._pendingSkill = null;
                this._pendingSkillTimer = 0;
            }
        }

        // ロール中の移動処理（短時間のインパルス）
        if (this.isRolling && this._rollTimer > 0 && this.model) {
            const cfg = this.characterConfigs[this.currentCharacter] || {};
            const rollSpeed = cfg.rollSpeed ?? 8;
            // 前方ベクトル
            const forward = new THREE.Vector3(
                Math.sin(this.rotation),
                0,
                Math.cos(this.rotation)
            );
            // 単純に位置を進める（衝突などは考慮していません）
            this.model.position.addScaledVector(forward, rollSpeed * delta);
            this._rollTimer -= delta;
            if (this._rollTimer <= 0) {
                this.isRolling = false;
                this._rollTimer = 0;
                // アニメーションは mixer.finished イベントで解除される
            }
            // ロール中は入力による別アニメーション上書きしない
            return;
        }

        // ノックバック処理
        this._updateKnockback(delta);

        if (this.isAttacking || this.isUsingSkill) {
            return;
        }

    }

    move(x, y, delta, cameraYaw, dash = false) {

        if (!this.model) return;

        // ロール中は入力でアニメーションを上書きしない
        if (this.isRolling) return;

        // 攻撃・スキル中に移動アニメーションで上書きしない
        if (this.isAttacking || this.isUsingSkill) return;

        // ノックバック中は移動入力を無視（ノックバック移動のみ）
        if (this.isKnockedBack) return;

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

    // ── ノックバック処理 ──────────────────────────────────────────
    _applyKnockback(attackerPos) {
        const knockbackPower = 4.0;     // プレイヤーへのノックバック力
        const knockbackDuration = 0.3;  // プレイヤーへのノックバック継続時間

        // プレイヤーの方向ベクトル（攻撃者 → プレイヤー）
        const knockDir = new THREE.Vector3(
            this.model.position.x - attackerPos.x,
            0,
            this.model.position.z - attackerPos.z
        );
        knockDir.normalize();

        this.knockbackVelocity.copy(knockDir).multiplyScalar(knockbackPower);
        this.isKnockedBack = true;
        this.knockbackTimer = knockbackDuration;
    }

    _updateKnockback(delta) {
        if (!this.isKnockedBack || !this.model) return;

        // ノックバック速度を適用
        this.model.position.x += this.knockbackVelocity.x * delta;
        this.model.position.z += this.knockbackVelocity.z * delta;

        // 摩擦を追加（速度を減衰させる）
        const friction = 0.85;
        this.knockbackVelocity.multiplyScalar(friction);

        // ノックバックタイマーを減らす
        this.knockbackTimer -= delta;

        if (this.knockbackTimer <= 0) {
            this.isKnockedBack = false;
            this.knockbackTimer = 0;
            this.knockbackVelocity.set(0, 0, 0);
        }
    }

    // ── 飛び道具発射 ──────────────────────────────────────────
    _fireProjectile(projectileType, power, angle) {
        if (!this.onFireProjectile || !this.model) return;

        // プレイヤーの前方方向
        const direction = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );

        // 発射開始位置（プレイヤーの前方、やや上）
        const startPos = this.model.position.clone();
        startPos.y += 1.0; // 胸部辺りから発射

        // ダメージにコンボ・バフ倍率を適用
        const { damageMul } = this.getComboMultipliers();
        const attackBuffMul = this.getAttackBuffMultiplier();
        const finalPower = power * damageMul * attackBuffMul;

        // 飛び道具を発射（Game.js で敵判定を行う）
        this.onFireProjectile({
            type: projectileType,
            startPos,
            direction,
            power: finalPower,
            angle
        });
    }

    // 体力管理メソッド
    takeDamage(damage, attackerPos = null) {
        // バフ（防御）を加味してダメージを軽減
        const defenseReduction = this.getDefenseReduction(); // 0.0 - 0.9 の範囲
        const netDamage = Math.max(0, damage * (1 - defenseReduction));

        this.currentHealth = Math.max(0, this.currentHealth - netDamage);
        
        // ノックバック適用
        if (attackerPos && this.model) {
            this._applyKnockback(attackerPos);
        }
        
        if (this.currentHealth <= 0) {
            this.isAlive = false;
            this.animation.play("Death_Loop");
        }
    }

    // コンボ関連: 現在のコンボからダメージ/ノックバック倍率を返す
    getComboMultipliers() {
        const cfg = this.characterConfigs[this.currentCharacter] || {};
        const comboMax = cfg.comboMax ?? 1;
        const damageStep = cfg.comboDamageStep ?? 0.15;
        const knockbackStep = cfg.comboKnockbackStep ?? 0.2;

        const activeCombo = Math.max(0, Math.min(this.comboCount, comboMax)) ;
        // multiplier: 1 + (comboCount - 1) * step (1st hit = no bonus)
        const damageMul = 1 + Math.max(0, activeCombo - 1) * damageStep;
        const knockbackMul = 1 + Math.max(0, activeCombo - 1) * knockbackStep;
        return { damageMul, knockbackMul };
    }

    // バフ管理ユーティリティ
    applyBuff(buff) {
        // buff: { stat: 'attack'|'defense', magnitude: 0.2, duration: seconds, source }
        if (!buff || !buff.stat || !buff.magnitude || !buff.duration) return null;
        const id = (Date.now().toString(36) + Math.random().toString(36).slice(2,8));
        const b = {
            id,
            stat: buff.stat,
            magnitude: buff.magnitude,
            remaining: buff.duration,
            source: buff.source || null
        };
        this.buffs.push(b);
        return id;
    }

    removeBuff(id) {
        if (!id) return;
        this.buffs = this.buffs.filter(b => b.id !== id);
    }

    // 与ダメージに乗る攻撃力バフの合算倍率を返す（例: +20% -> 1.2）
    getAttackBuffMultiplier() {
        if (!this.buffs || this.buffs.length === 0) return 1.0;
        const sum = this.buffs.filter(b => b.stat === 'attack')
            .reduce((s, b) => s + (b.magnitude || 0), 0);
        return 1 + sum;
    }

    // 防御バフの合算（ダメージ軽減値 0.0 - 0.9 を想定）
    getDefenseReduction() {
        if (!this.buffs || this.buffs.length === 0) return 0.0;
        const sum = this.buffs.filter(b => b.stat === 'defense')
            .reduce((s, b) => s + (b.magnitude || 0), 0);
        // 上限を設けて最大 90% 軽減までにする
        return Math.min(0.9, sum);
    }

    // コンボヒットを記録（敵に当たったら Game.js から呼ぶ）
    recordSuccessfulHit() {
        const cfg = this.characterConfigs[this.currentCharacter] || {};
        const comboMax = cfg.comboMax ?? 1;
        const timeout = cfg.comboTimeout ?? 1.5;

        this.comboCount = Math.min(comboMax, this.comboCount + 1);
        this._comboTimer = timeout;
    }

    attack() {

        if (this.isAttacking || this.isUsingSkill) return;

        this.isAttacking = true;

        // configから攻撃パラメータを取得してヒット判定コールバックを呼ぶ
        const config = this.characterConfigs[this.currentCharacter];
        if (config?.attackPower > 0) {
            // defer hit until mid-animation
            this._pendingAttack = {
                power: config.attackPower,
                range: config.attackRange,
                angle: config.attackAngle ?? 360,
                type: config.attackType ?? "melee",
                projectileType: config.projectileType ?? null
            };
        }

        // configから攻撃アニメーション名を取得
        const attackAnim = config?.attackAnim;

        if (attackAnim && this.actions?.[attackAnim]) {
            const action = this.actions[attackAnim];
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;

            // アニメーション速度を技別に設定
            const animSpeed = config?.attackAnimSpeed ?? 1.0;
            try {
                // AnimationAction may support timeScale directly
                if (typeof action.setEffectiveTimeScale === 'function') {
                    action.setEffectiveTimeScale(animSpeed);
                } else {
                    action.timeScale = animSpeed;
                }
            } catch (e) {
                // ignore if not supported
                try { action.timeScale = animSpeed; } catch (_) { }
            }

            this.animation.play(attackAnim);

            // compute duration and schedule mid-hit
            let clip = null;
            try {
                clip = action.getClip ? action.getClip() : action._clip;
            } catch (_) { clip = action._clip ?? null; }
            const duration = clip?.duration ?? 0.8; // base duration
            const effectiveDuration = duration / (animSpeed || 1);
            const hitFraction = 0.5; // midpoint of animation
            this._pendingAttackTimer = effectiveDuration * hitFraction;
        } else {
            console.warn(`Attack animation not found for character: ${this.currentCharacter}`);
            // no animation -> apply immediately (fallback)
            if (this._pendingAttack && (this.onAttackHit || this.onFireProjectile)) {
                const { power, range, angle, type, projectileType } = this._pendingAttack;
                if (type === "ranged" && this.onFireProjectile && projectileType) {
                    this._fireProjectile(projectileType, power, angle);
                } else if (this.onAttackHit && power > 0) {
                    this.onAttackHit(power, range, angle ?? 360);
                }
                this._pendingAttack = null;
                this._pendingAttackTimer = 0;
            }
            this.isAttacking = false;
        }

    }

    useSkill() {

        // allow using buff-type skills even while attacking (サポートスキルを攻撃と同時に行いたいため)
        if (this.isUsingSkill) return;

        if (this.skillCooldown > 0) return;

        this.isUsingSkill = true;

        // configからクールタイムを取得してセット
        const config = this.characterConfigs[this.currentCharacter];
        const cooldownMax = config?.skillCooldownMax ?? 5;
        this.skillCooldownMax = cooldownMax;
        this.skillCooldown = cooldownMax;

        // スキルヒット判定コールバックを呼ぶ（後でアニメ中間で適用）
        // サポート（バフ）効果が存在する場合はバフ情報も pending に含める
        const pending = {};
        if (config?.skillPower > 0) {
            pending.power = config.skillPower;
            pending.range = config.skillRange;
            pending.angle = config.skillAngle ?? 360;
        }
        if (config?.skillBuff) {
            // skillBuff: { stat, magnitude, duration, source }
            pending.buff = config.skillBuff;
        }
        pending.type = config?.skillType ?? "melee";
        pending.projectileType = config?.projectileType ?? null;

        if (Object.keys(pending).length > 0) {
            this._pendingSkill = pending;
        }

        // configからスキルアニメーション名を取得
        const skillAnim = config?.skillAnim;

        if (skillAnim && this.actions?.[skillAnim]) {
            const action = this.actions[skillAnim];
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;

            // スキルアニメーション速度を設定
            const animSpeed = config?.skillAnimSpeed ?? 1.0;
            try {
                if (typeof action.setEffectiveTimeScale === 'function') {
                    action.setEffectiveTimeScale(animSpeed);
                } else {
                    action.timeScale = animSpeed;
                }
            } catch (e) {
                try { action.timeScale = animSpeed; } catch (_) { }
            }

            this.animation.play(skillAnim);

            // compute duration and schedule mid-hit
            let clip = null;
            try {
                clip = action.getClip ? action.getClip() : action._clip;
            } catch (_) { clip = action._clip ?? null; }
            const duration = clip?.duration ?? 0.8;
            const effectiveDuration = duration / (animSpeed || 1);
            const hitFraction = 0.5;
            this._pendingSkillTimer = effectiveDuration * hitFraction;
        } else {
            console.warn(`Skill animation not found for character: ${this.currentCharacter}`);
            // fallback: apply immediately (buffs and/or damage)
            if (this._pendingSkill) {
                const { power, range, angle, buff, type, projectileType } = this._pendingSkill;
                if (buff) this.applyBuff(buff);
                if (type === "ranged" && this.onFireProjectile && projectileType) {
                    this._fireProjectile(projectileType, power, angle);
                } else if (power > 0 && this.onSkillHit) {
                    const { damageMul } = this.getComboMultipliers();
                    const attackBuffMul = this.getAttackBuffMultiplier();
                    const finalPower = power * damageMul * attackBuffMul;
                    this.onSkillHit(finalPower, range, angle ?? 360);
                }
                this._pendingSkill = null;
                this._pendingSkillTimer = 0;
            }
            this.isUsingSkill = false;
        }
    }

    // 追加：回避（Roll）
    roll() {
        if (this.isAttacking || this.isUsingSkill || this.isRolling) return;
        if (this.rollCooldown > 0) return;

        const config = this.characterConfigs[this.currentCharacter] || {};
        const cooldownMax = config?.rollCooldownMax ?? 3;
        this.rollCooldownMax = cooldownMax;
        this.rollCooldown = cooldownMax;

        this.isRolling = true;
        this._rollTimer = config?.rollDuration ?? 0.4;

        const rollAnim = config?.rollAnim;
        if (rollAnim && this.actions?.[rollAnim]) {
            const action = this.actions[rollAnim];
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            this.animation.play(rollAnim);
        } else {
            // アニメーションが無ければ即座にロール移動のみ行い、タイマーで解除
            // (既に isRolling と _rollTimer を設定済み)
            console.warn(`Roll animation not found for character: ${this.currentCharacter}`);
        }
    }

    heal(amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }

    getHealthPercentage() {
        return (this.currentHealth / this.maxHealth) * 100;
    }
}
