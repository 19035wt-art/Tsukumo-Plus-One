
import * as THREE from "three";

export default class GameCamera {

    constructor(camera, player) {
        this.yaw = 0;
        this.pitch = 0.3;

        this.distance = 5;
        this.height = 2.5;
        this.camera = camera;
        this.player = player;

        // プレイヤーから見たカメラ位置
        this.offset = new THREE.Vector3(0, 2.5, 5);

        this.target = new THREE.Vector3();

    }

    update(input) {

        if (!this.player.model) return;

        this.yaw -= input.lookX;

        const target = this.player.model.position.clone();

        target.y += 1.2;

        const offset = new THREE.Vector3(

            Math.sin(this.yaw) * this.distance,

            this.height,

            Math.cos(this.yaw) * this.distance

        );

        const desired = target.clone().add(offset);

        this.camera.position.lerp(desired, 0.15);

        this.camera.lookAt(target);

    }
}