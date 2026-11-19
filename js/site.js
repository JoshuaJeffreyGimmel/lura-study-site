/* Lura Study site — copy buttons on the install command boxes.
   Progressive enhancement: the buttons ship with the `hidden` attribute and are
   only revealed here. Without JavaScript the commands remain plain, selectable text.
   No dependencies, no network requests. */
(function () {
  "use strict";

  var RESET_MS = 1600;
  var status = document.getElementById("copy-status");
  var buttons = document.querySelectorAll(".cmd-copy");

  function announce(msg) {
    if (!status) return;
    status.textContent = "";
    setTimeout(function () { status.textContent = msg; }, 60);
  }

  function selectCode(code) {
    try {
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(code);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { /* selection unsupported; the text is still selectable by hand */ }
  }

  Array.prototype.forEach.call(buttons, function (btn) {
    var box = btn.closest ? btn.closest(".cmd") : null;
    var code = box ? box.querySelector("pre code") : null;
    if (!code) return;

    var label = btn.textContent;
    var name = (btn.getAttribute("aria-label") || "Copy command").replace(/^Copy /, "");
    var timer = null;

    function flash(text) {
      clearTimeout(timer);
      btn.textContent = text;
      timer = setTimeout(function () { btn.textContent = label; }, RESET_MS);
    }

    function fail() {
      selectCode(code);
      flash("Select + copy");
      announce("Could not copy. " + name + " selected; copy it with your keyboard.");
    }

    btn.addEventListener("click", function () {
      var text = code.textContent.trim();
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) { fail(); return; }
        navigator.clipboard.writeText(text).then(function () {
          flash("Copied");
          announce("Copied " + name);
        }, fail);
      } catch (e) {
        fail();
      }
    });

    btn.hidden = false;
  });
})();
