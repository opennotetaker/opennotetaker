// The toolbar list of meetings that are open right now.
//
// This exists for one reason beyond convenience. `chrome.tabCapture` will only
// issue a stream id when the extension has been "actively invoked", and
// clicking the toolbar icon is the invocation Chrome trusts most. A press here
// therefore always gets the direct handover, where a press on the in-page
// banner sometimes falls back to the tab picker.
//
// The URL field at the bottom is for people running their own copy: the
// extension has to know where the app is before it can hand anything to it.

const heading = document.getElementById("heading");
const list = document.getElementById("list");
const empty = document.getElementById("empty");
const field = document.getElementById("app-url");
const save = document.getElementById("save");

heading.textContent = chrome.i18n.getMessage("popupHeading");
empty.textContent = chrome.i18n.getMessage("popupEmpty");
save.textContent = chrome.i18n.getMessage("popupSave");
field.placeholder = "https://opennotetaker.app/";

chrome.storage.sync.get({ appUrl: "https://opennotetaker.app/" }).then(({ appUrl }) => {
  field.value = appUrl;
});

save.addEventListener("click", () => {
  const value = field.value.trim();
  if (!value) return;
  void chrome.storage.sync.set({ appUrl: value }).then(() => {
    save.textContent = chrome.i18n.getMessage("popupSaved");
    setTimeout(() => (save.textContent = chrome.i18n.getMessage("popupSave")), 1200);
  });
});

chrome.runtime.sendMessage({ type: "opennotetaker:meetings" }).then((rows) => {
  if (!rows?.length) {
    empty.hidden = false;
    return;
  }
  for (const row of rows) {
    const item = document.createElement("li");
    const who = document.createElement("div");
    who.className = "who";
    const name = document.createElement("b");
    name.textContent = row.platform;
    const title = document.createElement("span");
    title.textContent = row.title;
    who.append(name, title);

    const button = document.createElement("button");
    button.textContent = chrome.i18n.getMessage("popupRecord");
    button.addEventListener("click", () => {
      void chrome.runtime
        .sendMessage({
          type: "opennotetaker:record",
          tabId: row.tabId,
          platform: row.platform,
          title: row.title,
        })
        .then(() => window.close());
    });

    item.append(who, button);
    list.append(item);
  }
});
