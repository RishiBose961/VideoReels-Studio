import Konva from 'konva';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { Project, Layer } from '../types';
import { getTransformAtTime } from './animation';
import { drawParticleFxToCanvas } from './particleFx';
import {
  drawPaperBackdrop,
  drawPaperCutoutImage,
  drawPaperText,
  isPaperBackdrop,
} from './paperRenderer';

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'png' | 'jpg';

export interface ExportOptions {
  format: ExportFormat;
  fps: number;
  scale: number;
  currentTime?: number;
}

export function isMp4Supported(): boolean {
  return typeof VideoEncoder !== 'undefined' || (
    typeof MediaRecorder !== 'undefined' &&
    (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') || MediaRecorder.isTypeSupported('video/mp4'))
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'auto';
    vid.onloadeddata = () => resolve(vid);
    vid.onerror = reject;
    vid.src = src;
  });
}

function seekVideo(vid: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    const clamped = Math.max(0, Math.min(timeSec, vid.duration || timeSec));
    if (Math.abs(vid.currentTime - clamped) < 0.015) {
      resolve();
      return;
    }
    const onSeeked = () => {
      vid.removeEventListener('seeked', onSeeked);
      resolve();
    };
    vid.addEventListener('seeked', onSeeked);
    vid.currentTime = clamped;
  });
}

function getShadowProps(layer: Layer) {
  const s = layer.shadow;
  if (!s || !s.enabled) return { shadowEnabled: false };
  return {
    shadowEnabled: true,
    shadowColor: s.color || '#000000',
    shadowBlur: s.blur ?? 12,
    shadowOffsetX: s.offsetX ?? 0,
    shadowOffsetY: s.offsetY ?? 4,
    shadowOpacity: 0.75,
  };
}

function applyImageFilters(node: Konva.Image, layer: Layer) {
  const f = layer.filters;
  const hasFilters =
    f.brightness !== 0 ||
    f.contrast !== 0 ||
    f.saturation !== 0 ||
    f.hue !== 0 ||
    f.blur > 0 ||
    f.grayscale ||
    f.sepia;

  if (!hasFilters) {
    node.clearCache();
    node.filters([]);
    return;
  }

  const filters: Konva.Filter[] = [];
  if (f.brightness !== 0 || f.contrast !== 0) filters.push(Konva.Filters.Brighten, Konva.Filters.Contrast);
  if (f.blur > 0) filters.push(Konva.Filters.Blur);
  if (f.grayscale) filters.push(Konva.Filters.Grayscale);
  if (f.sepia) filters.push(Konva.Filters.Sepia);
  if (f.hue !== 0 || f.saturation !== 0) filters.push(Konva.Filters.HSL);

  node.filters(filters);
  node.brightness(f.brightness / 100);
  node.contrast(f.contrast);
  node.blurRadius(f.blur);
  node.hue(f.hue);
  node.saturation(1 + f.saturation / 100);
  const pad = layer.shadow?.enabled
    ? (layer.shadow.blur ?? 12) + Math.max(Math.abs(layer.shadow.offsetX ?? 0), Math.abs(layer.shadow.offsetY ?? 0)) + 16
    : 0;
  node.cache({ offset: pad });
}

async function renderFrameToStage(
  project: Project,
  time: number,
  contentLayer: Konva.Layer,
  imageCache: Map<string, HTMLImageElement>,
  videoCache: Map<string, HTMLVideoElement>
) {
  contentLayer.destroyChildren();

  const visible = project.layers
    .filter((l) => l.visible && time >= l.startTime && time <= l.startTime + l.duration)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of visible) {
    const tf = getTransformAtTime(layer, time);
    const shadowProps = getShadowProps(layer);
    const blend = layer.blendMode || 'source-over';
    const ax = layer.anchorX ?? 0.5;
    const ay = layer.anchorY ?? 0.5;

    if (layer.type === 'fx') {
      const fxCanvas = document.createElement('canvas');
      drawParticleFxToCanvas(
        fxCanvas,
        layer.fxType || 'sparks',
        layer.fxColor || '#FF4655',
        Math.max(64, Math.round(tf.width)),
        Math.max(64, Math.round(tf.height)),
        time
      );
      contentLayer.add(
        new Konva.Image({
          image: fxCanvas,
          x: tf.x,
          y: tf.y,
          width: tf.width,
          height: tf.height,
          opacity: tf.opacity,
          globalCompositeOperation: blend,
        })
      );
    } else if (layer.type === 'video' && layer.src) {
      const vid = videoCache.get(layer.src);
      if (vid) {
        const vidTime = Math.max(0, time - layer.startTime + (layer.trimStart ?? 0));
        await seekVideo(vid, vidTime);
        const flipX = layer.flipX ? -1 : 1;
        const flipY = layer.flipY ? -1 : 1;
        const node = new Konva.Image({
          image: vid,
          x: tf.x + tf.width * ax,
          y: tf.y + tf.height * ay,
          offsetX: layer.flipX ? tf.width * (1 - ax) : tf.width * ax,
          offsetY: layer.flipY ? tf.height * (1 - ay) : tf.height * ay,
          width: tf.width,
          height: tf.height,
          scaleX: flipX,
          scaleY: flipY,
          rotation: tf.rotation,
          opacity: tf.opacity,
          cornerRadius: layer.cornerRadius ?? 0,
          globalCompositeOperation: blend,
          ...shadowProps,
        });
        contentLayer.add(node);
        applyImageFilters(node, layer);
      }
    } else if (layer.type === 'image' && layer.src) {
      const img = imageCache.get(layer.src);
      if (img) {
        if (layer.paperCutout?.enabled) {
          const cutCanvas = document.createElement('canvas');
          drawPaperCutoutImage(
            cutCanvas,
            img,
            tf.width,
            tf.height,
            layer.paperCutout,
            layer.filters,
            !!layer.flipX,
            !!layer.flipY
          );
          contentLayer.add(
            new Konva.Image({
              image: cutCanvas,
              x: tf.x + tf.width * ax,
              y: tf.y + tf.height * ay,
              offsetX: tf.width * ax,
              offsetY: tf.height * ay,
              width: tf.width,
              height: tf.height,
              rotation: tf.rotation,
              opacity: tf.opacity,
              globalCompositeOperation: blend,
              ...shadowProps,
            })
          );
        } else {
          const flipX = layer.flipX ? -1 : 1;
          const flipY = layer.flipY ? -1 : 1;
          const node = new Konva.Image({
            image: img,
            x: tf.x + tf.width * ax,
            y: tf.y + tf.height * ay,
            offsetX: layer.flipX ? tf.width * (1 - ax) : tf.width * ax,
            offsetY: layer.flipY ? tf.height * (1 - ay) : tf.height * ay,
            width: tf.width,
            height: tf.height,
            scaleX: flipX,
            scaleY: flipY,
            rotation: tf.rotation,
            opacity: tf.opacity,
            cornerRadius: layer.cornerRadius ?? 0,
            globalCompositeOperation: blend,
            ...shadowProps,
          });
          contentLayer.add(node);
          applyImageFilters(node, layer);
        }
      }
    } else if (layer.type === 'text') {
      if (layer.paperTextStyle === 'ransom' || layer.paperTextStyle === 'highlight') {
        const textCanvas = document.createElement('canvas');
        drawPaperText(textCanvas, layer, tf.width, tf.height, time);
        contentLayer.add(
          new Konva.Image({
            image: textCanvas,
            x: tf.x + tf.width * ax,
            y: tf.y + tf.height * ay,
            offsetX: tf.width * ax,
            offsetY: tf.height * ay,
            width: tf.width,
            height: tf.height,
            rotation: tf.rotation,
            opacity: tf.opacity,
            globalCompositeOperation: blend,
            ...shadowProps,
          })
        );
      } else {
        const node = new Konva.Text({
          text: layer.text || '',
          x: tf.x + tf.width * ax,
          y: tf.y + tf.height * ay,
          offsetX: tf.width * ax,
          offsetY: tf.height * ay,
          width: tf.width,
          height: tf.height,
          rotation: tf.rotation,
          opacity: tf.opacity,
          fontSize: layer.fontSize || 48,
          fontFamily: layer.fontFamily || 'Inter',
          fontStyle: layer.fontWeight || 'bold',
          align: layer.textAlign || 'center',
          fill: layer.color || '#ffffff',
          stroke: layer.textStrokeWidth ? layer.textStroke || '#000000' : undefined,
          strokeWidth: layer.textStrokeWidth || 0,
          globalCompositeOperation: blend,
          ...shadowProps,
        });
        contentLayer.add(node);
      }
    } else if (layer.type === 'shape') {
      const isEllipse = layer.shapeType === 'ellipse';
      const common = {
        x: tf.x + tf.width * ax,
        y: tf.y + tf.height * ay,
        offsetX: isEllipse ? (ax - 0.5) * tf.width : tf.width * ax,
        offsetY: isEllipse ? (ay - 0.5) * tf.height : tf.height * ay,
        rotation: tf.rotation,
        opacity: tf.opacity,
        fill: layer.fill || '#6366f1',
        stroke: layer.stroke || '#a5b4fc',
        strokeWidth: layer.strokeWidth ?? 2,
        globalCompositeOperation: blend,
        ...shadowProps,
      };
      if (isEllipse) {
        contentLayer.add(
          new Konva.Ellipse({
            ...common,
            radiusX: tf.width / 2,
            radiusY: tf.height / 2,
          })
        );
      } else if (layer.shapeType === 'arrow') {
        contentLayer.add(
          new Konva.Arrow({
            ...common,
            points: [0, tf.height / 2, tf.width, tf.height / 2],
            pointerLength: 16,
            pointerWidth: 14,
          })
        );
      } else {
        contentLayer.add(
          new Konva.Rect({
            ...common,
            width: tf.width,
            height: tf.height,
            cornerRadius: layer.cornerRadius ?? 6,
          })
        );
      }
    }
  }

  contentLayer.draw();
}

export async function exportProject(
  project: Project,
  options: ExportOptions,
  onProgress: (pct: number) => void,
  signal?: AbortSignal
): Promise<{ blob: Blob; ext: string }> {
  const { width, height, backgroundColor } = project.settings;
  // H.264 requires even dimensions
  const outW = Math.max(16, Math.floor((width * options.scale) / 2) * 2);
  const outH = Math.max(16, Math.floor((height * options.scale) / 2) * 2);
  const isTransparent = backgroundColor === 'transparent';

  const imageCache = new Map<string, HTMLImageElement>();
  const videoCache = new Map<string, HTMLVideoElement>();
  for (const layer of project.layers) {
    if (layer.type === 'image' && layer.src && !imageCache.has(layer.src)) {
      try {
        imageCache.set(layer.src, await loadImage(layer.src));
      } catch {
        // skip
      }
    } else if (layer.type === 'video' && layer.src && !videoCache.has(layer.src)) {
      try {
        videoCache.set(layer.src, await loadVideo(layer.src));
      } catch {
        // skip
      }
    }
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '-99999px';
  document.body.appendChild(container);

  const stage = new Konva.Stage({ container, width, height });
  const bgLayer = new Konva.Layer();
  const contentLayer = new Konva.Layer();
  stage.add(bgLayer);
  stage.add(contentLayer);

  if (!isTransparent) {
    if (isPaperBackdrop(backgroundColor)) {
      const bgCanvas = document.createElement('canvas');
      drawPaperBackdrop(bgCanvas, backgroundColor, width, height);
      bgLayer.add(new Konva.Image({ image: bgCanvas, x: 0, y: 0, width, height }));
    } else {
      bgLayer.add(new Konva.Rect({ x: 0, y: 0, width, height, fill: backgroundColor }));
    }
    bgLayer.draw();
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d', { alpha: true })!;

  const drawComposite = () => {
    outCtx.clearRect(0, 0, outW, outH);
    if (!isTransparent) {
      outCtx.drawImage(bgLayer.getNativeCanvasElement(), 0, 0, outW, outH);
    }
    outCtx.drawImage(contentLayer.getNativeCanvasElement(), 0, 0, outW, outH);
  };

  try {
    // ── Image Snapshot (PNG / JPG) ────────────────────────────────────────────
    if (options.format === 'png' || options.format === 'jpg') {
      await renderFrameToStage(project, options.currentTime ?? 0, contentLayer, imageCache, videoCache);
      drawComposite();
      onProgress(100);
      const mime = options.format === 'png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob>((resolve, reject) => {
        outCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encode failed'))), mime, 0.95);
      });
      return { blob, ext: options.format };
    }

    // ── Animated GIF (with true alpha support when background is Transparent) ─
    if (options.format === 'gif') {
      const fps = Math.min(20, Math.max(5, options.fps));
      const totalFrames = Math.max(1, Math.ceil(project.totalDuration * fps));
      const delayMs = Math.round(1000 / fps);
      const gif = GIFEncoder();

      for (let frame = 0; frame < totalFrames; frame++) {
        if (signal?.aborted) throw new Error('Export cancelled');
        const time = frame / fps;
        await renderFrameToStage(project, time, contentLayer, imageCache, videoCache);
        drawComposite();
        const { data } = outCtx.getImageData(0, 0, outW, outH);
        const palette = quantize(
          data,
          256,
          isTransparent ? { format: 'rgba4444', oneBitAlpha: true } : undefined
        );
        const index = applyPalette(data, palette, isTransparent ? 'rgba4444' : undefined);
        const transparentIndex = isTransparent ? palette.findIndex((c) => c[3] === 0) : -1;
        gif.writeFrame(index, outW, outH, {
          palette,
          delay: delayMs,
          transparent: transparentIndex >= 0,
          transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
        });
        onProgress(Math.round(((frame + 1) / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 0));
      }
      gif.finish();
      return { blob: new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' }), ext: 'gif' };
    }

    // ── Real H.264 MP4 Export via WebCodecs + mp4-muxer ───────────────────────
    if (options.format === 'mp4' && typeof VideoEncoder !== 'undefined') {
      const fps = options.fps || 30;
      const totalFrames = Math.max(1, Math.ceil(project.totalDuration * fps));
      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: { codec: 'avc', width: outW, height: outH },
        fastStart: 'in-memory',
      });

      let encoderError: Error | null = null;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (err) => {
          encoderError = err;
        },
      });

      const codecs = ['avc1.4d002a', 'avc1.42001f', 'avc1.640028'];
      let chosenCodec = 'avc1.42001f';
      for (const c of codecs) {
        const support = await VideoEncoder.isConfigSupported({
          codec: c,
          width: outW,
          height: outH,
          bitrate: 8_000_000,
          framerate: fps,
        });
        if (support.supported) {
          chosenCodec = c;
          break;
        }
      }

      encoder.configure({
        codec: chosenCodec,
        width: outW,
        height: outH,
        bitrate: 8_000_000,
        framerate: fps,
      });

      for (let frame = 0; frame < totalFrames; frame++) {
        if (signal?.aborted) {
          encoder.close();
          throw new Error('Export cancelled');
        }
        if (encoderError) throw encoderError;

        const time = frame / fps;
        await renderFrameToStage(project, time, contentLayer, imageCache, videoCache);
        drawComposite();

        const vf = new VideoFrame(outCanvas, {
          timestamp: Math.round((frame * 1_000_000) / fps),
          duration: Math.round(1_000_000 / fps),
        });
        encoder.encode(vf, { keyFrame: frame % (fps * 2) === 0 });
        vf.close();

        onProgress(Math.round(((frame + 1) / totalFrames) * 100));
        if (frame % 5 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      await encoder.flush();
      encoder.close();
      muxer.finalize();
      return { blob: new Blob([target.buffer], { type: 'video/mp4' }), ext: 'mp4' };
    }

    // ── WebM Video (with VP9 Alpha support) ───────────────────────────────────
    const fps = options.fps || 30;
    const totalFrames = Math.max(1, Math.ceil(project.totalDuration * fps));
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const stream = outCanvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const recordingDone = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    recorder.start();
    const frameIntervalMs = 1000 / fps;

    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        recorder.stop();
        throw new Error('Export cancelled');
      }
      const time = frame / fps;
      await renderFrameToStage(project, time, contentLayer, imageCache, videoCache);
      drawComposite();
      onProgress(Math.round(((frame + 1) / totalFrames) * 100));
      await new Promise((r) => setTimeout(r, frameIntervalMs));
    }

    recorder.stop();
    const blob = await recordingDone;
    return { blob, ext: 'webm' };
  } finally {
    stage.destroy();
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
