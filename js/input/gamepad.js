
export class GamepadInput {
    constructor(manager) {
        this.manager = manager;
        this.gamepad = -1;

        window.addEventListener("gamepadconnected", (e) => {
            this.gamepad = e.gamepad.index;
            if (this.manager.isMobile) {
                document.getElementById('mobile-controls').style.display = 'none';
            }
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            if (this.gamepad === e.gamepad.index) this.gamepad = -1;
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

    update() {
        if (this.gamepad === -1) return;
        const gp = navigator.getGamepads()[this.gamepad];
        if (!gp) return;

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
