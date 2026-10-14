// jsdom has no canvas implementation; stub it so components render without noisy "not implemented" errors.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
