import { CONFIG } from './config.js';
import { EngineMath } from './utils.js';

/**
 * Player: Logic for movement, inventory, and sanity
 */
export class Player {
    constructor(scene, camera) {
        this.yaw = new THREE.Object3D(); 
        this.pitch = new THREE.Object3D();
        this.camera = camera;
        
        this.pitch.add(this.camera); 
        this.yaw.add(this.pitch);
        this.yaw.position.set(0, CONFIG.PLAYER_HEIGHT, 0);
        scene.add(this.yaw);
        
        this.velocity = new THREE.Vector3();
        this.sanity = 100; 
        this.water = 0;
    }

    drinkAlmondWater() {
        if (this.water > 0 && this.sanity < 100) {
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
                this.updateUI();
                pickedUp = true;
                break; 
            }
        }
        return pickedUp;
    }

    update(dt, input, walls, items) {
        const l = input.consumeLook();
        this.yaw.rotation.y -= l.x * 0.004;
        this.pitch.rotation.x = EngineMath.clamp(this.pitch.rotation.x - l.y * 0.004, -1.5, 1.5);

        this.velocity.x -= this.velocity.x * 10 * dt; 
        this.velocity.z -= this.velocity.z * 10 * dt;

        const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.yaw.quaternion);
        const right = new THREE.Vector3(1,0,0).applyQuaternion(this.yaw.quaternion);
        
        const currentSpeed = this.sanity < 20 ? CONFIG.WALK_SPEED * 0.5 : CONFIG.WALK_SPEED; 
        this.velocity.add(forward.multiplyScalar(input.move.fwd * currentSpeed * dt));
        this.velocity.add(right.multiplyScalar(input.move.str * currentSpeed * dt));

        let nextX = this.yaw.position.x + this.velocity.x * dt;
        let nextZ = this.yaw.position.z + this.velocity.z * dt;
        let collisionX = false, collisionZ = false;
        
        for(let w of walls) {
            if (!w.parent.visible) continue;
            const box = new THREE.Box3().setFromObject(w).expandByScalar(0.35);
            if(box.containsPoint(new THREE.Vector3(nextX, CONFIG.PLAYER_HEIGHT, this.yaw.position.z))) collisionX = true;
            if(box.containsPoint(new THREE.Vector3(this.yaw.position.x, CONFIG.PLAYER_HEIGHT, nextZ))) collisionZ = true;
        }
        
        if(!collisionX) this.yaw.position.x = nextX;
        if(!collisionZ) this.yaw.position.z = nextZ;
        
        this.yaw.position.y = CONFIG.PLAYER_HEIGHT;

        const wantsToDrink = input.isDrink();
        const wantsToPickup = input.isPickup();

        let itemPickedUp = false;
        if (wantsToPickup) {
            itemPickedUp = this.pickupItem(items);
        }
        
        if (wantsToDrink && !itemPickedUp) {
            this.drinkAlmondWater();
        }
    }

    updateUI() {
        document.getElementById('sanity-fill').style.width = this.sanity + "%";
        document.getElementById('sanity-fill').style.background = this.sanity < 25 ? "red" : "#00ff00";
        document.getElementById('ui-water').innerText = this.water;
    }
}