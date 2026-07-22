
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ===========================
// シーン
// ===========================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// ===========================
// カメラ
// ===========================

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 2, 5);

// ===========================
// レンダラー
// ===========================

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);

// ===========================
// ライト
// ===========================

// 太陽光
const sun = new THREE.DirectionalLight(0xffffff, 3);

sun.position.set(5, 10, 5);

sun.castShadow = true;

scene.add(sun);

// 環境光
scene.add(new THREE.AmbientLight(0xffffff, 1.5));

// ===========================
// 地面
// ===========================

const floor = new THREE.Mesh(

    new THREE.PlaneGeometry(100, 100),

    new THREE.MeshStandardMaterial({

        color: 0x4caf50

    })

);

floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;

scene.add(floor);

// ===========================
// プレイヤー
// ===========================

const loader = new GLTFLoader();

let mixer = null;

loader.load(

    "/models/player.glb",

    (gltf) => {

        const player = gltf.scene;

        player.position.set(0, 0, 0);

        player.traverse((child) => {

            if (child.isMesh) {

                child.castShadow = true;

            }

        });

        scene.add(player);

        // -----------------------
        // Animation
        // -----------------------

        mixer = new THREE.AnimationMixer(player);

        console.log("Animations");

        gltf.animations.forEach((clip) => {

            console.log(clip.name);

        });

        const idle = gltf.animations.find(

            clip => clip.name === "Idle_Loop"

        );

        if (idle) {

            mixer.clipAction(idle).play();

            console.log("Idle_Loop Play");

        }

    },

    undefined,

    (error) => {

        console.error(error);

    }

);

// ===========================
// Clock
// ===========================

const clock = new THREE.Clock();

// ===========================
// Game Loop
// ===========================

function animate() {

    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (mixer) {

        mixer.update(delta);

    }

    renderer.render(scene, camera);

}

animate();

// ===========================
// Resize
// ===========================

window.addEventListener("resize", () => {

    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(

        window.innerWidth,

        window.innerHeight

    );

});
