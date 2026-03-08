import { CONFIG } from './config.js';

/**
 * TextureFactory: Procedural Asset Generation
 */
export class TextureFactory {
    /**
     * Generates canvas-based textures for the world
     * @param {string} type - 'carpet', 'wallpaper', 'ceiling'
     * @returns {THREE.CanvasTexture}
     */
    static generate(type) {
        const loader = new THREE.TextureLoader();
        let tex;
        let repeatX, repeatY;

        switch(type) {
            case 'carpet':
                tex = loader.load('textures/backrooms level 0 floor texture.webp');
                repeatX = (CONFIG.CHUNK_SIZE / 4) * 3.5;
                repeatY = (CONFIG.CHUNK_SIZE / 4) * 3.5;
                break;
            case 'wallpaper':
                tex = loader.load('textures/backooms wall texture.jpg');
                repeatX = (CONFIG.CHUNK_SIZE / 4) / 5;
                repeatY = (CONFIG.CHUNK_SIZE / 4) / 5;
                break;
            case 'ceiling':
                tex = loader.load('textures/level 0 roof texture.jpg');
                repeatX = (CONFIG.CHUNK_SIZE / 4) * 2.5;
                repeatY = (CONFIG.CHUNK_SIZE / 4) * 2.5;
                break;
        }

        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        return tex;
    }
}
