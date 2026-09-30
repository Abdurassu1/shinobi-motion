import { afterEach, describe, expect, it, vi } from "vitest";
import { CameraError, openCamera, stopCamera } from "./camera";
afterEach(() => vi.unstubAllGlobals());
describe("camera access and cleanup", () => {
  it.each([
    ["NotAllowedError", "CAMERA ACCESS REQUIRED"],
    ["NotReadableError", "CAMERA IS BUSY"],
    ["NotFoundError", "CAMERA UNAVAILABLE"],
  ])("maps %s to an actionable error", async (name, title) => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException("test", name)),
      },
    });
    await expect(openCamera()).rejects.toMatchObject({ title });
  });
  it("rejects insecure origins before requesting camera access", async () => {
    vi.stubGlobal("window", { isSecureContext: false });
    await expect(openCamera()).rejects.toBeInstanceOf(CameraError);
  });
  it("explains unsupported camera APIs", async () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {});
    await expect(openCamera()).rejects.toMatchObject({
      title: "CAMERA UNAVAILABLE",
    });
  });
  it("requests only video and stops every acquired track", async () => {
    const stop = vi.fn(),
      stream = { getTracks: () => [{ stop }] },
      getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const acquired = await openCamera();
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false }),
    );
    stopCamera(acquired);
    expect(stop).toHaveBeenCalledOnce();
  });
});
