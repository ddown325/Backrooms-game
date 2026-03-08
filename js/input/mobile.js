
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
                        // Left side of screen: joystick
                        if (t.clientX < window.innerWidth / 2) {
                            if (this.touch.joyId < 0) {
                                this.touch.joyId = t.identifier;
                                joyBase.style.display = 'block';
                                joyBase.style.left = `${t.clientX - 50}px`;
                                joyBase.style.top = `${t.clientY - 50}px`;
                                this.touch.joyX = t.clientX;
                                this.touch.joyY = t.clientY;
                            }
                        }
                        // Right side of screen: action or look
                        else {
                            if (this.inside(t, btnAction)) {
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
                        }
                    } else if (e.type === 'touchmove') {
                        if (t.identifier === this.touch.joyId) {
                            const dx = t.clientX - this.touch.joyX;
                            const dy = t.clientY - this.touch.joyY;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const angle = Math.atan2(dy, dx);
                            const maxDist = 40;

                            if (dist > maxDist) {
                                this.touch.joyX = t.clientX - Math.cos(angle) * maxDist;
                                this.touch.joyY = t.clientY - Math.sin(angle) * maxDist;
                            }

                            joyKnob.style.left = `${t.clientX - this.touch.joyX}px`;
                            joyKnob.style.top = `${t.clientY - this.touch.joyY}px`;

                            const power = Math.min(dist, maxDist) / maxDist;
                            this.manager.move.fwd = -Math.sin(angle) * power;
                            this.manager.move.str = Math.cos(angle) * power;
                        } else if (t.identifier === this.touch.lookId) {
                            const dx = t.clientX - this.touch.lookX;
                            const dy = t.clientY - this.touch.lookY;
                            this.touch.lookX = t.clientX;
                            this.touch.lookY = t.clientY;
                            
                            this.manager.look.x += dx * 0.5;
                            this.manager.look.y += dy * 0.5;
                        } else if (t.identifier === this.touch.actionId) {
                            if (this.inside(t, btnAction)) {
                                btnAction.classList.add('active');
                            } else {
                                btnAction.classList.remove('active');
                            }
                        }
                    } else if (e.type === 'touchend' || e.type === 'touchcancel') {
                        if (t.identifier === this.touch.joyId) {
                            this.touch.joyId = -1;
                            this.manager.move.fwd = 0;
                            this.manager.move.str = 0;
                            joyBase.style.display = 'none';
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
