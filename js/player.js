import { CONFIG } from './config.js';
import { EngineMath } from './utils.js';

const SENSITIVITY = 0.002;

export class Player {
    constructor(scene, camera) {
        this.camera = camera;
        this.tilt = new THREE.Object3D(); // For procedural tilting effects
        this.tilt.add(camera);
        this.pitch = new THREE.Object3D(); // For mouse pitch (up/down)
        this.pitch.add(this.tilt);
        this.yaw = new THREE.Object3D(); // For mouse yaw (left/right)
        this.yaw.add(this.pitch);
        scene.add(this.yaw);

        this.velocity = new THREE.Vector3();
        this.sanity = 100;
        this.water = 0;
        this.actionCooldown = 0;
        this.bobTime = 0;

        this.bbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    }

    drinkAlmondWater() {
        if (this.water > 0 && this.sanity < 100) {
            this.water--;
            this.sanity = Math.min(100, this.sanity + 30);
            this.actionCooldown = 0.5; // Cooldown for any action
            this.updateUI();
        }
    }
    
    pickupItem(items) {
        let pickedUp = false;
        let closestItem = null;
        let min_dist = CONFIG.PICKUP_RADIUS;

        for (const item of items) {
            if (!item.parent.visible || !item.visible || !item.userData.isPickup || item.userData.isPickedUp) continue;
            const dist = this.yaw.position.distanceTo(item.getWorldPosition(new THREE.Vector3()));
            if (dist < min_dist) {
                min_dist = dist;
                closestItem = item;
            }
        }

        if (closestItem) {
            closestItem.userData.isPickedUp = true;
            closestItem.visible = false; // Hide it immediately
            if (closestItem.userData.bottleId) {
                sessionStorage.setItem(closestItem.userData.bottleId, 'true');
            }
            this.water++;
            this.actionCooldown = 0.2;
            this.updateUI();
            pickedUp = true;
        }
        return pickedUp;
    }

    update(dt, input, walls, items) {
        if (this.actionCooldown > 0) this.actionCooldown -= dt;

        const look = input.consumeLook();
        this.yaw.rotation.y -= look.x * SENSITIVITY;
        this.pitch.rotation.x -= look.y * SENSITIVITY;
        this.pitch.rotation.x = EngineMath.clamp(this.pitch.rotation.x, -Math.PI/2, Math.PI/2);
        
        const moveVector = new THREE.Vector2(input.move.str, input.move.fwd);
        if (moveVector.length() > 1) moveVector.normalize();
        
        const speed = CONFIG.WALK_SPEED;
        this.velocity.x = (moveVector.y * -Math.sin(this.yaw.rotation.y) + moveVector.x * Math.sin(this.yaw.rotation.y + Math.PI/2)) * speed;
        this.velocity.z = (moveVector.y * -Math.cos(this.yaw.rotation.y) + moveVector.x * Math.cos(this.yaw.rotation.y + Math.PI/2)) * speed;

        const oldX = this.yaw.position.x;
        this.yaw.position.x += this.velocity.x * dt;
        if (this.checkWallCollision(walls)) {
            this.yaw.position.x = oldX;
        }

        const oldZ = this.yaw.position.z;
        this.yaw.position.z += this.velocity.z * dt;
        if (this.checkWallCollision(walls)) {
            this.yaw.position.z = oldZ;
        }

        this.handlePillarCollision(walls);

        const speedMagnitude = moveVector.length() * speed;
        let targetXTilt = 0;
        let targetZTilt = 0;

        if (speedMagnitude > 0.1) {
            this.bobTime += dt * 7.5;
            this.camera.position.y = Math.sin(this.bobTime) * 0.1;

            // Z-axis rotation (roll) for side-to-side movement
            const SIDE_TILT_FACTOR = 0.075;
            targetZTilt = -moveVector.x * SIDE_TILT_FACTOR;

            // X-axis rotation (pitch) for forward/backward movement
            targetXTilt = -moveVector.y * 0.05;

        } else {
            this.bobTime = 0;
            this.camera.position.y *= 0.9;
            if (Math.abs(this.camera.position.y) < 0.001) this.camera.position.y = 0;
        }
        
        // Combine tilts into a single quaternion for smooth interpolation
        const targetEuler = new THREE.Euler(targetXTilt, 0, targetZTilt, 'YXZ');
        const targetQuaternion = new THREE.Quaternion().setFromEuler(targetEuler);

        // Smoothly interpolate the tilt object's quaternion
        this.tilt.quaternion.slerp(targetQuaternion, dt * 5);

        this.yaw.position.y = CONFIG.PLAYER_HEIGHT + this.camera.position.y;

        if (this.actionCooldown <= 0 && input.isAction()) {
            if (!this.pickupItem(items)) {
                this.drinkAlmondWater();
            }
        }
    }

    updateUI() {
        document.getElementById('sanity-fill').style.width = this.sanity + "%";
        document.getElementById('sanity-fill').style.background = this.sanity < 25 ? "red" : "#00ff00";
        document.getElementById('ui-water').innerText = this.water;
    }

    checkWallCollision(walls) {
        this.bbox.setFromCenterAndSize(this.yaw.position, new THREE.Vector3(0.8, CONFIG.PLAYER_HEIGHT, 0.8));
        for (const wall of walls) {
            if (wall.userData.isPillar) continue;
            const wallBBox = new THREE.Box3().setFromObject(wall);
            if (this.bbox.intersectsBox(wallBBox)) {
                return true;
            }
        }
        return false;
    }

    handlePillarCollision(walls) {
        for (const wall of walls) {
            if (wall.userData.isPillar) {
                const pillarPos = wall.position;
                const playerPos = this.yaw.position;
                const distSq = playerPos.distanceToSquared(pillarPos);
                const totalRadius = wall.userData.radius + 0.4; // player radius
                const totalRadiusSq = totalRadius * totalRadius;

                if (distSq < totalRadiusSq) {
                    const dist = Math.sqrt(distSq);
                    const overlap = totalRadius - dist;
                    const pushVector = playerPos.clone().sub(pillarPos).normalize().multiplyScalar(overlap);
                    this.yaw.position.add(pushVector);
                }
            }
        }
    }
}
