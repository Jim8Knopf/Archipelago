// ============================================================
// Themed replacement for window.confirm().
//
// Built on a native <dialog> opened with showModal(), so the browser handles
// focus trapping and Escape (= cancel). Enter or the confirm button confirms,
// clicking the backdrop cancels, and focus goes back to whatever had it
// before the dialog opened.
// ============================================================

let dialogCount = 0;

export async function confirmDialog({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  danger = false
} = {}) {
  const previousFocus = document.activeElement;

  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";

  const form = document.createElement("form");
  form.method = "dialog";
  form.className = "confirm-dialog-body";

  if (title) {
    const heading = document.createElement("h3");
    heading.className = "confirm-dialog-title";
    heading.textContent = title;
    form.appendChild(heading);
    heading.id = `confirm-title-${++dialogCount}`;
    dialog.setAttribute("aria-labelledby", heading.id);
  }

  const text = document.createElement("p");
  text.className = "confirm-dialog-message";
  text.textContent = message ?? "";
  text.id = `confirm-msg-${++dialogCount}`;
  form.appendChild(text);
  dialog.setAttribute("aria-describedby", text.id);
  if (!title) dialog.setAttribute("aria-label", message ?? "Confirm");

  const actions = document.createElement("div");
  actions.className = "confirm-dialog-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "submit";
  cancelBtn.value = "cancel";
  cancelBtn.textContent = cancelLabel;

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "submit";
  confirmBtn.value = "confirm";
  confirmBtn.className = danger ? "danger" : "brass";
  confirmBtn.textContent = confirmLabel;

  actions.append(cancelBtn, confirmBtn);
  form.appendChild(actions);
  dialog.appendChild(form);
  document.body.appendChild(dialog);

  // A click that lands on the <dialog> itself (not its content) is a click
  // on the backdrop.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close("cancel");
  });

  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      const confirmed = dialog.returnValue === "confirm";
      dialog.remove();
      if (previousFocus && typeof previousFocus.focus === "function" && previousFocus.isConnected) {
        previousFocus.focus();
      }
      resolve(confirmed);
    }, { once: true });

    dialog.returnValue = "";
    dialog.showModal();
    confirmBtn.focus();
  });
}
