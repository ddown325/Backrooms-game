import { CONFIG } from './config.js';
import { EngineMath } from './utils.js';
import { TextureFactory } from './textures.js';
import { InputManager } from './input.js';
import { Player } from './player.js';

/**
 * App: Master Controller
 */
class App {
    static start(gfx) {
        document.getElementById('overlay').style.display = 'none';
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a00);
        this.scene.fog = new THREE.Fog(0x0a0a00, 1, CONFIG.CHUNK_SIZE * 1.8);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 60);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: gfx === 'HIGH', precision: "lowp" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(gfx === 'LOW' ? 0.6 : (window.devicePixelRatio || 1));
        document.body.appendChild(this.renderer.domElement);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

        this.input = new InputManager();
        this.player = new Player(this.scene, this.camera);
        this.clock = new THREE.Clock();

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
        
        this.pickupPrompt = document.getElementById('pickup-prompt');
        this.isMobile = this.input.isMobile;

        this.frustum = new THREE.Frustum();
        this.projMatrix = new THREE.Matrix4();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    static getBiome(cx, cz) {
        const n = Math.sin(cx * 0.2) * Math.cos(cz * 0.2);
        if (n < -0.7) return { name: "BLUE", t: 'B', fog: 0x001122, drain: -0.4 };
        if (n > 0.6) return { name: "RED", t: 'R', fog: 0x110000, drain: -4.0 };
        return { name: "YELLOW", t: 'Y', fog: 0x0a0a00, drain: -0.6 };
    }

    static buildChunk(cx, cz) {
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

    static animate() {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);

        this.player.update(dt, this.input, this.activeWalls, this.activeItems);

        const pcx = Math.round(this.player.yaw.position.x / CONFIG.CHUNK_SIZE);
        const pcz = Math.round(this.player.yaw.position.z / CONFIG.CHUNK_SIZE);
        const curBiome = this.getBiome(pcx, pcz);

        document.getElementById('ui-biome').innerText = curBiome.name;
        document.getElementById('ui-biome').style.color = curBiome.t === 'B' ? '#55aaff' : (curBiome.t === 'R' ? '#ff5555' : '#ffffaa');
        this.scene.fog.color.set(curBiome.fog);
        
        this.player.sanity = EngineMath.clamp(this.player.sanity + curBiome.drain * dt, 0, 100);
        this.player.updateUI();

        for(let x=-CONFIG.RENDER_DIST; x<=CONFIG.RENDER_DIST; x++) {
            for(let z=-CONFIG.RENDER_DIST; z<=CONFIG.RENDER_DIST; z++) {
                this.buildChunk(pcx+x, pcz+z);
            }
        }

        this.camera.updateMatrixWorld();
        this.projMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.projMatrix);

        let foundItem = false;
        if (!this.isMobile) {
            for(const item of this.activeItems) {
                if (!item.parent.visible || !item.visible) continue;
                const dist = this.player.yaw.position.distanceTo(item.getWorldPosition(new THREE.Vector3()));
                if (dist < CONFIG.PICKUP_RADIUS) {
                    const screenPos = item.getWorldPosition(new THREE.Vector3()).project(this.camera);
                    this.pickupPrompt.style.display = 'block';
                    this.pickupPrompt.style.left = `${(screenPos.x * 0.5 + 0.5) * window.innerWidth}px`;
                    this.pickupPrompt.style.top = `${(-screenPos.y * 0.5 + 0.5) * window.innerHeight}px`;
                    foundItem = true;
                    break;
                }
            }
        }
        if (!foundItem) this.pickupPrompt.style.display = 'none';

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
                chunk.g.visible = this.frustum.intersectsSphere(sphere);
                if (chunk.light) chunk.light.visible = (maxDist <= 1);
            }
        });

        this.renderer.render(this.scene, this.camera);
    }
}

window.App = App;
