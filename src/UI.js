export default class UI {

    constructor() {
        this.healthBar = null;
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
        container.style.width = "200px";
        container.style.height = "30px";
        container.style.backgroundColor = "#333";
        container.style.border = "2px solid #fff";
        container.style.borderRadius = "5px";
        container.style.zIndex = "100";
        container.style.display = "none"; // 初期状態は非表示

        // 体力バーの中身
        const bar = document.createElement("div");
        bar.id = "health-bar";
        bar.style.width = "100%";
        bar.style.height = "100%";
        bar.style.backgroundColor = "#4CAF50";
        bar.style.borderRadius = "3px";
        bar.style.transition = "width 0.3s ease";

        container.appendChild(bar);
        document.body.appendChild(container);

        this.healthBar = container;
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

        button.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.onAttack) {
                this.onAttack();
            }
        });

        document.body.appendChild(button);
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

        button.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.onSkill) {
                this.onSkill();
            }
        });

        document.body.appendChild(button);
        return button;
    }

    updateHealthBar(health, maxHealth) {
        if (!this.healthBar) return;

        this.healthValue = health;
        this.maxHealth = maxHealth;

        const percentage = (health / maxHealth) * 100;
        const bar = this.healthBar.querySelector("#health-bar");
        
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
    }

    showCharacterUI(characterName) {
        // キャラクター非依存の UI
        if (this.healthBar) {
            this.healthBar.style.display = "block";
        }

        const attackBtn = document.getElementById("attack-button");
        const skillBtn = document.getElementById("skill-button");

        // ShooterA など、体力バーとボタンが必要なキャラ
        if (characterName !== "player") {
            if (attackBtn) attackBtn.style.display = "block";
            if (skillBtn) skillBtn.style.display = "block";
        } else {
            // player は攻撃ボタン等を非表示
            if (attackBtn) attackBtn.style.display = "none";
            if (skillBtn) skillBtn.style.display = "none";
        }
    }

    hideCharacterUI() {
        if (this.healthBar) {
            this.healthBar.style.display = "none";
        }

        const attackBtn = document.getElementById("attack-button");
        const skillBtn = document.getElementById("skill-button");
        if (attackBtn) attackBtn.style.display = "none";
        if (skillBtn) skillBtn.style.display = "none";
    }

}
