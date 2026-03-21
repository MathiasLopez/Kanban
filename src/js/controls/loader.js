let loaderElement = null;
let loaderRefs = new Set();

function resolveLoaderHost() {
    // If a dialog is open, it lives in the top layer and sits above other elements.
    // Append the loader to the open dialog so it remains visible; otherwise use body.
    const openDialog = document.querySelector("dialog[open]");
    return openDialog || document.body;
}

function createLoader() {
    const div = document.createElement("div");
    div.id = "global-loader";
    div.style.position = "fixed";
    div.style.top = "0";
    div.style.left = "0";
    div.style.width = "100vw";
    div.style.height = "100vh";
    div.style.background = "rgba(0,0,0,0.4)";
    div.style.display = "flex";
    div.style.justifyContent = "center";
    div.style.alignItems = "center";
    div.style.zIndex = "999999";

    div.innerHTML = `
    <div style="
      width: 60px;
      height: 60px;
      border: 6px solid #fff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    "></div>
  `;

    const style = document.createElement("style");
    style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
    document.head.appendChild(style);

    return div;
}

export function showLoader() {
    const id = crypto.randomUUID();
    loaderRefs.add(id);
    if (loaderElement) {
        const host = resolveLoaderHost();
        if (loaderElement.parentElement !== host) {
            host.appendChild(loaderElement);
        }
        return id;
    }

    loaderElement = createLoader();

    const host = resolveLoaderHost();
    host.appendChild(loaderElement);
    return id;
}

/**
 * Hides the loader based on the provided loaderId.
 *
 * Behavior:
 * - If no loaderId is provided:
 *      - Clears all loader references.
 *      - Removes the loader element from the DOM (if present).
 *
 * - If a loaderId is provided:
 *      - Removes that ID from the reference set (only if it exists).
 *      - If the set becomes empty afterward, the loader element is removed.
 *
 * - If the loaderId does not exist or the set is already empty:
 *      - No action is taken.
 *
 * @param {string} [loaderId] - Optional identifier of the loader instance to hide.
 */
export function hideLoader(loaderId) {
    if (!loaderId) {
        loaderRefs.clear();
    } else {
        if (!loaderRefs.has(loaderId)) return;
        loaderRefs.delete(loaderId);
    }

    if (loaderRefs.size > 0) return;

    if (loaderElement) {
        loaderElement.remove();
        loaderElement = null;
    }
}
