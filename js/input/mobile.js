
export class MobileInput {
    constructor(manager) {
        this.manager = manager;
        this.touch = {
            joyId: -1, joyX: 0, joyY: 0,
            lookId: -1, lookX: 0, lookY: 0,
            actionId: -1
        };

        const joyBase = document.getElementById('joy-base');
        const joyKnob = document.getElementById('joy-knob');
        const btnAction = document.getElementById('btn-action');

        if (manager.isMobile) {
            document.getElementById('mobile-controls').style.display = 'flex';
        }

        const touchHandler = (e) => {
            if (document.getElementById('overlay').style.display === 'none') {
                e.preventDefault();

                for (const t of e.changedTouches) {
                    if (e.type === 'touchstart') {
                        if (this.inside(t, joyBase)) {
                            if (this.touch.joyId < 0) {
                                this.touch.joyId = t.identifier;
                                this.touch.joyX = t.clientX;
                                this.touch.joyY = t.clientY;
                            }
                        } else if (this.inside(t, btnAction)) {
                            if (this.touch.actionId < 0) {
                                this.touch.actionId = t.identifier;
                                btnAction.classList.add('active');
                            }
                        } else {
                            if (this.touch.lookId < 0) {
                                this.touch.lookId = t.identifier;
                                this.touch.lookX = t.clientX;
                                this.touch.lookY = t.clientY;
                            }
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
                            joyKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

                            const power = Math.min(dist, maxDist) / maxDist;
                            this.manager.move.fwd = Math.sin(angle) * power;
                            this.manager.move.str = -Math.cos(angle) * power;
                        } else if (t.identifier === this.touch.lookId) {
                            const dx = t.clientX - this.touch.lookX;
                            const dy = t.clientY - this.touch.lookY;
                            this.touch.lookX = t.clientX;
                            this.touch.lookY = t.clientY;
                            
                            this.manager.look.x += dx * 4;
                            this.manager.look.y += dy * 4;
                        }
                    } else if (e.type === 'touchend' || e.type === 'touchcancel') {
                        if (t.identifier === this.touch.joyId) {
                            this.touch.joyId = -1;
                            this.manager.move.fwd = 0;
                            this.manager.move.str = 0;
                            joyKnob.style.transform = 'translate(0, 0)';
                        } else if (t.identifier === this.touch.lookId) {
                            this.touch.lookId = -1;
                        } else if (t.identifier === this.touch.actionId) {
                            this.touch.actionId = -1;
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

    isAction() {
        return document.getElementById('btn-action').classList.contains('active');
    }
}
