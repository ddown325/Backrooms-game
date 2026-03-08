import { CONFIG } from '../../config.js';

export function createCirclePillar(chunkPosition, material, vPosHash) {
    const radius = (1 + vPosHash * 2) / 2;
    const geo = new THREE.CylinderGeometry(radius, radius, CONFIG.WALL_HEIGHT, 32);
    const pillar = new THREE.Mesh(geo, material);
    pillar.position.set(chunkPosition.x, CONFIG.WALL_HEIGHT / 2, chunkPosition.z);
    pillar.userData.isPillar = true;
    pillar.userData.radius = radius;
    return [pillar];
}
