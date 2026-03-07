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
        const cvs = document.createElement('canvas');
        cvs.width = 256; cvs.height = 256;
        const ctx = cvs.getContext('2d');
        
        switch(type) {
            case 'carpet':
                ctx.fillStyle = '#857a3d'; ctx.fillRect(0, 0, 256, 256);
                for (let i = 0; i < 8000; i++) {
                    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)';
                    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
                }
                break;
            case 'wallpaper':
                ctx.fillStyle = '#c4b76e'; ctx.fillRect(0, 0, 256, 256);
                ctx.strokeStyle = '#a39750'; ctx.lineWidth = 3;
                for (let i = 0; i < 256; i += 32) {
                    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
                }
                break;
            case 'ceiling':
                ctx.fillStyle = '#cccccc'; ctx.fillRect(0, 0, 256, 256);
                ctx.strokeStyle = '#999999'; ctx.lineWidth = 6;
                ctx.strokeRect(0, 0, 256, 256);
                ctx.fillStyle = '#ffffff'; ctx.fillRect(64, 64, 128, 128); // Light panel mimic
                break;
        }

        const tex = new THREE.CanvasTexture(cvs);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(CONFIG.CHUNK_SIZE / 4, CONFIG.CHUNK_SIZE / 4);
        return tex;
    }
}