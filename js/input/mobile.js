export class MobileInput {
    constructor(manager) {
        this.manager = manager;
        this.touch = {
            joyId: -1, joyX: 0, joyY: 0,
            lookId: -1, lookX: 0, lookY: 0,
        };

        const joyBase = document.getElementById('joy-base');
        const joyKnob = document.getElementById('joy-knob');
        const btnAction = document.getElementById('btn-action');
        const btnSprint = document.getElementById('btn-sprint');

        if (manager.isMobile) {
            document.getElementById('mobile-controls').style.display = 'flex';
        }

        const touchHandler = (e) => {
            if (document.getElementById('overlay').style.display === 'none') {
                e.preventDefault();
                document.body.requestPointerLock();
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                    elem.requestFullscreen().catch(err => {
                        console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    });
                }

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
                        }
                    } else if (e.type === 'touchmove') {
                        if (t.identifier === this.touch.joyId) {
                            const rect = joyBase.getBoundingClientRect();
                            const dx = t.clientX - (rect.left + rect.width / 2);
                            const dy = t.clientY - (rect.top + rect.height / 2);
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const angle = Math.atan2(dy, dx);
                            const maxDist = 40;

                            let knobX = dx;
                            let knobY = dy;
                            if (dist > maxDist) {
                                knobX = Math.cos(angle) * maxDist;
                                knobY = Math.sin(angle) * maxDist;
                            }
                            joyKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

                            const power = Math.min(dist, maxDist) / maxDist;
                            this.manager.move.fwd = Math.sin(angle) * power * -1;
                            this.manager.move.str = Math.cos(angle) * power;
                        }
                        
                        if (t.identifier === this.touch.lookId) {
                            const dx = t.clientX - this.touch.lookX;
                            const dy = t.clientY - this.touch.lookY;
                            this.touch.lookX = t.clientX;
                            this.touch.lookY = t.clientY;
                            
                            this.manager.look.x += dx * 3;
                            this.manager.look.y += dy * 3;
                        }
                    } else if (e.type === 'touchend' || e.type === 'touchcancel') {
                        if (t.identifier === this.touch.joyId) {
                            this.touch.joyId = -1;
                            this.manager.move.fwd = 0;
                            this.manager.move.str = 0;
                            joyKnob.style.transform = 'translate(-50%, -50%)';
                        }
                        
                        if (t.identifier === this.touch.lookId) {
                            this.touch.lookId = -1;
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
        const btnSprint = document.getElementById('btn-sprint');
        return btnSprint && btnSprint.classList.contains('active');
    }
}