import { CONFIG } from '../config.js';

export function createFloor(position, material) {
    const geo = new THREE.PlaneGeometry(CONFIG.CHUNK_SIZE, CONFIG.CHUNK_SIZE);
    const floor = new THREE.Mesh(geo, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.copy(position);
    return floor;
}