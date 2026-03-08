export class InputManager {
    constructor() {
        this.move = { fwd: 0, str: 0 };
        this.look = { x: 0, y: 0 };
        this.gamepad = -1;

        this.initKeyboard();
        this.initMouse();
        this.initGamepad();
        this.initTouch();

        this.keys = {};
        this.touch = { x: 0, y: 0, x2: 0, y2: 0, down: false, id: -1, id2: -1 };
        
        this.isMobile = 'ontouchstart' in document.documentElement;
        if (this.isMobile) {
            document.getElementById('mobile-controls').style.display = 'flex';
        }
    }

    getControllerType() {
        if (this.gamepad !== -1 && navigator.getGamepads()[this.gamepad]) {
            return 'gamepad';
        }
        return this.isMobile ? 'mobile' : 'keyboard';
    }

    isAction() {
        const controller = this.getControllerType();
        if (controller === 'gamepad') {
            const gp = navigator.getGamepads()[this.gamepad];
            return gp && (gp.buttons[0].pressed || gp.buttons[2].pressed);
        }
        if (controller === 'mobile') {
            return document.getElementById('btn-action').classList.contains('active');
        }
        return this.keys['e'] || this.keys['f'];
    }

    initKeyboard() {
        document.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        document.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    initMouse() {
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.look.x += e.movementX; this.look.y += e.movementY;
            }
        });
        document.addEventListener('mousedown', (e) => {
            if(!document.pointerLockElement) document.body.requestPointerLock();
        });
    }

    initGamepad() {
        window.addEventListener("gamepadconnected", (e) => {
            this.gamepad = e.gamepad.index;
            if (this.isMobile) {
                document.getElementById('mobile-controls').style.display = 'none';
            }
        });
        window.addEventListener("gamepaddisconnected", (e) => {
            if (this.gamepad === e.gamepad.index) this.gamepad = -1;
            if (this.isMobile) {
                document.getElementById('mobile-controls').style.display = 'flex';
            }
        });
    }

    initTouch() {
        const joyBase = document.getElementById('joy-base');
        const joyKnob = document.getElementById('joy-knob');
        const btnAction = document.getElementById('btn-action');

        const touchHandler = (e) => {
            if (document.getElementById('overlay').style.display === 'none') {
                e.preventDefault();

                for (const t of e.changedTouches) {
                    if (e.type === 'touchstart') {
                        if (this.touch.id < 0 && t.clientX < window.innerWidth / 2) {
                            this.touch.id = t.identifier;
                            this.touch.down = true;
                            joyBase.style.display = 'block';
                            joyBase.style.left = `${t.clientX - 50}px`;
                            joyBase.style.top = `${t.clientY - 50}px`;
                            this.touch.x = t.clientX; this.touch.y = t.clientY;
                        } else if (this.touch.id2 < 0) {
                            this.touch.id2 = t.identifier;
                            if (this.inside(t, btnAction)) btnAction.classList.add('active');
                        }
                    } else if (e.type === 'touchmove') {
                        if (t.identifier === this.touch.id) {
                            const dx = t.clientX - this.touch.x;
                            const dy = t.clientY - this.touch.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const angle = Math.atan2(dy, dx);
                            const maxDist = 40;

                            if (dist > maxDist) {
                                this.touch.x = t.clientX - Math.cos(angle) * maxDist;
                                this.touch.y = t.clientY - Math.sin(angle) * maxDist;
                            }

                            joyKnob.style.left = `${t.clientX - this.touch.x}px`;
                            joyKnob.style.top = `${t.clientY - this.touch.y}px`;

                            this.move.fwd = -Math.sin(angle) * (dist/maxDist);
                            this.move.str = Math.cos(angle) * (dist/maxDist);
                        } else if (t.identifier === this.touch.id2) {
                            if (this.inside(t, btnAction)) btnAction.classList.add('active');
                            else btnAction.classList.remove('active');
                        }
                    } else if (e.type === 'touchend' || e.type === 'touchcancel') {
                        if (t.identifier === this.touch.id) {
                            this.touch.id = -1; this.touch.down = false; this.move.fwd = 0; this.move.str = 0;
                            joyBase.style.display = 'none';
                        } else if (t.identifier === this.touch.id2) {
                            this.touch.id2 = -1;
                            btnAction.classList.remove('active');
                        }
                    }
                }
            }
        };

        document.addEventListener('touchstart', touchHandler, { passive: false });
        document.addEventListener('touchmove', touchHandler, { passive: false });
        document.addEventListener('touchend', touchHandler, { passive: false });
        document.addEventListener('touchcancel', touchHandler, { passive: false });
    }

    inside(touch, element) {
        const rect = element.getBoundingClientRect();
        return touch.clientX > rect.left && touch.clientX < rect.right &&
               touch.clientY > rect.top && touch.clientY < rect.bottom;
    }

    consumeLook() {
        const val = { x: this.look.x, y: this.look.y };
        this.look.x = 0; this.look.y = 0;
        return val;
    }

    update() {
        this.move.fwd = (this.keys['w'] ? 1 : 0) - (this.keys['s'] ? 1 : 0);
        this.move.str = (this.keys['d'] ? 1 : 0) - (this.keys['a'] ? 1 : 0);

        if (this.getControllerType() === 'gamepad') {
            const gp = navigator.getGamepads()[this.gamepad];
            if (!gp) return;
            const DEADZONE = 0.25;

            let lsX = gp.axes[0];
            let lsY = gp.axes[1];
            let rsX = gp.axes[2];
            let rsY = gp.axes[3];

            this.move.str = Math.abs(lsX) > DEADZONE ? lsX : 0;
            this.move.fwd = Math.abs(lsY) > DEADZONE ? -lsY : 0;
            
            this.look.x += Math.abs(rsX) > DEADZONE ? rsX * 20 : 0;
            this.look.y += Math.abs(rsY) > DEADZONE ? rsY * 20 : 0;
        }
    }
}
