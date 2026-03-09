export class MobileInput {
    constructor(manager) {
        this.manager = manager;

        this.touch = {
            joyId: -1,
            joyX: 0,
            joyY: 0,
            lookId: -1,
            lookX: 0,
            lookY: 0,
        };

        const touchHandler = (e) => {
            if (document.getElementById('overlay').style.display === 'none') {
                e.preventDefault();

                const joyBase = document.getElementById('joy-base');
                const btnAction = document.getElementById('btn-action');
                const btnSprint = document.getElementById('btn-sprint');

                for (const t of e.changedTouches) {
                    if (e.type === 'touchstart') {
                        if (this.inside(t, joyBase)) {
                            if (this.touch.joyId < 0) {
                                this.touch.joyId = t.identifier;
                                this.touch.joyX = t.clientX;
                                this.touch.joyY = t.clientY;
                            }
                        } else if (this.inside(t, btnAction)) {
                            btnAction.classList.add('active');
                        } else if (btnSprint && this.inside(t, btnSprint)) {
                            btnSprint.classList.toggle('active');
                        } else if (this.touch.lookId < 0) {
                            this.touch.lookId = t.identifier;
                            this.touch.lookX = t.clientX;
                            this.touch.lookY = t.clientY;
                            
                            const elem = document.documentElement;
                            if (elem.requestFullscreen) {
                                elem.requestFullscreen().catch(err => {
                                    console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                                });
                            }
                        }
                    } else if (e.type === 'touchmove') {
                        if (t.identifier === this.touch.joyId) {
                            const joyStick = document.getElementById('joy-stick');
                            const dx = t.clientX - this.touch.joyX;
                            const dy = t.clientY - this.touch.joyY;
                            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
                            const angle = Math.atan2(dy, dx);
                            
                            this.manager.move.str = Math.cos(angle) * dist / 40;
                            this.manager.move.fwd = Math.sin(angle) * dist / -40;
                            
                            joyStick.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;

                        } else if (t.identifier === this.touch.lookId) {
                            const dx = t.clientX - this.touch.lookX;
                            const dy = t.clientY - this.touch.lookY;
                            this.touch.lookX = t.clientX;
                            this.touch.lookY = t.clientY;
                            this.manager.look.x += dx * 0.5;
                            this.manager.look.y += dy * 0.5;
                        }
                    } else if (e.type === 'touchend' || e.type === 'touchcancel') {
                        if (t.identifier === this.touch.joyId) {
                            this.touch.joyId = -1;
                            this.manager.move.str = 0;
                            this.manager.move.fwd = 0;
                            document.getElementById('joy-stick').style.transform = 'translate(0,0)';
                        } else if (t.identifier === this.touch.lookId) {
                            this.touch.lookId = -1;
                        } else if (this.inside(t, btnAction)) {
                            btnAction.classList.remove('active');
                        }
                    }
                }
            }
        };

        if ('ontouchstart' in window) {
            document.addEventListener('touchstart', touchHandler, { passive: false });
            document.addEventListener('touchmove', touchHandler, { passive: false });
            document.addEventListener('touchend', touchHandler, { passive: false });
            document.addEventListener('touchcancel', touchHandler, { passive: false });
        }
    }

    inside(touch, element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return touch.clientX > rect.left && touch.clientX < rect.right &&
               touch.clientY > rect.top && touch.clientY < rect.bottom;
    }

    isAction() {
        const btn = document.getElementById('btn-action');
        const isActive = btn.classList.contains('active');
        if (isActive) {
            btn.classList.remove('active');
        }
        return isActive;
    }

    isSprinting() {
        const btn = document.getElementById('btn-sprint');
        return btn && btn.classList.contains('active');
    }

    update() {}
}
