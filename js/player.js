import { CONFIG } from './config.js';
import { EngineMath } from './utils.js';

const SENSITIVITY = 0.002;

/**
 * Player: Handles camera, movement, and player-specific state
 */
export class Player {
    constructor(scene, camera) {
        this.camera = camera;
        this.pitch = new THREE.Object3D();
        this.pitch.add(camera);
        this.yaw = new THREE.Object3D();
        this.yaw.add(this.pitch);
        scene.add(this.yaw);

        this.velocity = new THREE.Vector3();
        this.sanity = 100;
        this.water = 0;
        this.drinkCooldown = 0;
        this.bobTime = 0;

        this.bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    }

    drinkAlmondWater() {
        if (this.water > 0 && this.sanity < 100 && this.drinkCooldown <= 0) {
            this.water--;
            this.sanity = Math.min(100, this.sanity + 30);
            this.updateUI();
        }
    }
    
    pickupItem(items) {
        let pickedUp = false;
        for (let i = items.length - 1; i >= 0; i--) {
            let item = items[i];
            if (!item.parent.visible || !item.userData.isPickup) continue;
            let iPos = new THREE.Vector3(); item.getWorldPosition(iPos);
            let dist = this.yaw.position.distanceTo(iPos);
            
            if (dist < CONFIG.PICKUP_RADIUS) { 
                item.visible = false; 
                item.position.y = -500;
                items.splice(i, 1);
                this.water++;
                this.drinkCooldown = 0.2; // 200ms cooldown
                this.updateUI();
                pickedUp = true;
                break; 
            }
        }
        return pickedUp;
    }

    update(dt, input, walls, items) {
        if (this.drinkCooldown > 0) {
            this.drinkCooldown -= dt;
        }

        const look = input.consumeLook();
        this.yaw.rotation.y -= look.x * SENSITIVITY;
        this.pitch.rotation.x -= look.y * SENSITIVITY;
        this.pitch.rotation.x = EngineMath.clamp(this.pitch.rotation.x, -Math.PI/2, Math.PI/2);
        
        let fwd = input.move.fwd;
        let str = input.move.str;
        if (Math.abs(fwd) > 0 && Math.abs(str) > 0) {
            fwd *= 0.7071; str *= 0.7071; // Normalize diagonal speed
        }

        const speed = CONFIG.WALK_SPEED;
        
        // Corrected forward/backward movement
        this.velocity.x = (fwd * -Math.sin(this.yaw.rotation.y) + str * Math.sin(this.yaw.rotation.y + Math.PI/2)) * speed;
        this.velocity.z = (fwd * -Math.cos(this.yaw.rotation.y) + str * Math.cos(this.yaw.rotation.y + Math.PI/2)) * speed;

        this.yaw.position.x += this.velocity.x * dt;
        this.yaw.position.z += this.velocity.z * dt;
        this.collide(walls);

        // Head-bob
        const speedMagnitude = Math.sqrt(this.velocity.x*this.velocity.x + this.velocity.z*this.velocity.z);
        if (speedMagnitude > 0.1) {
            this.bobTime += dt * 12.5;
            this.camera.position.y = Math.sin(this.bobTime) * 0.1;
        } else {
            if (this.camera.position.y !== 0) {
                this.camera.position.y *= 0.9;
                if (Math.abs(this.camera.position.y) < 0.001) this.camera.position.y = 0;
            }
        }
        this.yaw.position.y = CONFIG.PLAYER_HEIGHT + this.camera.position.y;


        const wantsToDrink = input.isDrink();
        const wantsToPickup = input.isPickup();

        if (wantsToPickup || wantsToDrink) {
            let itemPickedUp = false;
            if (wantsToPickup) {
                itemPickedUp = this.pickupItem(items);
            }
            
            if (wantsToDrink && !itemPickedUp) {
                this.drinkAlmondWater();
            }
        }
    }

    updateUI() {
        document.getElementById('sanity-fill').style.width = this.sanity + "%";
        document.getElementById('sanity-fill').style.background = this.sanity < 25 ? "red" : "#00ff00";
        document.getElementById('ui-water').innerText = this.water;
    }

    collide(walls) {
        this.bbox.setFromCenterAndSize(this.yaw.position, new THREE.Vector3(0.5, CONFIG.PLAYER_HEIGHT, 0.5));
        walls.forEach(wall => {
            const wallBBox = new THREE.Box3().setFromObject(wall);
            if (this.bbox.intersectsBox(wallBBox)) {
                
                const intersection = this.bbox.clone().intersect(wallBBox);
                const penetration = new THREE.Vector3();
                intersection.getSize(penetration);

                if (penetration.x < penetration.z) {
                    this.yaw.position.x -= Math.sign(this.velocity.x) * penetration.x;
                } else {
                    this.yaw.position.z -= Math.sign(this.velocity.z) * penetration.z;
                }
            }
        });
    }
}
