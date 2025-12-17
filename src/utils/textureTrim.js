// Utility: compute the opaque pixel bounds of an image texture (cached).
// This lets us create Arcade Physics bodies that match the *visible* sprite,
// even when the PNG has lots of transparent padding.

const boundsCache = new Map();

/**
 * @param {Phaser.Scene} scene
 * @param {string} key - texture key
 * @param {number} alphaThreshold - 0..255 (pixels with alpha > threshold are considered "solid")
 * @returns {{x:number,y:number,w:number,h:number,srcW:number,srcH:number}}
 */
export function getOpaqueTextureBounds(scene, key, alphaThreshold = 10) {
    const cacheKey = `${key}:${alphaThreshold}`;
    const cached = boundsCache.get(cacheKey);
    if (cached) return cached;

    const tex = scene.textures.get(key);
    const src = tex?.getSourceImage?.();
    const srcW = src?.width ?? 0;
    const srcH = src?.height ?? 0;

    // Fallback: full image
    if (!src || !srcW || !srcH) {
        const full = { x: 0, y: 0, w: 1, h: 1, srcW: srcW || 1, srcH: srcH || 1 };
        boundsCache.set(cacheKey, full);
        return full;
    }

    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        const full = { x: 0, y: 0, w: srcW, h: srcH, srcW, srcH };
        boundsCache.set(cacheKey, full);
        return full;
    }

    ctx.clearRect(0, 0, srcW, srcH);
    ctx.drawImage(src, 0, 0);

    const img = ctx.getImageData(0, 0, srcW, srcH);
    const data = img.data;

    let minX = srcW, minY = srcH, maxX = -1, maxY = -1;
    for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
            const a = data[(y * srcW + x) * 4 + 3];
            if (a > alphaThreshold) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }

    // All transparent? Use full bounds.
    if (maxX < 0 || maxY < 0) {
        const full = { x: 0, y: 0, w: srcW, h: srcH, srcW, srcH };
        boundsCache.set(cacheKey, full);
        return full;
    }

    const bounds = {
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        srcW,
        srcH
    };

    boundsCache.set(cacheKey, bounds);
    return bounds;
}


