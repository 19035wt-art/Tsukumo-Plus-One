export default class UI {

    constructor() {
        this.healthBarContainer = null;
        this.attackButton = null;
        this.skillButton = null;
        this.skillCooldownGauge = null;
        this.skillCooldownText = null;
        this.healthValue = 100;
        this.maxHealth = 100;
        this.onAttack = null;
        this.onSkill = null;
    }

    createHealthBar() {
        // 体力バーコンテナ
        const container = document.createElement("div");
        container.id = "health-bar-container";
        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.left = "20px";
        container.style.width = "250px";
        container.style.height = "35px";
        container.style.backgroundColor = "#333";
        container.style.border = "2px solid #fff";
        container.style.borderRadius = "5px";
        container.style.zIndex = "100";
        container.style.display = "none"; // 初期状態は非表示
        container.style.fontFamily = "Arial, sans-serif";

        // ラベル
        const label = document.createElement("div");
        label.style.position = "absolute";
        label.style.top = "-25px";
        label.style.left = "0";
        label.style.color = "#fff";
        label.style.fontSize = "14px";
        label.style.fontWeight = "bold";
        label.textContent = "HP";
        container.appendChild(label);

        // 体力バーの中身
        const bar = document.createElement("div");
        bar.id = "health-bar";
        bar.style.width = "100%";
        bar.style.height = "100%";
        bar.style.backgroundColor = "#4CAF50";
        bar.style.borderRadius = "3px";
        bar.style.transition = "width 0.3s ease";
        bar.style.display = "flex";
        bar.style.alignItems = "center";
        bar.style.justifyContent = "center";

        // HP値テキスト
        const text = document.createElement("span");
        text.id = "health-text";
        text.style.color = "#fff";
        text.style.fontSize = "12px";
        text.style.fontWeight = "bold";
        text.style.textShadow = "1px 1px 2px rgba(0,0,0,0.8)";
        text.textContent = "100/100";
        bar.appendChild(text);

        container.appendChild(bar);
        document.body.appendChild(container);

        this.healthBarContainer = container;
    }

    createAttackButton() {
        // 画像ボタンに差し替え
        const img = document.createElement("img");
        img.id = "attack-button";
        img.src = "/ui/attack.png"; // /ui フォルダ内の画像を想定
        img.alt = "攻撃";
        img.title = "攻撃";

        img.style.position = "fixed";
        img.style.right = "40px";
        img.style.bottom = "280px";
        img.style.width = "90px";
        img.style.height = "90px";
        img.style.userSelect = "none";
        img.style.touchAction = "none";
        img.style.cursor = "pointer";
        img.style.display = "none"; // 初期状態は非表示
        img.style.transition = "transform 0.08s ease";

        img.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            img.style.transform = "scale(0.95)";
        });

        img.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            img.style.transform = "scale(1)";
            if (this.onAttack) {
                this.onAttack();
            }
        });

        img.addEventListener("pointerleave", () => {
            img.style.transform = "scale(1)";
        });

        document.body.appendChild(img);
        this.attackButton = img;
        return img;
    }

    createSkillButton() {
        // 画像ボタンに差し替え
        const img = document.createElement("img");
        img.id = "skill-button";
        img.src = "/ui/skill.png"; // /ui フォルダ内の画像を想定
        img.alt = "スキル";
        img.title = "スキル";

        img.style.position = "fixed";
        img.style.right = "40px";
        img.style.bottom = "220px";
        img.style.width = "90px";
        img.style.height = "90px";
        img.style.userSelect = "none";
        img.style.touchAction = "none";
        img.style.cursor = "pointer";
        img.style.display = "none"; // 初期状態は非表示
        img.style.transition = "transform 0.08s ease";

        img.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            img.style.transform = "scale(0.95)";
        });

        img.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            img.style.transform = "scale(1)";
            if (this.onSkill) {
                this.onSkill();
            }
        });

        img.addEventListener("pointerleave", () => {
            img.style.transform = "scale(1)";
        });

        document.body.appendChild(img);
        this.skillButton = img;
        return img;
    }

    createSkillCooldownGauge() {
        // スキルボタンに重ねる円形クールタイムゲージ
        const gauge = document.createElement("div");
        gauge.id = "skill-cooldown-gauge";
        gauge.style.position = "fixed";
        gauge.style.right = "40px";
        gauge.style.bottom = "220px";
        gauge.style.width = "90px";
        gauge.style.height = "90px";
        gauge.style.borderRadius = "50%";
        gauge.style.pointerEvents = "none"; // ボタン操作を妨げない
        gauge.style.zIndex = "102";
        gauge.style.display = "none";
        gauge.style.transition = "none";

        // 残り秒数テキスト
        const text = document.createElement("span");
        text.style.position = "absolute";
        text.style.top = "50%";
        text.style.left = "50%";
        text.style.transform = "translate(-50%, -50%)";
        text.style.color = "#fff";
        text.style.fontSize = "20px";
        text.style.fontWeight = "bold";
        text.style.fontFamily = "Arial, sans-serif";
        text.style.textShadow = "0 1px 4px rgba(0,0,0,0.9)";
        gauge.appendChild(text);

        document.body.appendChild(gauge);
        this.skillCooldownGauge = gauge;
        this.skillCooldownText = text;
    }

    // current: 残りクールタイム(秒), max: 最大クールタイム(秒)
    updateSkillCooldown(current, max) {
        if (!this.skillCooldownGauge) return;

        if (max <= 0 || current <= 0) {
            this.skillCooldownGauge.style.display = "none";
            return;
        }

        this.skillCooldownGauge.style.display = "block";

        // conic-gradient で時計回りに残り時間を表示
        const pct = (current / max) * 100;
        this.skillCooldownGauge.style.background =
            `conic-gradient(rgba(0,0,0,0.6) ${pct}%, transparent ${pct}%)`;

        this.skillCooldownText.textContent = Math.ceil(current) + "s";
    }

    updateHealthBar(health, maxHealth) {
        if (!this.healthBarContainer) return;

        this.healthValue = health;
        this.maxHealth = maxHealth;

        const percentage = (health / maxHealth) * 100;
        const bar = this.healthBarContainer.querySelector("#health-bar");
        const text = this.healthBarContainer.querySelector("#health-text");
        
        if (bar) {
            bar.style.width = percentage + "%";

            // HPに応じて色を変更
            if (percentage > 50) {
                bar.style.backgroundColor = "#4CAF50"; // 緑
            } else if (percentage > 25) {
                bar.style.backgroundColor = "#FFC107"; // 黄
            } else {
                bar.style.backgroundColor = "#ff6b6b"; // 赤
            }
        }

        if (text) {
            text.textContent = `${Math.ceil(health)}/${Math.ceil(maxHealth)}`;
        }
    }

    showCharacterUI(characterName) {
        if (characterName !== "player") {
            // ShooterA などは HP とボタンを表示
            if (this.healthBarContainer) {
                this.healthBarContainer.style.display = "block";
            }
            if (this.attackButton) this.attackButton.style.display = "block";
            if (this.skillButton) this.skillButton.style.display = "block";
        } else {
            // player は HP・ボタンとも非表示
            if (this.healthBarContainer) {
                this.healthBarContainer.style.display = "none";
            }
            if (this.attackButton) this.attackButton.style.display = "none";
            if (this.skillButton) this.skillButton.style.display = "none";
            // ゲージもリセット
            if (this.skillCooldownGauge) {
                this.skillCooldownGauge.style.display = "none";
            }
        }
    }

    hideCharacterUI() {
        if (this.healthBarContainer) {
            this.healthBarContainer.style.display = "none";
        }
        if (this.attackButton) this.attackButton.style.display = "none";
        if (this.skillButton) this.skillButton.style.display = "none";
        if (this.skillCooldownGauge) {
            this.skillCooldownGauge.style.display = "none";
        }
    }

}
