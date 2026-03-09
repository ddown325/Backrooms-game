
export class PCInput {
    constructor(manager) {
        this.manager = manager;
        this.keys = {};

        document.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        document.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.manager.look.x += e.movementX; this.manager.look.y += e.movementY;
            }
        });
    }

    isAction() {
        return this.keys['e'];
    }

    isSprinting() {
        return this.keys['shift'];
    }

    update() {
        this.manager.move.fwd = (this.keys['w'] ? 1 : 0) - (this.keys['s'] ? 1 : 0);
        this.manager.move.str = (this.keys['d'] ? 1 : 0) - (this.keys['a'] ? 1 : 0);
    }
}
