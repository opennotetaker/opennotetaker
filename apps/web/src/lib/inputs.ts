// Which audio inputs this machine has, and what they are called.
//
// # Why this exists at all
//
// A browser cannot record what comes *out* of your computer. It can record a
// microphone, and it can record a tab (recorder.ts). Between those two sits
// the case this module is for: a meeting in a desktop application -- Zoom,
// Teams or VooV as an installed app rather than a tab -- whose sound reaches
// the speakers and nothing else.
//
// The way out is not a browser feature. It is a loopback driver: BlackHole or
// Loopback on macOS, VB-Cable or "Stereo Mix" on Windows, a PulseAudio monitor
// on Linux. Each of them presents the computer's *output* to every application
// as though it were a *microphone*, and a microphone is something this page can
// open. So the whole feature is: let the user say which input to record, rather
// than always taking the system default.
//
// # Why the names are not always available
//
// `enumerateDevices` returns entries with empty labels until the page has been
// granted microphone access at least once -- otherwise the list of hardware
// somebody owns would be a fingerprint available to any page that asks. So the
// record screen shows a button first and the list after, rather than demanding
// a permission on load for a control the user may never open.

export interface Input {
  id: string;
  label: string;
}

/// Whether the browser will already tell us what the inputs are called.
///
/// The Permissions API is not in every browser and throws on an unknown name
/// in some of them, so a failure here means "ask the user", never an error.
export async function inputsAreNamed(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state === "granted";
  } catch {
    return false;
  }
}

/// Every audio input, named. Empty when the names are not available yet.
export async function listInputs(): Promise<Input[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput" && device.label !== "")
    .map((device) => ({ id: device.deviceId, label: device.label }));
}

/// Ask for microphone access purely to learn the names, and let go of it again.
///
/// The track is stopped immediately. Holding it would light the browser's
/// recording indicator while the user is still reading the consent screen,
/// which in this product would be an unusually bad joke.
export async function nameInputs(): Promise<Input[]> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) track.stop();
  return listInputs();
}
