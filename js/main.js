import { CONFIG } from './config.js';
import { InputManager } from './input.js';
import { Player } from './player.js';
import { World } from './world.js';

const inputManager = new InputManager();

class App {
    static start(gfx) {
        const overlay = document.getElementById('overlay');
        overlay.innerHTML = '<h1>LOADING...</h1>';
        overlay.style.display = 'flex';

        setTimeout(() => {
            const isContinue = gfx === 'CONTINUE';
            let finalGfx = gfx;

            if (isContinue) {
                const playerState = JSON.parse(localStorage.getItem('playerState'));
                finalGfx = (playerState && playerState.gfx) ? playerState.gfx : 'MEDIUM';
            }

            document.body.requestPointerLock();

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000);
            this.scene.fog = new THREE.Fog(0x000000, 1, CONFIG.CHUNK_SIZE * 1.8);

            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 60);
            
            this.renderer = new THREE.WebGLRenderer({ antialias: finalGfx === 'HIGH', precision: "lowp" });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(finalGfx === 'LOW' ? 0.3 : (finalGfx === 'MEDIUM' ? 0.6 : (window.devicePixelRatio || 1)));

            const canvasContainer = document.getElementById('canvas-container');
            canvasContainer.appendChild(this.renderer.domElement);

            this.gfx = finalGfx;
            if (this.gfx === 'HIGH') {
                document.getElementById('vhs-overlay').style.display = 'block';
            } else if (this.gfx === 'MEDIUM') {
                document.getElementById('shadow-overlay').style.display = 'block';
            }

            this.renderer.domElement.addEventListener('click', () => {
                document.body.requestPointerLock();
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                    elem.requestFullscreen().catch(err => {
                        console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    });
                }
            });

            window.addEventListener('resize', this.onWindowResize.bind(this), false);

            this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

            this.input = inputManager;
            this.player = new Player(this.scene, this.camera, this.gfx);

            if (isContinue) {
                if (!this.player.loadState()) {
                    this.player.seed = Math.random();
                }
            } else {
                sessionStorage.clear();
                this.player.seed = Math.random();
            }

            this.world = new World(this.scene);
            this.clock = new THREE.Clock();
            this.insanityTimer = 0;
            
            this.pickupPrompt = document.getElementById('pickup-prompt');
            this.mobileActionButton = document.getElementById('btn-action');

            this.frustum = new THREE.Frustum();
            this.projMatrix = new THREE.Matrix4();

            this.camera.updateMatrixWorld();
            this.projMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
            this.frustum.setFromProjectionMatrix(this.projMatrix);
            
            this.world.update(this.player, this.frustum); 

            overlay.style.display = 'none';
            document.getElementById('credit').style.display = 'none';

            this.animate = this.animate.bind(this);
            this.animationId = null;
            this.animate();

            this.saveInterval = setInterval(() => {
                this.player.saveState();
            }, 30);
        }, 50);
    }

    static goInsane() {
        cancelAnimationFrame(this.animationId);
        clearInterval(this.saveInterval);
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }

        const overlay = document.getElementById('overlay');
        overlay.innerHTML = '<h1 class="insane-text">YOU HAVE GONE INSANE</h1>';
        overlay.style.display = 'flex';
        overlay.className = 'insane';

        setTimeout(() => {
            overlay.classList.add('active');
            const insaneText = document.querySelector('.insane-text');
            if (insaneText) {
                insaneText.classList.add('visible');
            }
        }, 100);

        localStorage.removeItem('playerState');
        sessionStorage.clear();

        setTimeout(() => {
            window.location.reload();
        }, 5000);
    }

    static onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    static animate() {
        this.animationId = requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);
        
        this.input.update(); 
        this.player.update(dt, this.input, this.world.activeWalls, this.world.activeItems);

        if (this.gfx === 'HIGH') {
            let sanityEffect = 0;
            if (this.player.sanity < 25) {
                sanityEffect = 1 - (this.player.sanity / 25);
            }

            const canvasContainer = document.getElementById('canvas-container');
            canvasContainer.style.filter = `blur(${sanityEffect * 0.75}px)`;

            const shakeIntensity = sanityEffect * 0.025;
            if (shakeIntensity > 0) {
                this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
                this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            }
        }

        this.camera.updateMatrixWorld();
        this.projMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.projMatrix);
        
        const currentBiome = this.world.update(this.player, this.frustum);

        document.getElementById('ui-biome').innerText = currentBiome.name;
        document.getElementById('ui-biome').style.color = currentBiome.t === 'B' ? '#55aaff' : (currentBiome.t === 'R' ? '#ff5555' : '#ffffaa');
        
        this.player.sanity = Math.max(0, this.player.sanity + currentBiome.drain * dt);
        this.player.updateUI();

        if (this.player.sanity <= 0) {
            this.insanityTimer += dt;
            if (this.insanityTimer >= 25) {
                this.goInsane();
                return;
            }
        } else {
            this.insanityTimer = 0;
        }

        let closestItem = null;
        let min_dist = CONFIG.PICKUP_RADIUS;

        for (const item of this.world.activeItems) {
            if (item.userData.isPickup) {
                item.children.forEach(child => {
                    if (child.userData.originalColor) child.material.color.copy(child.userData.originalColor);
                });

                if (!item.parent.visible || !item.visible) continue;
                const dist = this.player.yaw.position.distanceTo(item.getWorldPosition(new THREE.Vector3()));
                if (dist < min_dist) {
                    min_dist = dist;
                    closestItem = item;
                }
            }
        }
        
        const controllerType = this.input.getControllerType();
        this.pickupPrompt.style.display = 'none';
        this.mobileActionButton.style.display = 'none';

        if (controllerType === 'mobile') {
            this.mobileActionButton.style.display = 'flex';
        }

        if (closestItem) {
            closestItem.children.forEach(c => c.material.color.set(0xffffff));
            if (controllerType === 'mobile') {
                this.mobileActionButton.innerText = 'PICKUP';
                this.mobileActionButton.classList.add('pickup');
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
                this.mobileActionButton.classList.remove('pickup');
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.App = App;

window.addEventListener('DOMContentLoaded', () => {
    const mainMenu = document.getElementById('main-menu');
    const gfxMenu = document.getElementById('gfx-menu');
    const playButton = document.getElementById('play-button');
    const continueButton = document.querySelector('#main-menu .btn-start[onclick*="CONTINUE"]');
    const overlay = document.getElementById('overlay');

    if (!mainMenu || !gfxMenu || !playButton || !overlay) {
        console.error("Required menu elements not found!");
        return;
    }

    if (continueButton) {
        if (!localStorage.getItem('playerState')) {
            continueButton.style.display = 'none';
        }
    }

    playButton.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        gfxMenu.style.display = 'block';
        selection = 0; 
        updateMenuSelection();
    });

    let selection = 0;
    let startButtons = [];

    const updateMenuSelection = () => {
        const activeMenu = gfxMenu.style.display === 'none' ? mainMenu : gfxMenu;
        if (!activeMenu) return;
        
        startButtons = Array.from(activeMenu.querySelectorAll('.btn-start')).filter(btn => btn.style.display !== 'none');

        if (startButtons.length === 0) return;

        if (selection >= startButtons.length) {
            selection = startButtons.length - 1;
        }
        if (selection < 0) {
            selection = 0;
        }

        startButtons.forEach((btn, index) => {
            const isActive = index === selection;
            btn.style.backgroundColor = isActive ? '#cccc77' : '#ffffaa';
            btn.style.transform = isActive ? 'translateY(2px)' : 'translateY(0px)';
            btn.style.boxShadow = isActive ? '0 2px #888855' : '0 4px #888855';
        });
    };
    
    const resetMenuSelection = () => {
        document.querySelectorAll('.btn-start').forEach(btn => {
            btn.style.backgroundColor = '#ffffaa';
            btn.style.transform = 'translateY(0px)';
            btn.style.boxShadow = '0 4px #888855';
        });
    };

    let lastStickX = 0;
    let lastDPadX = 0;
    let menuLoopId;

    const menuLoop = () => {
        if (overlay.style.display === 'none') {
            if(menuLoopId) cancelAnimationFrame(menuLoopId);
            return;
        }

        if (inputManager.getControllerType() !== 'gamepad') {
            resetMenuSelection();
            menuLoopId = requestAnimationFrame(menuLoop);
            return;
        }
        
        updateMenuSelection();
        inputManager.update();

        const gp = navigator.getGamepads()[inputManager.gamepadInput.gamepad];
        if (gp) {
            const stickX = gp.axes[0];
            if (stickX < -0.5 && lastStickX >= -0.5) {
                selection = (selection > 0) ? selection - 1 : startButtons.length - 1;
            } else if (stickX > 0.5 && lastStickX <= 0.5) {
                selection = (selection < startButtons.length - 1) ? selection + 1 : 0;
            }
            lastStickX = stickX;
            
            const dpadX = (gp.buttons[14] && gp.buttons[14].pressed) ? -1 : ((gp.buttons[15] && gp.buttons[15].pressed) ? 1 : 0);
            if (dpadX === -1 && lastDPadX !== -1) {
                 selection = (selection > 0) ? selection - 1 : startButtons.length - 1;
            } else if (dpadX === 1 && lastDPadX !== 1) {
                selection = (selection < startButtons.length - 1) ? selection + 1 : 0;
            }
            lastDPadX = dpadX;

            if (inputManager.gamepadInput.isActionPressed()) {
                if(startButtons[selection]){
                    startButtons[selection].click();
                }
            }
        }
        
        menuLoopId = requestAnimationFrame(menuLoop);
    };

    menuLoop();
});
