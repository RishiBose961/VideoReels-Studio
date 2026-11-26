import type { AudioTrack } from '../types';

export async function analyzeAudioFile(file: File): Promise<AudioTrack> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  await ctx.close();

  const channelData = audioBuffer.getChannelData(0);
  const duration = audioBuffer.duration;

  // Build 180 normalized waveform peaks for timeline visualization
  const numPeaks = 180;
  const blockSize = Math.max(1, Math.floor(channelData.length / numPeaks));
  const peaks: number[] = [];
  let maxPeak = 0.01;
  for (let i = 0; i < numPeaks; i++) {
    let sum = 0;
    const start = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      const val = Math.abs(channelData[start + j] || 0);
      if (val > sum) sum = val;
    }
    peaks.push(sum);
    if (sum > maxPeak) maxPeak = sum;
  }
  const normalizedPeaks = peaks.map((p) => Math.round((p / maxPeak) * 100) / 100);

  // Beat / energy-onset detector (20 windows per second, min 0.28s spacing)
  const sampleRate = audioBuffer.sampleRate;
  const winSize = Math.floor(sampleRate / 20);
  const energies: number[] = [];
  for (let i = 0; i + winSize < channelData.length; i += winSize) {
    let e = 0;
    for (let j = 0; j < winSize; j++) {
      const v = channelData[i + j];
      e += v * v;
    }
    energies.push(Math.sqrt(e / winSize));
  }

  const beats: number[] = [];
  const localRadius = 8; // 0.4s window
  let lastBeat = -1;
  for (let i = localRadius; i < energies.length - localRadius; i++) {
    let avg = 0;
    for (let k = i - localRadius; k <= i + localRadius; k++) avg += energies[k];
    avg /= localRadius * 2 + 1;

    const t = i / 20;
    if (energies[i] > avg * 1.45 && energies[i] > 0.08 && t - lastBeat >= 0.28) {
      beats.push(Math.round(t * 100) / 100);
      lastBeat = t;
    }
  }

  const src = URL.createObjectURL(file);

  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ''),
    src,
    duration,
    volume: 0.85,
    peaks: normalizedPeaks,
    beats,
  };
}
