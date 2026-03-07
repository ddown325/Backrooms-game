import { CONFIG } from './config.js';
import { EngineMath } from './utils.js';
import { TextureFactory } from './textures.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.activeWalls = [];
        this.activeItems = [];

        this.mats = {
            floor: new THREE.MeshLambertMaterial({ map: TextureFactory.generate('carpet') }),
            ceil: new THREE.MeshLambertMaterial({ map: TextureFactory.generate('ceiling') }),
            wallY: new THREE.MeshLambertMaterial({ map: TextureFactory.generate('wallpaper') }),
            wallB: new THREE.MeshLambertMaterial({ color: 0x002244 }),
            wallR: new THREE.MeshLambertMaterial({ color: 0x330000 })
        };
        
        this.geo = {
            plane: new THREE.PlaneGeometry(CONFIG.CHUNK_SIZE, CONFIG.CHUNK_SIZE),
            water: new THREE.CylinderGeometry(0.15, 0.15, 0.5, 6)
        };
    }

    getBiome(cx, cz) {
        const n = Math.sin(cx * 0.2) * Math.cos(cz * 0.2);
        if (n < -0.7) return { name: "BLUE", t: 'B', fog: 0x001122, drain: -0.4 };
        if (n > 0.6) return { name: "RED", t: 'R', fog: 0x110000, drain: -4.0 };
        return { name: "YELLOW", t: 'Y', fog: 0x0a0a00, drain: -0.6 };
    }

    buildChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (this.chunks.has(key)) return;

        const b = this.getBiome(cx, cz);
        const seed = EngineMath.getHash(cx, cz);
        const group = new THREE.Group();

        const f = new THREE.Mesh(this.geo.plane, b.t === 'Y' ? this.mats.floor : new THREE.MeshLambertMaterial({color: b.fog}));
        f.rotation.x = -Math.PI/2; group.add(f);
        
        const c = new THREE.Mesh(this.geo.plane, b.t === 'Y' ? this.mats.ceil : new THREE.MeshLambertMaterial({color: b.fog}));
        c.position.y = CONFIG.WALL_HEIGHT; c.rotation.x = Math.PI/2; group.add(c);

        const light = new THREE.PointLight(0xffffee, 0.5, CONFIG.CHUNK_SIZE * 1.4);
        light.position.set(0, 3.8, 0);
        group.add(light);

        let wMat = b.t === 'R' ? this.mats.wallR : (b.t === 'B' ? this.mats.wallB : this.mats.wallY);

        const vLen = (0.4 + (seed * 0.5)) * CONFIG.CHUNK_SIZE;
        const hLen = (0.4 + (EngineMath.getHash(cz, cx) * 0.5)) * CONFIG.CHUNK_SIZE;

        const vGeo = new THREE.BoxGeometry(CONFIG.WALL_THICKNESS, CONFIG.WALL_HEIGHT, vLen);
        const hGeo = new THREE.BoxGeometry(hLen, CONFIG.WALL_HEIGHT, CONFIG.WALL_THICKNESS);

        if (seed > 0.4) {
            const wV = new THREE.Mesh(vGeo, wMat);
            wV.position.set(-CONFIG.CHUNK_SIZE/2, CONFIG.WALL_HEIGHT/2, 0);
            group.add(wV); this.activeWalls.push(wV);
        }

        if (seed < 0.6) {
            const wH = new THREE.Mesh(hGeo, wMat);
            wH.position.set(0, CONFIG.WALL_HEIGHT/2, -CONFIG.CHUNK_SIZE/2);
            group.add(wH); this.activeWalls.push(wH);
        }

        if (seed > 0.95) {
            const water = new THREE.Mesh(this.geo.water, new THREE.MeshBasicMaterial({color:0x88ccff}));
            water.position.set((seed-0.5)*10, 0.25, (seed-0.5)*10);
            water.userData.isPickup = true;
            group.add(water); this.activeItems.push(water);
        }

        group.position.set(cx * CONFIG.CHUNK_SIZE, 0, cz * CONFIG.CHUNK_SIZE);
        this.scene.add(group);
        this.chunks.set(key, { g: group, cx, cz, b, light: light });
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
                this.scene.remove(chunk.g);
                this.chunks.delete(key);
                this.activeWalls = this.activeWalls.filter(w => w.parent !== chunk.g);
                this.activeItems = this.activeItems.filter(i => i.parent !== chunk.g);
            } else {
                const sphere = new THREE.Sphere(chunk.g.position, CONFIG.CHUNK_SIZE);
                chunk.g.visible = frustum.intersectsSphere(sphere);
                if (chunk.light) chunk.light.visible = (maxDist <= 1);
            }
        });

        return this.getBiome(pcx, pcz);
    }
}