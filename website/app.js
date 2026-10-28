// Renders the Wix form from its live schema and drives it through Wix's form store
// (createFormStore in js/wix-forms.js). Nothing here names a field: the owner can rename,
// reorder, add or require fields in the Wix dashboard and this page follows.

const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) el.append(kid);
  return el;
};

// Wix stores phone numbers in international form (+15125550123). A visitor types a local number,
// so the field's default country's dial code is added when they leave it off.
const DIAL = { US: "1", CA: "1" };
const toE164 = (raw, country) => {
  const t = String(raw ?? "").trim();
  if (!t || t.startsWith("+") || !DIAL[country]) return t;
  const d = t.replace(/\D/g, "");
  if (d.length === 10) return "+" + DIAL[country] + d;
  if (d.length === 11 && d.startsWith(DIAL[country])) return "+" + d;
  return t;
};

// first and last name sit side by side (by the field's kind, never its label)
const HALF = new Set(["CONTACTS_FIRST_NAME", "CONTACTS_LAST_NAME"]);

export function mountForm({ createFormStore, FORM_ERROR }, root, formId) {
  const store = createFormStore({ formId });
  let built = null; // the targets the DOM was built for, in order
  let formEl = null;

  const mark = (form, f) => {
    if (!f.required || form.requiredIndicator === "NONE") return null;
    return h("span", { class: "req", "aria-hidden": "true" }, form.requiredIndicator === "TEXT" ? " (Required)" : " *");
  };

  const labelFor = (form, f, id) => {
    const text = [form.requiredIndicatorBefore ? mark(form, f) : null, f.label, form.requiredIndicatorBefore ? null : mark(form, f)];
    return h("label", { for: id, class: f.showLabel ? "lbl" : "sr" }, ...text);
  };

  function control(f, values) {
    const id = "f-" + f.target;
    const common = { id, name: f.target, "aria-describedby": "err-" + f.target, disabled: f.readOnly || undefined, required: undefined };
    const v = values[f.target];
    // Checked on leaving a field, a moment later: an error appearing or disappearing at once would
    // move the button under a visitor's pointer between press and release, and the click is lost.
    const onBlur = () => setTimeout(() => store.validate(f.target), 250);
    // While a field shows an error, re-check it as the visitor types, so the message clears early.
    const set = (value) => { store.setValue(f.target, value); if (store.getState().errors[f.target]) store.validate(f.target); };
    switch (f.control) {
      case "textarea":
        return h("textarea", { ...common, rows: 4, placeholder: f.placeholder, oninput: (e) => set(e.target.value), onblur: onBlur }, String(v ?? ""));
      case "select": {
        const sel = h("select", { ...common, onchange: (e) => { store.setValue(f.target, e.target.value); store.validate(f.target); }, onblur: onBlur },
          h("option", { value: "" }, f.placeholder || "Choose one"),
          f.choices.map((c) => h("option", { value: c.value, selected: c.value === v }, c.label)));
        return sel;
      }
      case "radio":
        return h("div", { class: "choices", role: "radiogroup", "aria-labelledby": id + "-l", "aria-describedby": "err-" + f.target },
          f.choices.map((c, i) => h("label", { class: "choice" },
            h("input", { type: "radio", name: f.target, id: i === 0 ? id : undefined, value: c.value, checked: c.value === v,
              onchange: () => { store.setValue(f.target, c.value); store.validate(f.target); } }),
            h("span", {}, c.label))));
      case "checkboxGroup":
      case "tags":
        return h("div", { class: "choices", "aria-describedby": "err-" + f.target },
          f.choices.map((c, i) => h("label", { class: "choice" },
            h("input", { type: "checkbox", name: f.target, id: i === 0 ? id : undefined, value: c.value, checked: Array.isArray(v) && v.includes(c.value),
              onchange: (e) => {
                const cur = Array.isArray(store.getState().values[f.target]) ? store.getState().values[f.target] : [];
                store.setValue(f.target, e.target.checked ? [...cur, c.value] : cur.filter((x) => x !== c.value));
                store.validate(f.target);
              } }),
            h("span", {}, c.label))));
      case "checkbox":
        return h("label", { class: "choice" },
          h("input", { ...common, type: "checkbox", checked: v === true, onchange: (e) => { store.setValue(f.target, e.target.checked); store.validate(f.target); } }),
          h("span", {}, f.label));
      case "number":
      case "rating":
        return h("input", { ...common, type: "number", inputmode: "decimal", min: f.validation.minimum, max: f.validation.maximum, step: f.validation.multipleOf,
          value: v ?? "", placeholder: f.placeholder, oninput: (e) => set(e.target.value), onblur: onBlur });
      case "date":
      case "time":
      case "datetime":
        return h("input", { ...common, type: f.control === "datetime" ? "datetime-local" : f.control, min: f.validation.minDate, max: f.validation.maxDate,
          value: v ?? "", oninput: (e) => set(e.target.value), onblur: onBlur });
      case "text":
      case "email":
      case "url":
      case "phone":
      case "password": {
        const type = f.control === "phone" ? "tel" : f.control;
        const ac = { email: "email", phone: "tel", url: "url" }[f.control] ||
          ({ CONTACTS_FIRST_NAME: "given-name", CONTACTS_LAST_NAME: "family-name", CONTACTS_COMPANY: "organization" }[f.identifier]);
        return h("input", { ...common, type, autocomplete: ac, value: v ?? "",
          placeholder: f.placeholder || (f.control === "phone" && DIAL[f.phoneCountry] ? "(512) 555-0123" : undefined),
          oninput: (e) => set(f.control === "phone" ? toE164(e.target.value, f.phoneCountry) : e.target.value), onblur: onBlur });
      }
      default:
        // payment, appointment, file, address, signature: not offered on this page
        return h("p", { class: "note" }, "This question can't be answered here yet.");
    }
  }

  function build(state) {
    const { form, values } = state;
    const step = form.steps[state.step] ?? form.steps[0];
    const fields = form.fields.filter((x) => !step || x.stepId === step.id);
    built = fields.map((f) => f.target).join("|") + "#" + state.step;
    const last = state.step === form.steps.length - 1;
    formEl = h("form", { novalidate: true, class: "wl-form",
      onsubmit: async (e) => {
        e.preventDefault();
        if (!last) { store.next(e); return; }
        const out = await store.submit(e);
        if (out && out.url) (out.newTab ? window.open(out.url, "_blank") : window.location.assign(out.url));
      } },
      form.steps.length > 1 && step?.name ? h("p", { class: "stepname" }, `Step ${state.step + 1} of ${form.steps.length}: ${step.name}`) : null,
      fields.map((f) => h("div", { class: "field" + (HALF.has(f.identifier) ? " half" : "") },
        f.control === "checkbox" ? null : (f.control === "radio" || f.control === "checkboxGroup" || f.control === "tags")
          ? h("p", { class: f.showLabel ? "lbl" : "sr", id: "f-" + f.target + "-l" }, f.label, mark(form, f))
          : labelFor(form, f, "f-" + f.target),
        control(f, values),
        f.description ? h("p", { class: "help" }, f.description) : null,
        h("p", { class: "err", id: "err-" + f.target, role: "alert" }))),
      h("p", { class: "err formerr", "data-form-error": true, role: "alert" }),
      h("div", { class: "actions" },
        state.step > 0 ? h("button", { type: "button", class: "btn ghost", onclick: () => store.previous() }, form.previousText || "Back") : null,
        h("button", { type: "submit", class: "btn primary", "data-submit": true }, last ? (form.submitText || "Join the waitlist") : (form.nextText || "Continue"))));
    root.replaceChildren(formEl);
  }

  function update(state) {
    if (!formEl) return;
    for (const p of formEl.querySelectorAll(".err[id]")) {
      const target = p.id.slice(4);
      const msg = state.errors[target] || "";
      p.textContent = msg;
      const input = formEl.querySelector(`[name="${CSS.escape(target)}"]`);
      if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
    }
    formEl.querySelector("[data-form-error]").textContent = state.errors[FORM_ERROR] || "";
    const btn = formEl.querySelector("[data-submit]");
    btn.disabled = state.loading;
    btn.classList.toggle("busy", state.loading);
  }

  function render() {
    const state = store.getState();
    if (state.outcome) {
      built = null; formEl = null;
      const msg = state.outcome.message || "Thanks, you're on the list. We'll be in touch.";
      root.replaceChildren(h("div", { class: "thanks", role: "status" },
        h("div", { class: "tick", "aria-hidden": "true" }, "✓"),
        msg.split("\n").filter(Boolean).map((p) => h("p", {}, p)),
        h("button", { type: "button", class: "btn ghost", onclick: () => store.reset() }, "Sign up someone else")));
      return;
    }
    if (!state.form) {
      built = null; formEl = null;
      root.replaceChildren(state.errors[FORM_ERROR]
        ? h("p", { class: "err formerr" }, state.errors[FORM_ERROR])
        : h("div", { class: "skeleton", "aria-busy": "true" }, h("span"), h("span"), h("span"), h("span")));
      return;
    }
    if (state.closed) {
      built = null; formEl = null;
      root.replaceChildren(h("p", { class: "note" }, state.form.disabledMessage || "The waitlist is closed for now."));
      return;
    }
    const step = state.form.steps[state.step] ?? state.form.steps[0];
    const key = state.form.fields.filter((x) => !step || x.stepId === step.id).map((f) => f.target).join("|") + "#" + state.step;
    if (key !== built) build(state); // only when the set of fields changes, so typing keeps focus
    update(state);
  }

  store.subscribe(render);
  render();
  store.start();
  return store;
}
