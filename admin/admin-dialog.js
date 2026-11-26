// ============================================================
// Small form dialog for the admin page (move/copy a character, rename a
// campaign). Same native <dialog> + showModal() approach and look as
// js/confirm.js: Escape or a backdrop click cancels, focus returns to
// whatever had it before. Enter in a field submits (the confirm button is
// the form's only submit button, so it's the default one).
//
// `bodyHtml` is inserted as HTML: callers escape every value in it.
// `validate(values)` returns an error message, or "" to accept.
// Resolves to the form values ({ name: value }) or null if cancelled.
// ============================================================

let dialogCount = 0;

export function formDialog({
  title,
  bodyHtml,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  danger = false,
  validate = () => ""
}) {
  const previousFocus = document.activeElement;
  const n = ++dialogCount;

  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog admin-form-dialog";
  dialog.setAttribute("aria-labelledby", `admin-dialog-title-${n}`);

  const form = document.createElement("form");
  form.method = "dialog";
  form.className = "confirm-dialog-body";
  form.noValidate = true;

  const heading = document.createElement("h3");
  heading.className = "confirm-dialog-title";
  heading.id = `admin-dialog-title-${n}`;
  heading.textContent = title;

  const body = document.createElement("div");
  body.className = "admin-dialog-content";
  body.innerHTML = bodyHtml;

  const error = document.createElement("p");
  error.className = "admin-gate-error admin-dialog-error";
  error.setAttribute("role", "alert");

  const actions = document.createElement("div");
  actions.className = "confirm-dialog-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = cancelLabel;
  cancelBtn.addEventListener("click", () => dialog.close("cancel"));

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "submit";
  confirmBtn.value = "confirm";
  confirmBtn.className = danger ? "danger" : "brass";
  confirmBtn.textContent = confirmLabel;

  actions.append(cancelBtn, confirmBtn);
  form.append(heading, body, error, actions);
  dialog.appendChild(form);
  document.body.appendChild(dialog);

  const values = () => Object.fromEntries(new FormData(form).entries());
  let result = null;

  form.addEventListener("submit", (e) => {
    const problem = validate(values());
    if (problem) {
      e.preventDefault();
      error.textContent = problem;
      return;
    }
    result = values();
  });

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
      resolve(confirmed ? result : null);
    }, { once: true });

    dialog.returnValue = "";
    dialog.showModal();
    (form.querySelector("input:not([type=hidden]):not([type=radio])") || confirmBtn).focus();
  });
}
