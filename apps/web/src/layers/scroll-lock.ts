let lockCount = 0;
let savedOverflow = '';

export function acquireScrollLock(): () => void {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount--;
    if (lockCount === 0) {
      document.body.style.overflow = savedOverflow;
    }
  };
}
