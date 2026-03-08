import { CONFIG } from '../config.js';
import { EngineMath } from '../utils.js';

export function createWalls(chunkPosition, material, seed) {
    const walls = [];
    const vLen = (0.4 + (seed * 0.5)) * CONFIG.CHUNK_SIZE;
    const hLen = (0.4 + (EngineMath.getHash(chunkPosition.z, chunkPosition.x) * 0.5)) * CONFIG.CHUNK_SIZE;

    const vGeo = new THREE.BoxGeometry(CONFIG.WALL_THICKNESS, CONFIG.WALL_HEIGHT, vLen);
    const hGeo = new THREE.BoxGeometry(hLen, CONFIG.WALL_HEIGHT, CONFIG.WALL_THICKNESS);

    if (seed > 0.4) {
        const wV = new THREE.Mesh(vGeo, material);
        wV.position.set(chunkPosition.x - CONFIG.CHUNK_SIZE / 2, CONFIG.WALL_HEIGHT / 2, chunkPosition.z);
        walls.push(wV);
    }

    if (seed < 0.6) {
        const wH = new THREE.Mesh(hGeo, material);
        wH.position.set(chunkPosition.x, CONFIG.WALL_HEIGHT / 2, chunkPosition.z - CONFIG.CHUNK_SIZE / 2);
        walls.push(wH);
    }

    return walls;
}