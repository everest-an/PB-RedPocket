export class AudioManager {
  private static instance: AudioManager
  private audioContext: AudioContext | null = null

  private constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  playSlotMachinePull() {
    if (!this.audioContext) return

    const ctx = this.audioContext
    const now = ctx.currentTime

    // 1. 拉杆咔嗒声 (lever click down)
    const leverDown = ctx.createOscillator()
    const leverDownGain = ctx.createGain()
    const leverDownFilter = ctx.createBiquadFilter()

    leverDown.type = "square"
    leverDown.frequency.setValueAtTime(180, now)
    leverDown.frequency.exponentialRampToValueAtTime(120, now + 0.03)

    leverDownFilter.type = "lowpass"
    leverDownFilter.frequency.setValueAtTime(300, now)

    leverDownGain.gain.setValueAtTime(0.2, now)
    leverDownGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03)

    leverDown.connect(leverDownFilter)
    leverDownFilter.connect(leverDownGain)
    leverDownGain.connect(ctx.destination)

    leverDown.start(now)
    leverDown.stop(now + 0.03)

    // 2. 弹簧拉紧声 (spring tension)
    const springTension = ctx.createOscillator()
    const springGain = ctx.createGain()

    springTension.type = "sawtooth"
    springTension.frequency.setValueAtTime(60, now + 0.05)
    springTension.frequency.linearRampToValueAtTime(90, now + 0.25)

    springGain.gain.setValueAtTime(0.05, now + 0.05)
    springGain.gain.setValueAtTime(0.08, now + 0.25)

    springTension.connect(springGain)
    springGain.connect(ctx.destination)

    springTension.start(now + 0.05)
    springTension.stop(now + 0.25)

    // 3. 拉杆释放 - 咔嚓声 (lever release - clack!)
    const leverRelease = ctx.createOscillator()
    const releaseGain = ctx.createGain()
    const releaseFilter = ctx.createBiquadFilter()

    leverRelease.type = "square"
    leverRelease.frequency.setValueAtTime(280, now + 0.25)
    leverRelease.frequency.exponentialRampToValueAtTime(150, now + 0.3)

    releaseFilter.type = "lowpass"
    releaseFilter.frequency.setValueAtTime(500, now + 0.25)

    releaseGain.gain.setValueAtTime(0.25, now + 0.25)
    releaseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    leverRelease.connect(releaseFilter)
    releaseFilter.connect(releaseGain)
    releaseGain.connect(ctx.destination)

    leverRelease.start(now + 0.25)
    leverRelease.stop(now + 0.3)

    // 4. 滚轮开始旋转的机械声 (reel spinning)
    const reelSpin = ctx.createOscillator()
    const reelGain = ctx.createGain()
    const reelFilter = ctx.createBiquadFilter()

    reelSpin.type = "sawtooth"
    reelSpin.frequency.setValueAtTime(100, now + 0.3)
    reelSpin.frequency.exponentialRampToValueAtTime(40, now + 0.7)

    reelFilter.type = "lowpass"
    reelFilter.frequency.setValueAtTime(800, now + 0.3)
    reelFilter.frequency.exponentialRampToValueAtTime(200, now + 0.7)

    reelGain.gain.setValueAtTime(0.12, now + 0.3)
    reelGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7)

    reelSpin.connect(reelFilter)
    reelFilter.connect(reelGain)
    reelGain.connect(ctx.destination)

    reelSpin.start(now + 0.3)
    reelSpin.stop(now + 0.7)

    // 5. 滚轮咔嗒咔嗒声 (reel clicking)
    for (let i = 0; i < 5; i++) {
      const tick = ctx.createOscillator()
      const tickGain = ctx.createGain()
      const tickTime = now + 0.35 + i * 0.08

      tick.type = "square"
      tick.frequency.setValueAtTime(220, tickTime)
      tick.frequency.exponentialRampToValueAtTime(100, tickTime + 0.02)

      tickGain.gain.setValueAtTime(0.1, tickTime)
      tickGain.gain.exponentialRampToValueAtTime(0.01, tickTime + 0.02)

      tick.connect(tickGain)
      tickGain.connect(ctx.destination)

      tick.start(tickTime)
      tick.stop(tickTime + 0.02)
    }
  }

  // Win sound with coins
  playWinSound() {
    if (!this.audioContext) return

    const ctx = this.audioContext
    const now = ctx.currentTime

    // Coin cascade sound
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.frequency.setValueAtTime(800 + Math.random() * 400, now + i * 0.08)
      osc.frequency.exponentialRampToValueAtTime(400, now + i * 0.08 + 0.1)

      gain.gain.setValueAtTime(0.08, now + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.15)
    }
  }
}
