/**
 * Utility to compress and optimize images before upload or API transmission.
 * Ensures compatibility with Vercel serverless payload limits (4.5MB max)
 * while preserving high fidelity for OMR mark and student name recognition.
 */
export async function optimizeImageForOMR(dataUrlOrFile: string | File, maxDimension = 1600, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;

      // Calculate proportional scale if dimensions exceed maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback to original if canvas context unavailable
        if (typeof dataUrlOrFile === 'string') {
          resolve(dataUrlOrFile);
        } else {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.onerror = reject;
          reader.readAsDataURL(dataUrlOrFile);
        }
        return;
      }

      // Fill with white background in case source has transparency
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Export as high quality JPEG
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(optimizedDataUrl);
    };

    img.onerror = (err) => {
      console.warn('Image optimization fallback:', err);
      if (typeof dataUrlOrFile === 'string') {
        resolve(dataUrlOrFile);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = reject;
        reader.readAsDataURL(dataUrlOrFile);
      }
    };

    if (typeof dataUrlOrFile === 'string') {
      img.src = dataUrlOrFile;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = reject;
      reader.readAsDataURL(dataUrlOrFile);
    }
  });
}
