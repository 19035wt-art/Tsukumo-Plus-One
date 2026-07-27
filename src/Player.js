
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

        // キャラクター管理
        this.currentCharacter = "player";
        this.availableCharacters = ["player", "ShooterA"];
        this.characterIndex = 0;

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

                this.scene.add(this.model);

                this.mixer = new THREE.AnimationMixer(this.model);

                this.actions = {};

                gltf.animations.forEach((clip) => {

                    this.actions[clip.name] =
                        this.mixer.clipAction(clip);

                });

                this.animation = new Animation(this.actions);

                this.animation.play("Idle_Loop");

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
}
