import { CONFIG } from './config.js';
import { EngineMath } from './utils.js';
import { TextureFactory } from './textures.js';
import { createFloor } from './world/floor.js';
import { createCeiling } from './world/ceiling.js';
import { createWalls } from './world/wall.js';
import { createItem } from './world/item.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.activeWalls = [];
        this.activeItems = [];

        this.floorGroup = new THREE.Group();
        this.scene.add(this.floorGroup);
        this.ceilingGroup = new THREE.Group();
        this.scene.add(this.ceilingGroup);
        this.wallsGroup = new THREE.Group();
        this.scene.add(this.wallsGroup);
        this.itemsGroup = new THREE.Group();
        this.scene.add(this.itemsGroup);

        this.mats = {
            floor: new THREE.MeshLambertMaterial({ map: TextureFactory.generate('carpet'), color: 0xffffff }),
            ceil: new THREE.MeshLambertMaterial({ map: TextureFactory.generate('ceiling'), color: 0xffffff }),
            wallY: new THREE.MeshLambertMaterial({ map: TextureFactory.generate('wallpaper'), color: 0xffffff }),
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
        this.redColor = new THREE.Color(0.8, 0.1, 0.1);
        this.blueColor = new THREE.Color(0.1, 0.1, 0.8);
    }

    getBiome(cx, cz) {
        const n = Math.sin(cx * 0.2) * Math.cos(cz * 0.2);
        if (n < -0.7) return { name: "BLUE", t: 'B', fog: 0x000000, drain: -0.4 };
        if (n > 0.6) return { name: "RED", t: 'R', fog: 0x000000, drain: -4.0 };
        return { name: "YELLOW", t: 'Y', fog: 0x000000, drain: -0.6 };
    }

    buildChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (this.chunks.has(key)) return;

        const b = this.getBiome(cx, cz);
        const seed = EngineMath.getHash(cx, cz);
        
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
            this.wallsGroup.add(wall);
            this.activeWalls.push(wall);
            chunkData.walls.push(wall);
        });

        const item = createItem(chunkPosition, this.mats, seed);
        if (item) {
            this.itemsGroup.add(item);
            this.activeItems.push(item);
            chunkData.items.push(item);
        }

        this.chunks.set(key, chunkData);
    }

    update(player, frustum) {
        const pcx = Math.round(player.yaw.position.x / CONFIG.CHUNK_SIZE);
        const pcz = Math.round(player.yaw.position.z / CONFIG.CHUNK_SIZE);
        
        for(let x=-CONFIG.RENDER_DIST; x<=CONFIG.RENDER_DIST; x++) {
            for(let z=-CONFIG.RENDER_DIST; z<=CONFIG.RENDER_DIST; z++) {
                this.buildChunk(pcx+x, pcz+z);
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
        
        const biomeInfo = this.getBiome(pcx, pcz);

        const scaledX = player.yaw.position.x / CONFIG.CHUNK_SIZE;
        const scaledZ = player.yaw.position.z / CONFIG.CHUNK_SIZE;
        const n = Math.sin(scaledX * 0.2) * Math.cos(scaledZ * 0.2);

        const red_threshold = 0.6;
        const blue_threshold = -0.7;
        const transition_width = 0.075;

        let lerpFactor = 0;
        let targetColor = null;

        const red_transition_start = red_threshold - transition_width;
        if (n > red_transition_start) {
            targetColor = this.redColor;
            lerpFactor = Math.min(1, (n - red_transition_start) / transition_width);
        }

        const blue_transition_start = blue_threshold + transition_width;
        if (n < blue_transition_start) {
            targetColor = this.blueColor;
            lerpFactor = Math.min(1, (blue_transition_start - n) / transition_width);
        }
        
        const newColor = this.baseColor.clone();
        if (targetColor) {
            newColor.lerp(targetColor, lerpFactor);
        }

        this.mats.floor.color.copy(newColor);
        this.mats.ceil.color.copy(newColor);
        this.mats.wallY.color.copy(newColor);

        return biomeInfo;
    }
}
