import { CONFIG } from '../../config.js';

export function createLargePillar(chunkPosition, material) {
    const width = CONFIG.WALL_THICKNESS;
    const height = CONFIG.WALL_HEIGHT;
    const depth = CONFIG.WALL_THICKNESS;

    const geo = new THREE.BoxGeometry(width, height, depth);
    
    const pillar = new THREE.Mesh(geo, material);
    pillar.position.set(chunkPosition.x, CONFIG.WALL_HEIGHT / 2, chunkPosition.z);
    return [pillar];
}
