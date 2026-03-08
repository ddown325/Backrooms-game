import { CONFIG } from '../config.js';

export function createCeiling(position, material) {
    const geo = new THREE.PlaneGeometry(CONFIG.CHUNK_SIZE, CONFIG.CHUNK_SIZE);
    const ceiling = new THREE.Mesh(geo, material);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.copy(position);
    ceiling.position.y = CONFIG.WALL_HEIGHT;
    return ceiling;
}