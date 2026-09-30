export class CameraError extends Error {
  constructor(
    public title: string,
    message: string,
  ) {
    super(message);
  }
}
export async function openCamera(): Promise<MediaStream> {
  if (!window.isSecureContext)
    throw new CameraError(
      "SECURE CONNECTION REQUIRED",
      "Open this app on localhost or an HTTPS address to use the camera.",
    );
  if (!navigator.mediaDevices?.getUserMedia)
    throw new CameraError(
      "CAMERA UNAVAILABLE",
      "This browser does not support camera access. Try current Chrome or Edge.",
    );
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 960 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError")
      throw new CameraError(
        "CAMERA ACCESS REQUIRED",
        "Allow camera access in your browser settings, then try again.",
      );
    if (name === "NotReadableError")
      throw new CameraError(
        "CAMERA IS BUSY",
        "Close other apps using your camera, then try again.",
      );
    throw new CameraError(
      "CAMERA UNAVAILABLE",
      "Connect a webcam or try another browser or device.",
    );
  }
}
export function stopCamera(stream?: MediaStream) {
  stream?.getTracks().forEach((track) => track.stop());
}
