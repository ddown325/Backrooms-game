import { CONFIG } from '../../config.js';

export function createDefaultWalls(chunkPosition, material, vLen, hLen, vPosOffset, hPosOffset, seed) {
    const walls = [];

    if (seed > 0.5) {
        // Wall on positive Z edge
        const geo = new THREE.BoxGeometry(hLen, CONFIG.WALL_HEIGHT, CONFIG.WALL_THICKNESS);
        const wall = new THREE.Mesh(geo, material);
        wall.position.set(chunkPosition.x + hPosOffset, CONFIG.WALL_HEIGHT / 2, chunkPosition.z + CONFIG.CHUNK_SIZE / 2);
        walls.push(wall);
    } else {
        // Wall on negative Z edge
        const geo = new THREE.BoxGeometry(hLen, CONFIG.WALL_HEIGHT, CONFIG.WALL_THICKNESS);
        const wall = new THREE.Mesh(geo, material);
        wall.position.set(chunkPosition.x + hPosOffset, CONFIG.WALL_HEIGHT / 2, chunkPosition.z - CONFIG.CHUNK_SIZE / 2);
        walls.push(wall);
    }

    if (seed * 2 > 1) {
        // Wall on positive X edge
        const geo = new THREE.BoxGeometry(CONFIG.WALL_THICKNESS, CONFIG.WALL_HEIGHT, vLen);
        const wall = new THREE.Mesh(geo, material);
        wall.position.set(chunkPosition.x + CONFIG.CHUNK_SIZE / 2, CONFIG.WALL_HEIGHT / 2, chunkPosition.z + vPosOffset);
        walls.push(wall);
    } else {
        // Wall on negative X edge
        const geo = new THREE.BoxGeometry(CONFIG.WALL_THICKNESS, CONFIG.WALL_HEIGHT, vLen);
        const wall = new THREE.Mesh(geo, material);
        wall.position.set(chunkPosition.x - CONFIG.CHUNK_SIZE / 2, CONFIG.WALL_HEIGHT / 2, chunkPosition.z + vPosOffset);
        walls.push(wall);
    }

    return walls;
}
