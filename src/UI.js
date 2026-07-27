export default class UI {

    constructor() {
        this.healthBarContainer = null;
        this.attackButton = null;
        this.skillButton = null;
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
        const button = document.createElement("button");
        button.id = "attack-button";
        button.textContent = "攻撃";

        button.style.position = "fixed";
        button.style.right = "40px";
        button.style.bottom = "280px";
        button.style.width = "90px";
        button.style.height = "50px";
        button.style.padding = "10px";
        button.style.fontSize = "12px";
        button.style.fontWeight = "bold";
        button.style.color = "white";
        button.style.backgroundColor = "#ff6b6b";
        button.style.border = "2px solid #ff5252";
        button.style.borderRadius = "5px";
        button.style.userSelect = "none";
        button.style.touchAction = "none";
        button.style.cursor = "pointer";
        button.style.display = "none"; // 初期状態は非表示
        button.style.transition = "all 0.2s ease";

        button.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            button.style.transform = "scale(0.95)";
        });

        button.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            button.style.transform = "scale(1)";
            if (this.onAttack) {
                this.onAttack();
            }
        });

        button.addEventListener("pointerleave", () => {
            button.style.transform = "scale(1)";
        });

        document.body.appendChild(button);
        this.attackButton = button;
        return button;
    }

    createSkillButton() {
        const button = document.createElement("button");
        button.id = "skill-button";
        button.textContent = "スキル";

        button.style.position = "fixed";
        button.style.right = "40px";
        button.style.bottom = "220px";
        button.style.width = "90px";
        button.style.height = "50px";
        button.style.padding = "10px";
        button.style.fontSize = "12px";
        button.style.fontWeight = "bold";
        button.style.color = "white";
        button.style.backgroundColor = "#2196F3";
        button.style.border = "2px solid #1976D2";
        button.style.borderRadius = "5px";
        button.style.userSelect = "none";
        button.style.touchAction = "none";
        button.style.cursor = "pointer";
        button.style.display = "none"; // 初期状態は非表示
        button.style.transition = "all 0.2s ease";

        button.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            button.style.transform = "scale(0.95)";
        });

        button.addEventListener("pointerup", (e) => {
            e.stopPropagation();
            button.style.transform = "scale(1)";
            if (this.onSkill) {
                this.onSkill();
            }
        });

        button.addEventListener("pointerleave", () => {
            button.style.transform = "scale(1)";
        });

        document.body.appendChild(button);
        this.skillButton = button;
        return button;
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
        // キャラクター非依存の UI
        if (this.healthBarContainer) {
            this.healthBarContainer.style.display = "block";
        }

        // ShooterA など、体力バーとボタンが必要なキャラ
        if (characterName !== "player") {
            if (this.attackButton) this.attackButton.style.display = "block";
            if (this.skillButton) this.skillButton.style.display = "block";
        } else {
            // player は攻撃ボタン等を非表示
            if (this.attackButton) this.attackButton.style.display = "none";
            if (this.skillButton) this.skillButton.style.display = "none";
        }
    }

    hideCharacterUI() {
        if (this.healthBarContainer) {
            this.healthBarContainer.style.display = "none";
        }

        if (this.attackButton) this.attackButton.style.display = "none";
        if (this.skillButton) this.skillButton.style.display = "none";
    }

}
