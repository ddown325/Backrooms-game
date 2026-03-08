import { CONFIG } from './config.js';
import { InputManager } from './input.js';
import { Player } from './player.js';
import { World } from './world.js';

const inputManager = new InputManager();

class App {
    static start(gfx) {
        document.getElementById('overlay').style.display = 'none';
        
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        }

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(0x000000, 1, CONFIG.CHUNK_SIZE * 1.8);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 60);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: gfx === 'HIGH', precision: "lowp" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(gfx === 'LOW' ? 0.6 : (window.devicePixelRatio || 1));
        document.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

        this.input = inputManager;
        this.player = new Player(this.scene, this.camera);
        this.world = new World(this.scene);
        this.clock = new THREE.Clock();
        
        this.pickupPrompt = document.getElementById('pickup-prompt');
        this.mobileActionButton = document.getElementById('btn-action');

        this.frustum = new THREE.Frustum();
        this.projMatrix = new THREE.Matrix4();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    static onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    static animate() {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);
        
        this.input.update(); 
        this.player.update(dt, this.input, this.world.activeWalls, this.world.activeItems);

        this.camera.updateMatrixWorld();
        this.projMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.projMatrix);
        
        const currentBiome = this.world.update(this.player, this.frustum);

        document.getElementById('ui-biome').innerText = currentBiome.name;
        document.getElementById('ui-biome').style.color = currentBiome.t === 'B' ? '#55aaff' : (currentBiome.t === 'R' ? '#ff5555' : '#ffffaa');
        
        this.player.sanity = Math.max(0, this.player.sanity + currentBiome.drain * dt);
        this.player.updateUI();

        let closestItem = null;
        let min_dist = CONFIG.PICKUP_RADIUS;

        for (const item of this.world.activeItems) {
            if (item.userData.isPickup) {
                item.children.forEach(child => {
                    if (child.userData.originalColor) child.material.color.copy(child.userData.originalColor);
                });
            }
        }

        for (const item of this.world.activeItems) {
            if (!item.parent.visible || !item.visible || !item.userData.isPickup) continue;
            const dist = this.player.yaw.position.distanceTo(item.getWorldPosition(new THREE.Vector3()));
            if (dist < min_dist) {
                min_dist = dist;
                closestItem = item;
            }
        }
        
        const controllerType = this.input.getControllerType();
        this.pickupPrompt.style.display = 'none';

        if (closestItem) {
            closestItem.children.forEach(c => c.material.color.set(0xffffff));
            if (controllerType === 'mobile') {
                this.mobileActionButton.innerText = 'PICKUP';
            } else {
                const screenPos = new THREE.Vector3();
                closestItem.getWorldPosition(screenPos);
                screenPos.project(this.camera);

                if (screenPos.z < 1) {
                    this.pickupPrompt.style.display = 'block';
                    this.pickupPrompt.innerText = controllerType === 'gamepad' ? 'A' : 'E';
                    const screenX = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                    const screenY = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
                    this.pickupPrompt.style.left = `${screenX}px`;
                    this.pickupPrompt.style.top = `${screenY}px`;
                }
            }
        } else {
            if (controllerType === 'mobile') {
                this.mobileActionButton.innerText = 'DRINK';
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.App = App;


let selection = 0;
const startButtons = document.querySelectorAll('.btn-start');
const overlay = document.getElementById('overlay');

if (startButtons.length > 0 && overlay) {
    const updateMenuSelection = () => {
        startButtons.forEach((btn, index) => {
            if (index === selection) {
                btn.style.backgroundColor = '#cccc77';
                btn.style.transform = 'translateY(2px)';
                btn.style.boxShadow = '0 2px #888855';

            } else {
                btn.style.backgroundColor = '#ffffaa';
                btn.style.transform = 'translateY(0px)';
                btn.style.boxShadow = '0 4px #888855';
            }
        });
    };
    
    const resetMenuSelection = () => {
        startButtons.forEach(btn => {
            btn.style.backgroundColor = '#ffffaa';
            btn.style.transform = 'translateY(0px)';
            btn.style.boxShadow = '0 4px #888855';
        });
    };

    let lastStickX = 0;
    let lastDPadX = 0;
    let prevButtonStates = {};
    let menuLoopId;

    const menuLoop = () => {
        if (overlay.style.display === 'none') {
            if(menuLoopId) cancelAnimationFrame(menuLoopId);
            return;
        }

        if (inputManager.getControllerType() !== 'gamepad') {
            resetMenuSelection();
            requestAnimationFrame(menuLoop);
            return;
        }
        
        updateMenuSelection();
        inputManager.update();

        const gp = navigator.getGamepads()[inputManager.gamepad];
        if (gp) {
            const stickX = gp.axes[0];
            if (stickX < -0.5 && lastStickX >= -0.5) {
                selection = 0;
            } else if (stickX > 0.5 && lastStickX <= 0.5) {
                selection = 1;
            }
            lastStickX = stickX;
            
            const dpadX = (gp.buttons[14] && gp.buttons[14].pressed) ? -1 : ((gp.buttons[15] && gp.buttons[15].pressed) ? 1 : 0);
            if (dpadX === -1 && lastDPadX !== -1) {
                selection = 0;
            } else if (dpadX === 1 && lastDPadX !== 1) {
                selection = 1;
            }
            lastDPadX = dpadX;

            const actionButtonPressed = gp.buttons[0] && gp.buttons[0].pressed && !(prevButtonStates[0]);
            if (actionButtonPressed) {
                startButtons[selection].click();
            }

            for (let i = 0; i < gp.buttons.length; i++) {
                prevButtonStates[i] = gp.buttons[i] ? gp.buttons[i].pressed : false;
            }
        }
        
        menuLoopId = requestAnimationFrame(menuLoop);
    };

    menuLoop();
}