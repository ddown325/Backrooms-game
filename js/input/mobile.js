
export class MobileInput {
    constructor(manager) {
        this.manager = manager;
        this.touch = { x: 0, y: 0, x2: 0, y2: 0, down: false, id: -1, id2: -1 };
        
        const joyBase = document.getElementById('joy-base');
        const joyKnob = document.getElementById('joy-knob');
        const btnAction = document.getElementById('btn-action');

        if(manager.isMobile) document.getElementById('mobile-controls').style.display = 'flex';

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
                            else {
                                this.touch.x2 = t.clientX; this.touch.y2 = t.clientY;
                            }
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

                            this.manager.move.fwd = -Math.sin(angle) * (dist/maxDist);
                            this.manager.move.str = Math.cos(angle) * (dist/maxDist);
                        } else if (t.identifier === this.touch.id2) {
                            if (this.inside(t, btnAction)) {
                                btnAction.classList.add('active');
                            } else {
                                btnAction.classList.remove('active');
                                const dx = t.clientX - this.touch.x2;
                                const dy = t.clientY - this.touch.y2;
                                this.manager.look.x += dx * 0.5;
                                this.manager.look.y += dy * 0.5;
                                this.touch.x2 = t.clientX; this.touch.y2 = t.clientY;
                            }
                        }
                    } else if (e.type === 'touchend' || e.type === 'touchcancel') {
                        if (t.identifier === this.touch.id) {
                            this.touch.id = -1; this.touch.down = false; this.manager.move.fwd = 0; this.manager.move.str = 0;
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

    isAction() {
        return document.getElementById('btn-action').classList.contains('active');
    }
}
