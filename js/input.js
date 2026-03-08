
import { MobileInput } from './input/mobile.js';
import { PCInput } from './input/pc.js';
import { GamepadInput } from './input/gamepad.js';

export class InputManager {
    constructor() {
        this.move = { fwd: 0, str: 0 };
        this.look = { x: 0, y: 0 };
        this.isMobile = 'ontouchstart' in document.documentElement;

        if (this.isMobile) {
            this.mobileInput = new MobileInput(this);
        }
        this.pcInput = new PCInput(this);
        this.gamepadInput = new GamepadInput(this);
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
            return this.mobileInput.isAction();
        }
        return this.pcInput.isAction();
    }

    consumeLook() {
        const val = { x: this.look.x, y: this.look.y };
        this.look.x = 0; this.look.y = 0;
        return val;
    }

    update() {
        if (this.getControllerType() === 'gamepad') {
            this.gamepadInput.update();
        } else if (this.getControllerType() !== 'mobile') {
            this.pcInput.update();
        }
    }
}
