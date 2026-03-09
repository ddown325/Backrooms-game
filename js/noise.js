export class NoiseGenerator {
    constructor(seed) {
        this.p = new Uint8Array(512);
        const prng = this._createPrng(seed);

        const perm = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            perm[i] = i;
        }

        for (let i = 255; i > 0; i--) {
            const j = Math.floor(prng() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }

        for (let i = 0; i < 256; i++) {
            this.p[i] = this.p[i + 256] = perm[i];
        }
    }

    _createPrng(seed) {
        let s = seed;
        return function() {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    _fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10); // 6t^5 - 15t^4 + 10t^3
    }

    _lerp(a, b, t) {
        return a + t * (b - a);
    }

    _grad(hash, x, y) {
        const h = hash & 7; // Convert low 3 bits of hash code
        const u = h < 4 ? x : y; // Into 8 simple gradient directions
        const v = h < 4 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    getNoise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this._fade(x);
        const v = this._fade(y);
        
        const p = this.p;
        const A = p[X] + Y;
        const B = p[X + 1] + Y;

        return this._lerp(
            this._lerp(this._grad(p[A], x, y), this._grad(p[B], x - 1, y), u),
            this._lerp(this._grad(p[A + 1], x, y - 1), this._grad(p[B + 1], x - 1, y - 1), u),
            v
        );
    }
}
