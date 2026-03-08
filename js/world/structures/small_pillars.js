import { CONFIG } from '../../config.js';
import { EngineMath } from '../../utils.js';

export function createSmallPillars(chunkPosition, material, vPosHash) {
    const pillars = [];
    const count = 2 + Math.floor(vPosHash * 4); // 2 to 5 pillars
    for(let i=0; i<count; i++) {
        const geo = new THREE.BoxGeometry(CONFIG.WALL_THICKNESS, CONFIG.WALL_HEIGHT, CONFIG.WALL_THICKNESS);
        const pillar = new THREE.Mesh(geo, material);
        const x = chunkPosition.x + (EngineMath.getHash(i, 1) - 0.5) * CONFIG.CHUNK_SIZE;
        const z = chunkPosition.z + (EngineMath.getHash(i, 2) - 0.5) * CONFIG.CHUNK_SIZE;
        pillar.position.set(x, CONFIG.WALL_HEIGHT / 2, z);
        pillars.push(pillar);
    }
    return pillars;
}
