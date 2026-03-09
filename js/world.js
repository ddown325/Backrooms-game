import { CONFIG } from './config.js';
import { EngineMath } from './utils.js';
import { TextureFactory } from './textures.js';
import { createFloor } from './world/floor.js';
import { createCeiling } from './world/ceiling.js';
import { createWalls } from './world/wall.js';
import { createItem } from './world/item.js';
import { NoiseGenerator } from './noise.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.activeWalls = [];
        this.activeItems = [];
        this.noiseGens = {};
        this.biomeParams = {};

        this.floorGroup = new THREE.Group();
        this.scene.add(this.floorGroup);
        this.ceilingGroup = new THREE.Group();
        this.scene.add(this.ceilingGroup);
        this.wallsGroup = new THREE.Group();
        this.scene.add(this.wallsGroup);
        this.itemsGroup = new THREE.Group();
        this.scene.add(this.itemsGroup);

        const wallTexture = TextureFactory.generate('wallpaper');
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;

        this.mats = {
            floor: new THREE.MeshLambertMaterial({ map: TextureFactory.generate('carpet'), color: 0xffffff }),
            ceil: new THREE.MeshLambertMaterial({ map: TextureFactory.generate('ceiling'), color: 0xffffff }),
            wallY: new THREE.MeshLambertMaterial({ map: wallTexture, color: 0xffffff }),
            waterBottle: new THREE.MeshStandardMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.6,
                roughness: 0.3,
                metalness: 0.1
            }),
            waterCap: new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 1,
                metalness: 0
            })
        };

        this.baseColor = new THREE.Color(0xffffff);
        this.redColor = new THREE.Color(0.56, 0.07, 0.07);
        this.blueColor = new THREE.Color(0.26, 0.26, 0.6);
    }

    getNoiseGenerator(seed) {
        if (!this.noiseGens[seed]) {
            this.noiseGens[seed] = new NoiseGenerator(seed);
        }
        return this.noiseGens[seed];
    }

    getBiomeParams(seed) {
        if (!this.biomeParams[seed]) {
            const createPrng = (s) => {
                let seed = s;
                return () => {
                    seed = (seed * 9301 + 49297) % 233280;
                    return seed / 233280;
                };
            };
            const prng = createPrng(seed);

            // Control biome size. Freq between 1/62 and 1/12. 
            const minFreq = 1 / 62;
            const maxFreq = 1 / 12;
            const freq1 = minFreq + prng() * (maxFreq - minFreq);
            const freq2 = freq1 * 2 + prng() * (freq1 * 2);

            const amp1 = 0.7 + prng() * 0.2;
            const amp2 = 1.0 - amp1;

            // Widen the gap to ensure Red and Blue are far apart
            const blueThreshold = -0.5 - prng() * 0.1; // Range [-0.6, -0.5]
            const redThreshold = 0.5 + prng() * 0.1;   // Range [ 0.5,  0.6]

            this.biomeParams[seed] = { freq1, freq2, amp1, amp2, blueThreshold, redThreshold };
        }
        return this.biomeParams[seed];
    }

    getBiome(cx, cz, seed) {
        const noiseGen = this.getNoiseGenerator(seed);
        const params = this.getBiomeParams(seed);
        
        let n = 0;
        n += noiseGen.getNoise(cx * params.freq1, cz * params.freq1) * params.amp1;
        n += noiseGen.getNoise(cx * params.freq2, cz * params.freq2) * params.amp2;
        n /= (params.amp1 + params.amp2);

        // Enforce safe zone around origin (0,0)
        const distFromOrigin = Math.sqrt(cx*cx + cz*cz);
        const safeZoneRadius = 40;
        if (distFromOrigin < safeZoneRadius) {
            const blendFactor = (distFromOrigin / safeZoneRadius);
            n *= Math.pow(blendFactor, 2); // Smoothly blend noise to 0 (Yellow)
        }

        if (n < params.blueThreshold) return { name: "BLUE", t: 'B', fog: 0x000000, drain: -0.4 };
        if (n > params.redThreshold) return { name: "RED", t: 'R', fog: 0x000000, drain: -2.0 };
        return { name: "YELLOW", t: 'Y', fog: 0x000000, drain: -0.6 };
    }

    buildChunk(cx, cz, player = null) {
        const key = `${cx},${cz}`;
        if (this.chunks.has(key)) return;

        const playerExclusionZone = player ? new THREE.Box3().setFromCenterAndSize(
            player.yaw.position,
            new THREE.Vector3(2, 4, 2) // Safety box around the player
        ) : null;

        const b = this.getBiome(cx, cz, player ? player.seed : 0);
        const seed = EngineMath.getHash(cx, cz, player ? player.seed : 0);
        
        const chunkPosition = new THREE.Vector3(cx * CONFIG.CHUNK_SIZE, 0, cz * CONFIG.CHUNK_SIZE);

        const chunkData = {
            cx, cz, b,
            position: chunkPosition,
            floor: null,
            ceiling: null,
            walls: [],
            items: []
        };

        const floor = createFloor(chunkPosition, this.mats.floor);
        this.floorGroup.add(floor);
        chunkData.floor = floor;

        const ceiling = createCeiling(chunkPosition, this.mats.ceil);
        this.ceilingGroup.add(ceiling);
        chunkData.ceiling = ceiling;

        const walls = createWalls(chunkPosition, this.mats.wallY, seed);
        walls.forEach(wall => {
            if (playerExclusionZone) {
                const wallBBox = new THREE.Box3().setFromObject(wall);
                if (wallBBox.intersectsBox(playerExclusionZone)) {
                    return; // Don't add this wall if it intersects
                }
            }
            this.wallsGroup.add(wall);
            this.activeWalls.push(wall);
            chunkData.walls.push(wall);
        });

        const item = createItem(chunkPosition, this.mats, seed);
        if (item) {
            const itemBBox = new THREE.Box3().setFromObject(item);
            let intersects = false;

            if (playerExclusionZone && itemBBox.intersectsBox(playerExclusionZone)) {
                intersects = true;
            }

            if (!intersects) {
                for(const wall of chunkData.walls) { 
                    const wallBBox = new THREE.Box3().setFromObject(wall);
                    if (itemBBox.intersectsBox(wallBBox)) {
                        intersects = true;
                        break;
                    }
                }
            }

            if (!intersects) {
                this.itemsGroup.add(item);
                this.activeItems.push(item);
                chunkData.items.push(item);
            }
        }

        this.chunks.set(key, chunkData);
    }

    update(player, frustum) {
        const pcx = Math.floor(player.yaw.position.x / CONFIG.CHUNK_SIZE);
        const pcz = Math.floor(player.yaw.position.z / CONFIG.CHUNK_SIZE);
        
        for(let x=-CONFIG.RENDER_DIST; x<=CONFIG.RENDER_DIST; x++) {
            for(let z=-CONFIG.RENDER_DIST; z<=CONFIG.RENDER_DIST; z++) {
                this.buildChunk(pcx + x, pcz + z, player);
            }
        }

        this.chunks.forEach((chunk, key) => {
            const distX = Math.abs(chunk.cx - pcx);
            const distZ = Math.abs(chunk.cz - pcz);
            const maxDist = Math.max(distX, distZ);
            
            if (maxDist > CONFIG.RENDER_DIST) {
                if (chunk.floor) this.floorGroup.remove(chunk.floor);
                if (chunk.ceiling) this.ceilingGroup.remove(chunk.ceiling);

                chunk.walls.forEach(wall => this.wallsGroup.remove(wall));
                this.activeWalls = this.activeWalls.filter(w => !chunk.walls.includes(w));

                chunk.items.forEach(item => {
                    this.itemsGroup.remove(item);
                    const itemIndex = this.activeItems.indexOf(item);
                    if(itemIndex > -1) this.activeItems.splice(itemIndex, 1);
                });

                this.chunks.delete(key);
            } else {
                const sphere = new THREE.Sphere(chunk.position, CONFIG.CHUNK_SIZE);
                const isVisible = frustum.intersectsSphere(sphere);

                if(chunk.floor) chunk.floor.visible = isVisible;
                if(chunk.ceiling) chunk.ceiling.visible = isVisible;
                chunk.walls.forEach(wall => wall.visible = isVisible);
                chunk.items.forEach(item => {
                    if (item.userData.isPickedUp) {
                        item.visible = false;
                    } else {
                        item.visible = isVisible;
                    }
                });
            }
        });
        
        const biomeInfo = this.getBiome(pcx, pcz, player.seed);
        let biomeColor = this.baseColor.clone();
        const params = this.getBiomeParams(player.seed);

        if (biomeInfo.name === "RED") {
            biomeColor.copy(this.redColor);
        } else if (biomeInfo.name === "BLUE") {
            biomeColor.copy(this.blueColor);
        } else { // Current chunk is YELLOW, so we apply smooth fading
            const noiseGen = this.getNoiseGenerator(player.seed);
            const playerX = player.yaw.position.x / CONFIG.CHUNK_SIZE;
            const playerZ = player.yaw.position.z / CONFIG.CHUNK_SIZE;

            let n = 0;
            n += noiseGen.getNoise(playerX * params.freq1, playerZ * params.freq1) * params.amp1;
            n += noiseGen.getNoise(playerX * params.freq2, playerZ * params.freq2) * params.amp2;
            n /= (params.amp1 + params.amp2);

            // Apply same safe zone logic for the player's position
            const distFromOrigin = Math.sqrt(playerX*playerX + playerZ*playerZ);
            const safeZoneRadius = 40;
            if (distFromOrigin < safeZoneRadius) {
                const blendFactor = (distFromOrigin / safeZoneRadius);
                n *= Math.pow(blendFactor, 2);
            }

            const transitionZoneSize = (params.redThreshold - params.blueThreshold) * 0.4; 
            const blueTransitionEnd = params.blueThreshold + transitionZoneSize;
            const redTransitionStart = params.redThreshold - transitionZoneSize;
            
            if (n < blueTransitionEnd) { // In blue-yellow transition
                const t = (n - params.blueThreshold) / transitionZoneSize;
                const smooth_t = 1.0 - (t * t * (3.0 - 2.0 * t)); // Inverse Smoothstep
                biomeColor.lerp(this.blueColor, smooth_t * 0.75); // Fade up to 75% to blue
            } else if (n > redTransitionStart) { // In red-yellow transition
                const t = (n - redTransitionStart) / transitionZoneSize;
                const smooth_t = t * t * (3.0 - 2.0 * t); // Smoothstep
                biomeColor.lerp(this.redColor, smooth_t * 0.75); // Fade up to 75% to red
            }
        }

        this.mats.floor.color.copy(biomeColor);
        this.mats.ceil.color.copy(biomeColor);
        this.mats.ceil.color.multiplyScalar(0.85);
        this.mats.wallY.color.copy(biomeColor);
        this.mats.wallY.color.multiplyScalar(1.4);

        return biomeInfo;
    }
}
