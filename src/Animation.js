
class Animation {

    constructor(actions) {

        this.actions = actions;

        this.current = null;

    }

    play(name) {

        if (this.current === name) return;

        const next = this.actions[name];

        if (!next) return;

        if (this.current) {

            this.actions[this.current]
                .fadeOut(0.2);

        }

        next
            .reset()
            .fadeIn(0.2)
            .play();

        this.current = name;

    }

}

export default Animation;
