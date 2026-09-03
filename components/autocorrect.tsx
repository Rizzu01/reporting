"use client";

import { useEffect } from "react";

function applyAutoCorrect(root: ParentNode = document) {
  const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea");

  fields.forEach((field) => {
    const type = field instanceof HTMLInputElement ? field.type.toLowerCase() : "textarea";
    const isTextField = field instanceof HTMLTextAreaElement || ["text", "search"].includes(type);
    const isUrlLike = type === "url" || /drive|url|link/i.test(field.name || field.id || field.placeholder || "");

    if (isTextField && !isUrlLike) {
      field.spellcheck = true;
      field.setAttribute("autocorrect", "on");
      field.setAttribute("autocapitalize", "sentences");
      field.setAttribute("autocomplete", field.autocomplete || "on");
    }

    if (isUrlLike) {
      field.spellcheck = false;
      field.setAttribute("autocorrect", "off");
      field.setAttribute("autocapitalize", "off");
    }
  });
}

export default function AutoCorrect() {
  useEffect(() => {
    applyAutoCorrect();
    const observer = new MutationObserver(() => applyAutoCorrect());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
