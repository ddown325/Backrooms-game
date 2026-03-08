
import { MobileInput } from './input/mobile.js';
import { PCInput } from './input/pc.js';
import { GamepadInput } from './input/gamepad.js';

export class InputManager {
    constructor() {
        this.move = { fwd: 0, str: 0 };
        this.look = { x: 0, y: 0 };
        this.isMobile = 'ontouchstart' in document.documentElement;
        this.mobileInput = null;

        this.pcInput = new PCInput(this);
        this.gamepadInput = new GamepadInput(this);
        if (this.isMobile) {
            this.mobileInput = new MobileInput(this);
        }

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't' && e.target.tagName.toLowerCase() !== 'input' && e.target.tagName.toLowerCase() !== 'textarea') {
                this.isMobile = !this.isMobile;
                const mobileControls = document.getElementById('mobile-controls');
                if (this.isMobile) {
                    if (!this.mobileInput) {
                        this.mobileInput = new MobileInput(this);
                    }
                    mobileControls.style.display = 'flex';
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                } else {
                    mobileControls.style.display = 'none';
                }
            }
        });
    }

    getControllerType() {
        if (this.gamepadInput.gamepad !== -1 && navigator.getGamepads()[this.gamepadInput.gamepad]) {
            return 'gamepad';
        }
        return this.isMobile ? 'mobile' : 'keyboard';
    }

    isAction() {
        const controller = this.getControllerType();
        if (controller === 'gamepad') {
            return this.gamepadInput.isAction();
        }
        if (controller === 'mobile') {
            return this.mobileInput && this.mobileInput.isAction();
        }
        return this.pcInput.isAction();
    }

    consumeLook() {
        const val = { x: this.look.x, y: this.look.y };
        this.look.x = 0; this.look.y = 0;
        return val;
    }

    update() {
        const controller = this.getControllerType();
        if (controller === 'gamepad') {
            this.gamepadInput.update();
        } else if (controller === 'mobile') {
            // Mobile-specific update logic can be added here if needed
        } else {
            this.pcInput.update();
        }
    }
}
