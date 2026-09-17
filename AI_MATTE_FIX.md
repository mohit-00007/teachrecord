# AI Matte Fix

The Pro Matte compositor uses the documented Transformers.js `background-removal` output as a grayscale mask. It reads channel 0 as foreground confidence instead of treating channel 3 as alpha. This avoids the rectangular/triangular artifacts caused by interpreting the mask as an RGBA foreground image.

The input preserves the webcam aspect ratio, and the resulting mask is scaled with high-quality canvas interpolation before compositing. The model remains local/offline after the assets have been staged.
