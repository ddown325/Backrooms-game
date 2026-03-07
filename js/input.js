/**
 * InputManager: Unified Mobile/Desktop Controller
 */
export class InputManager {
    constructor() {
        this.move = { fwd: 0, str: 0 };
        this.look = { x: 0, y: 0 };
        this.drink = false;
        this.pickup = false;

        this.pointers = {
            moveId: null,
            lookId: null,
            moveStart: { x: 0, y: 0 },
            lookLast: { x: 0, y: 0 }
        };

        this.joyBase = document.getElementById('joy-base');
        this.joyKnob = document.getElementById('joy-knob');
        
        this.isMobile = 'ontouchstart' in window;

        this.bindEvents();
    }

    bindEvents() {
        if (this.isMobile) {
            document.getElementById('mobile-controls').style.display = 'flex';
            
            window.addEventListener('pointerdown', (e) => {
                if (e.target.id === 'btn-drink') {
                    this.drink = true;
                    return;
                }
                if (e.target.id === 'btn-pickup') {
                    this.pickup = true;
                    return;
                }

                if (e.clientX < window.innerWidth / 2 && this.pointers.moveId === null) {
                    this.pointers.moveId = e.pointerId;
                    this.pointers.moveStart = { x: e.clientX, y: e.clientY };
                    this.joyBase.style.display = 'block';
                    this.joyBase.style.left = `${e.clientX - 60}px`;
                    this.joyBase.style.top = `${e.clientY - 60}px`;
                } else if (e.clientX >= window.innerWidth / 2 && this.pointers.lookId === null) {
                    this.pointers.lookId = e.pointerId;
                    this.pointers.lookLast = { x: e.clientX, y: e.clientY };
                }
            });

            window.addEventListener('pointermove', (e) => {
                if (e.pointerId === this.pointers.moveId) {
                    const dx = e.clientX - this.pointers.moveStart.x;
                    const dy = e.clientY - this.pointers.moveStart.y;
                    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 60);
                    const angle = Math.atan2(dy, dx);
                    
                    const fx = Math.cos(angle) * dist;
                    const fy = Math.sin(angle) * dist;
                    
                    this.joyKnob.style.transform = `translate(calc(-50% + ${fx}px), calc(-50% + ${fy}px))`;
                    this.move.str = fx / 60;
                    this.move.fwd = -fy / 60;
                } else if (e.pointerId === this.pointers.lookId) {
                    this.look.x += e.clientX - this.pointers.lookLast.x;
                    this.look.y += e.clientY - this.pointers.lookLast.y;
                    this.pointers.lookLast = { x: e.clientX, y: e.clientY };
                }
            });

            const end = (e) => {
                if (e.pointerId === this.pointers.moveId) {
                    this.pointers.moveId = null;
                    this.move = { fwd: 0, str: 0 };
                    this.joyBase.style.display = 'none';
                }
                if (e.pointerId === this.pointers.lookId) {
                    this.pointers.lookId = null;
                }
            };

            window.addEventListener('pointerup', (e) => {
                if (e.target.id === 'btn-drink') this.drink = false;
                if (e.target.id === 'btn-pickup') this.pickup = false;
                end(e);
            });
            window.addEventListener('pointercancel', end);

        } else { // PC controls
            document.getElementById('mobile-controls').style.display = 'none';

            document.addEventListener('keydown', (e) => {
                switch(e.code) {
                    case 'KeyW': this.move.fwd = 1; break;
                    case 'KeyS': this.move.fwd = -1; break;
                    case 'KeyA': this.move.str = -1; break;
                    case 'KeyD': this.move.str = 1; break;
                    case 'KeyE': 
                        this.drink = true; 
                        this.pickup = true; 
                        break;
                }
            });

            document.addEventListener('keyup', (e) => {
                switch(e.code) {
                    case 'KeyW': if (this.move.fwd === 1) this.move.fwd = 0; break;
                    case 'KeyS': if (this.move.fwd === -1) this.move.fwd = 0; break;
                    case 'KeyA': if (this.move.str === -1) this.move.str = 0; break;
                    case 'KeyD': if (this.move.str === 1) this.move.str = 0; break;
                    case 'KeyE': 
                        this.drink = false; 
                        this.pickup = false;
                        break;
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (document.pointerLockElement === document.body) {
                    this.look.x += e.movementX;
                    this.look.y += e.movementY;
                }
            });
            
            document.body.addEventListener('click', () => {
                document.body.requestPointerLock();
            });
        }
    }

    consumeLook() {
        const l = { x: this.look.x, y: this.look.y };
        this.look = { x: 0, y: 0 };
        return l;
    }

    isDrink() {
        const wasDrink = this.drink;
        this.drink = false;
        return wasDrink;
    }

    isPickup() {
        const wasPickup = this.pickup;
        this.pickup = false;
        return wasPickup;
    }
}