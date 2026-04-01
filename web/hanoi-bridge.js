/**
 * hanoi-bridge.js
 * ──────────────────────────────────────────────────────────────────
 * JavaScript bridge between the Wasm module and the UI.
 *
 * Responsibilities:
 *   - Bootstrap the HanoiModule (Emscripten output)
 *   - Wrap raw C functions with readable JS methods
 *   - Emit custom DOM events so the UI stays decoupled
 *
 * The UI NEVER calls Module._xxx directly.
 * The UI ONLY calls HanoiBridge.xxx().
 * ──────────────────────────────────────────────────────────────────
 */

const HanoiBridge = (() => {
    let M = null;          // Emscripten module instance
    let ready = false;

    // ── Bootstrap ──────────────────────────────────────────────────
    async function init(wasmUrl = "./hanoi.js") {
        return new Promise((resolve, reject) => {
            // Emscripten modularized output: HanoiModule() returns a promise
            const script = document.createElement("script");
            script.src = wasmUrl;
            script.onload = () => {
                HanoiModule().then((instance) => {
                    M = instance;
                    ready = true;
                    resolve();
                }).catch(reject);
            };
            script.onerror = () => reject(new Error("Failed to load hanoi.js"));
            document.head.appendChild(script);
        });
    }

    // ── Guard ───────────────────────────────────────────────────────
    function assertReady() {
        if (!ready) throw new Error("HanoiModule not initialised. Call HanoiBridge.init() first.");
    }

    // ── Game API ────────────────────────────────────────────────────
    function reset(numDisks) {
        assertReady();
        M._hanoi_reset(numDisks);
        emit("hanoi:reset", { numDisks });
        emit("hanoi:statechange", getState());
    }

    /** @returns {boolean} true if the move was legal */
    function move(from, to) {
        assertReady();
        const ok = M._hanoi_move(from, to) === 1;
        if (ok) {
            const state = getState();
            emit("hanoi:move", { from, to });
            emit("hanoi:statechange", state);
            if (state.finished) emit("hanoi:finished", state);
        }
        return ok;
    }

    /** Precompute solution and return the array of steps */
    function precomputeSolution() {
        assertReady();
        const count = M._hanoi_solve_precompute();
        const steps = [];
        for (let i = 0; i < count; i++) {
            steps.push({
                from: M._hanoi_solve_step_from(i),
                to:   M._hanoi_solve_step_to(i),
                disk: M._hanoi_solve_step_disk(i),
            });
        }
        return steps;
    }

    // ── State snapshot ──────────────────────────────────────────────
    function getState() {
        assertReady();
        const numDisks   = M._hanoi_get_num_disks();
        const moveCount  = M._hanoi_get_move_count();
        const finished   = M._hanoi_is_finished() === 1;

        const towers = [0, 1, 2].map(t => {
            const sz    = M._hanoi_get_tower_size(t);
            const disks = [];
            for (let i = 0; i < sz; i++) {
                disks.push(M._hanoi_get_disk_at(t, i));
            }
            return disks;  // index 0 = bottom
        });

        return { numDisks, moveCount, finished, towers };
    }

    // ── Event bus ───────────────────────────────────────────────────
    function emit(type, detail) {
        document.dispatchEvent(new CustomEvent(type, { detail }));
    }

    function on(type, handler) {
        document.addEventListener(type, (e) => handler(e.detail));
    }

    // ── Public surface ──────────────────────────────────────────────
    return { init, reset, move, precomputeSolution, getState, on };
})();

// Export for module systems (optional)
if (typeof module !== "undefined") module.exports = HanoiBridge;
