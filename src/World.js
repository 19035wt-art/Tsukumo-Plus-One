
import * as THREE from "three";

export default class World {

    constructor(scene) {

        const sun = new THREE.DirectionalLight(
            0xffffff,
            3
        );

        sun.position.set(5, 10, 5);

        sun.castShadow = true;

        scene.add(sun);

        scene.add(
            new THREE.AmbientLight(
                0xffffff,
                1.5
            )
        );

        const floor = new THREE.Mesh(

            new THREE.PlaneGeometry(
                100,
                100
            ),

            new THREE.MeshStandardMaterial({

                color: 0x4caf50

            })

        );

        floor.rotation.x = -Math.PI / 2;

        floor.receiveShadow = true;

        scene.add(floor);
        // ===========================
        // デバッグ用の障害物
        // ===========================

        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888
        });

        const positions = [
            [3, 0.5, 0],
            [-3, 0.5, 2],
            [0, 0.5, -4],
            [5, 0.5, -3],
            [-5, 0.5, -5]
        ];

        positions.forEach(([x, y, z]) => {

            const box = new THREE.Mesh(
                boxGeometry,
                boxMaterial
            );

            box.position.set(x, y, z);

            box.castShadow = true;
            box.receiveShadow = true;

            scene.add(box);

        });
        const grid = new THREE.GridHelper(100, 100);

        scene.add(grid);
    }

}