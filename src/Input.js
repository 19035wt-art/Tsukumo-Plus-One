import nipplejs from "nipplejs";

export default class Input {

    constructor() {

        //=========================
        // 移動
        //=========================

        this.x = 0;
        this.y = 0;

        //=========================
        // カメラ
        //=========================

        this.lookX = 0;
        this.lookY = 0;

        //=========================
        // ボタン
        //=========================

        this.dash = false;
        this.switchCharacter = false;
        this.onSwitchCharacter = null;

        //=========================
        // 初期化
        //=========================

        this.createJoystick();
        this.createCameraInput();
        this.createButtons();
    }

    //-------------------------------------------------
    // 左スティック
    //-------------------------------------------------

    createJoystick() {

        const zone = document.createElement("div");

        zone.style.position = "fixed";
        zone.style.left = "0";
        zone.style.bottom = "0";
        zone.style.width = "50%";
        zone.style.height = "100%";
        zone.style.touchAction = "none";

        document.body.appendChild(zone);

        this.manager = nipplejs.create({

            zone: zone,
            mode: "static",

            position: {
                left: "90px",
                bottom: "90px"
            },

            color: "white"

        });

        this.manager.on("move", (evt, data) => {

            this.x = data.vector.x;
            this.y = data.vector.y;

        });

        this.manager.on("end", () => {

            this.x = 0;
            this.y = 0;

        });

    }

    //-------------------------------------------------
    // カメラ
    //-------------------------------------------------

    createCameraInput() {

        let touching = false;
        let lastX = 0;
        let lastY = 0;

        window.addEventListener("pointerdown", (e) => {

            // 左半分はスティック
            if (e.clientX < window.innerWidth / 2) return;

            // ボタン付近は除外
            if (
                e.clientX > window.innerWidth - 160 &&
                e.clientY > window.innerHeight - 160
            ) {
                return;
            }

            touching = true;

            lastX = e.clientX;
            lastY = e.clientY;

        });

        window.addEventListener("pointermove", (e) => {

            if (!touching) return;

            this.lookX = (e.clientX - lastX) * 0.005;
            this.lookY = (e.clientY - lastY) * 0.005;

            lastX = e.clientX;
            lastY = e.clientY;

        });

        window.addEventListener("pointerup", () => {

            touching = false;

            this.lookX = 0;
            this.lookY = 0;

        });

        window.addEventListener("pointercancel", () => {

            touching = false;

            this.lookX = 0;
            this.lookY = 0;

        });

    }

    //-------------------------------------------------
    // ボタン
    //-------------------------------------------------

    createButtons() {

        this.createDashButton();
        this.createSwitchCharacterButton();

    }

    createDashButton() {

        const button = document.createElement("img");

        button.src = "/ui/dash.png";

        button.style.position = "fixed";
        button.style.right = "40px";
        button.style.bottom = "40px";

        button.style.width = "90px";
        button.style.height = "90px";

        button.style.userSelect = "none";
        button.style.touchAction = "none";

        document.body.appendChild(button);

        const stopDash = () => {

            this.dash = false;

        };

        button.addEventListener("pointerdown", (e) => {

            e.stopPropagation();

            this.dash = true;

        });

        button.addEventListener("pointerup", stopDash);
        button.addEventListener("pointerleave", stopDash);
        button.addEventListener("pointercancel", stopDash);

    }

    createSwitchCharacterButton() {

        const button = document.createElement("button");

        button.textContent = "キャラ変更";

        button.style.position = "fixed";
        button.style.right = "40px";
        button.style.bottom = "150px";

        button.style.width = "90px";
        button.style.height = "50px";
        button.style.padding = "10px";

        button.style.fontSize = "12px";
        button.style.fontWeight = "bold";
        button.style.color = "white";
        button.style.backgroundColor = "#4CAF50";
        button.style.border = "2px solid #45a049";
        button.style.borderRadius = "5px";

        button.style.userSelect = "none";
        button.style.touchAction = "none";
        button.style.cursor = "pointer";

        document.body.appendChild(button);

        button.addEventListener("click", (e) => {

            e.stopPropagation();

            if (this.onSwitchCharacter) {
                this.onSwitchCharacter();
            }

        });

    }

}
