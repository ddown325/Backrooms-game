import { createLargePillar } from './structures/large_pillar.js';
import { createSmallPillars } from './structures/small_pillars.js';
import { createCirclePillar } from './structures/circle_pillar.js';
import { createHalfWalls } from './structures/half_walls.js';
import { createDefaultWalls } from './structures/default_walls.js';
import { CONFIG } from '../config.js';
import { EngineMath } from '../utils.js';

function setTextureRepeat(geo) {
    const uvAttribute = geo.getAttribute('uv');
    const posAttribute = geo.getAttribute('position');
    const normalAttribute = geo.getAttribute('normal');
    
    for (let i = 0; i < uvAttribute.count; i++) {
        const u = uvAttribute.getX(i);
        const v = uvAttribute.getY(i);

        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const z = posAttribute.getZ(i);

        const nx = normalAttribute.getX(i);
        const ny = normalAttribute.getY(i);
        const nz = normalAttribute.getZ(i);
        
        let newU, newV;

        if (Math.abs(nx) > 0.5) { // Side face (X)
            newU = z / 4;
            newV = y / 4;
        } else if (Math.abs(nz) > 0.5) { // Side face (Z)
            newU = x / 4;
            newV = y / 4;
        } else { // Top/bottom face
            newU = x / 4;
            newV = z / 4;
        }
        
        uvAttribute.setXY(i, newU, newV);
    }
    uvAttribute.needsUpdate = true;
}

export function createStructures(chunkPosition, material, seed) {
    const structureType = seed * 10;
    const vLen = (0.1 + (seed * 0.9)) * CONFIG.CHUNK_SIZE;
    const hLen = (0.1 + (EngineMath.getHash(chunkPosition.z, chunkPosition.x) * 0.9)) * CONFIG.CHUNK_SIZE;
    const vPosHash = EngineMath.getHash(chunkPosition.x, chunkPosition.z + 1);
    const hPosHash = EngineMath.getHash(chunkPosition.x + 1, chunkPosition.z);
    const vPosOffset = (vPosHash - 0.5) * (CONFIG.CHUNK_SIZE - vLen);
    const hPosOffset = (hPosHash - 0.5) * (CONFIG.CHUNK_SIZE - hLen);

    let structures;

    if (structureType < 0.5) {
        structures = createLargePillar(chunkPosition, material);
    } else if (structureType < 1.5) {
        structures = createSmallPillars(chunkPosition, material, vPosHash);
    } else if (structureType < 2.0) {
        structures = createCirclePillar(chunkPosition, material, vPosHash);
    } else if (structureType < 3.0) {
        structures = createHalfWalls(chunkPosition, material, vLen, hLen, vPosOffset, hPosOffset, seed);
    } else {
        structures = createDefaultWalls(chunkPosition, material, vLen, hLen, vPosOffset, hPosOffset, seed);
    }

    structures.forEach(s => setTextureRepeat(s.geometry));

    return structures;
}
