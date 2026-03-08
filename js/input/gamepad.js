export class GamepadInput {
    constructor(manager) {
        this.manager = manager;
        this.gamepad = -1;
        this.prevButtonStates = {};
        this.actionPressed = false;

        window.addEventListener("gamepadconnected", (e) => {
            this.gamepad = e.gamepad.index;
            if (this.manager.isMobile) {
                document.getElementById('mobile-controls').style.display = 'none';
            }
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            if (this.gamepad === e.gamepad.index) {
                this.gamepad = -1;
                this.prevButtonStates = {};
            }
            if (this.manager.isMobile) {
                document.getElementById('mobile-controls').style.display = 'flex';
            }
        });
    }

    isAction() {
        if (this.gamepad === -1) return false;
        const gp = navigator.getGamepads()[this.gamepad];
        return gp && (gp.buttons[0].pressed || gp.buttons[2].pressed);
    }

    isSprinting() {
        if (this.gamepad === -1) return false;
        const gp = navigator.getGamepads()[this.gamepad];
        return gp && gp.buttons[10].pressed;
    }
    
    isActionPressed() {
        return this.actionPressed;
    }

    update() {
        if (this.gamepad === -1) return;
        const gp = navigator.getGamepads()[this.gamepad];
        if (!gp) return;

        this.actionPressed = (gp.buttons[0] && gp.buttons[0].pressed && !this.prevButtonStates[0]) || (gp.buttons[2] && gp.buttons[2].pressed && !this.prevButtonStates[2]);

        const startButtonPressed = gp.buttons[9] && gp.buttons[9].pressed && !this.prevButtonStates[9];
        if (startButtonPressed) {
            document.body.requestPointerLock();
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }
        }

        for (let i = 0; i < gp.buttons.length; i++) {
            this.prevButtonStates[i] = gp.buttons[i] ? gp.buttons[i].pressed : false;
        }

        const DEADZONE = 0.25;
        let lsX = gp.axes[0];
        let lsY = gp.axes[1];
        let rsX = gp.axes[2];
        let rsY = gp.axes[3];

        this.manager.move.str = Math.abs(lsX) > DEADZONE ? lsX : 0;
        this.manager.move.fwd = Math.abs(lsY) > DEADZONE ? -lsY : 0;
        
        this.manager.look.x += Math.abs(rsX) > DEADZONE ? rsX * 45 : 0;
        this.manager.look.y += Math.abs(rsY) > DEADZONE ? rsY * 45 : 0;
    }
}