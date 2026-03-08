import { CONFIG } from '../config.js';

export function createItem(chunkPosition, materials, seed) {
    const cx = Math.floor(chunkPosition.x / CONFIG.CHUNK_SIZE);
    const cz = Math.floor(chunkPosition.z / CONFIG.CHUNK_SIZE);
    const bottleId = `bottle_${cx}_${cz}`;

    if (sessionStorage.getItem(bottleId)) {
        return null; // Bottle has been picked up
    }

    if (seed > 0.95) {
        const bottle = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 12), materials.waterBottle.clone());
        body.position.y = 0.2;
        body.userData.originalColor = materials.waterBottle.color.clone();

        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.3, 12), materials.waterBottle.clone());
        water.position.y = 0.15;
        water.userData.originalColor = materials.waterBottle.color.clone();

        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), materials.waterCap.clone());
        cap.position.y = 0.425;
        cap.userData.originalColor = materials.waterCap.color.clone();

        bottle.add(body);
        bottle.add(water);
        bottle.add(cap);
        
        bottle.position.set(chunkPosition.x + (seed - 0.5) * 10, 0, chunkPosition.z + (seed - 0.5) * 10);
        bottle.userData.isPickup = true;
        bottle.userData.bottleId = bottleId;
        return bottle;
    }
    return null;
}