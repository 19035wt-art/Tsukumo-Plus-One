
import nipplejs from "nipplejs";

export default class Input {

    constructor() {

        this.x = 0;
        this.y = 0;
        this.lookX = 0;
        this.lookY = 0;
        const dashButton = document.createElement("img");

        dashButton.src = "/ui/dash.png";

        dashButton.style.position = "fixed";
        dashButton.style.right = "40px";
        dashButton.style.bottom = "80px";
        dashButton.style.width = "90px";
        dashButton.style.height = "90px";

        document.body.appendChild(dashButton);
        this.dash = false;

        dashButton.addEventListener("pointerdown", () => {

            this.dash = true;

        });

        dashButton.addEventListener("pointerup", () => {

            this.dash = false;

        });

        dashButton.addEventListener("pointerleave", () => {

            this.dash = false;

        });
        const zone = document.createElement("div");

        zone.style.position = "fixed";
        zone.style.left = "0";
        zone.style.bottom = "0";
        zone.style.width = "45%";
        zone.style.height = "45%";
        zone.style.touchAction = "none";

        document.body.appendChild(zone);

        this.manager = nipplejs.create({

            zone: zone,

            mode: "static",

            position: {
                left: "90px",
                bottom: "90px"
            },

            color: "white",

            size: 120

        });

        this.manager.on("move", (evt, data)=>{

            if(!data.vector) return;

            this.x = data.vector.x;
            this.y = data.vector.y;

        });

        this.manager.on("end", ()=>{

            this.x = 0;
            this.y = 0;

        });
        let touching = false;
        let lastX = 0;

        window.addEventListener("pointerdown", (e) => {

            if (e.clientX < window.innerWidth / 2) return;

            touching = true;
            lastX = e.clientX;

        });

        window.addEventListener("pointermove", (e) => {

            if (!touching) return;

            const dx = e.clientX - lastX;

            this.lookX = dx * 0.005;

            lastX = e.clientX;

        });

        window.addEventListener("pointerup", () => {

            touching = false;
            this.lookX = 0;

        });
    }

}