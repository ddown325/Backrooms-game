/**
 * Utility Class: Internal Engine Math
 */
export class EngineMath {
    static clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
    static lerp(a, b, t) { return a + (b - a) * t; }
    static getHash(x, z) {
        const seed = x * 15485863 + z * 32452843;
        return (Math.abs(Math.sin(seed) * 43758.5453) % 1);
    }
}