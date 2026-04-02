# Conclusion

## 1. Summary of Contributions

This project demonstrates the feasibility and practical advantages of a **cross-compiled, single-source C++ engine** deployed to the browser as a WebAssembly binary for an interactive combinatorial puzzle visualization. The following outcomes were achieved:

1. **Single source of truth**: The domain model — game state, constraint enforcement, recursive solver, and move history — is implemented exactly once in C++17. No JavaScript reimplementation of any game logic exists in the codebase.

2. **Formal invariant enforcement**: The `Tower` class encodes the fundamental Hanoi constraint directly in its `push` method, making invariant violations impossible through the public API. This is a qualitative improvement over JavaScript implementations, where such guarantees typically require runtime assertions or external test suites.

3. **Optimal solver with formal guarantees**: The recursive solver is proven optimal (exactly 2ⁿ − 1 moves for n disks) via strong induction. The implementation matches the theoretical lower bound for all tested values of n ∈ {1, …, 20}.

4. **Dual compilation target**: The same codebase compiles to a native binary for offline unit testing and to a WebAssembly binary for browser deployment. CI automation (GitHub Actions) reproduces the Wasm build deterministically on every push to `main`.

5. **Clean three-layer architecture**: The system enforces a strict unidirectional data flow from the C++ core through a thin JavaScript bridge to a presentation-only Canvas UI. No layer bypasses or circumvents the boundaries of the layer below it.

---

## 2. Advantages of the Approach

### 2.1 Reproducibility

A WebAssembly binary produced from a fixed source commit and a fixed Emscripten version is deterministic. Any collaborator can reproduce the identical deployment artifact from the source repository, satisfying the reproducibility expectations of software engineering research.

### 2.2 Testability Without a Browser

Native compilation allows the core engine to be subjected to automated unit testing (via `ctest`) without any browser or JavaScript runtime dependency. Tests run in under one second and can be integrated into any standard CI pipeline.

### 2.3 Portability

The C++ core headers (`Disk.h`, `Tower.h`, `HanoiGame.h`, `HanoiSolver.h`) have no dependencies beyond the C++17 standard library. They can be reused in:
- a native desktop application (Qt, wxWidgets, SFML),
- a command-line tool or educational solver,
- a different web UI built on React, Vue, or any other framework,
- or a future Wasm runtime embedded in a non-browser environment (Node.js, Wasmtime, WasmEdge).

### 2.4 Pedagogical Clarity

The strict separation between domain logic (C++), integration (JS bridge), and presentation (HTML/Canvas) makes the system architecture directly visible in the codebase. A reader can understand the role of each component in isolation, which is advantageous for educational use.

---

## 3. Limitations

### 3.1 Exponential Scalability

The fundamental limitation of the Tower of Hanoi problem is its intrinsic O(2ⁿ) complexity. The current UI caps n at 10 (1,023 moves) to remain within interactive time budgets. Values of n ≥ 25 produce solution vectors exceeding 300 MB, which is impractical for browser deployment without lazy generation.

### 3.2 No Native Undo in the Core

The undo operation is implemented in the JavaScript layer by resetting the game and replaying the history minus the last move. While correct and functionally adequate for n ≤ 10, this is O(k) per undo (where k is the move count). A more principled design would expose a `undoMove()` operation in `HanoiGame` that pops from the history and reverses the last stack operation in O(1).

### 3.3 Scalar-Only Wasm API

The current C API transmits only `int` scalars across the Wasm boundary. Reading the full game state requires O(n) round-trip calls to `hanoi_get_disk_at`. For large n, this introduces overhead that could be eliminated by serializing the complete state into a shared Wasm memory buffer read as a `TypedArray` by JavaScript — reducing state extraction to a single memory copy.

### 3.4 Visual Limitations

The Canvas renderer does not implement:
- multi-touch drag-and-drop (relevant for mobile),
- accessibility markup (ARIA labels for the canvas game board),
- or internationalization beyond the current English UI strings.

### 3.5 No Frame-Rate Independence

Animation durations are specified in milliseconds, but the render loop advances animation state based on `performance.now()` timestamps. Under sustained CPU load, frames may drop below 60 fps, causing visual stuttering without affecting logical correctness. A frame-rate-independent physics integration would improve resilience on low-power devices.

---

## 4. Future Work

| Direction | Description |
|-----------|-------------|
| Lazy solution generation | Implement `HanoiSolver` as a C++ coroutine or iterator to reduce space from O(2ⁿ) to O(n), enabling n > 20 in the UI |
| Native undo in core | Add `HanoiGame::undoMove()` operating in O(1) on the history stack |
| Embind / Emscripten Bindings | Replace the flat C API with Embind-generated bindings exposing `HanoiGame` as a first-class JavaScript class |
| Frame-rate-independent animation | Decouple animation progress from frame rate using `delta-time` integration |
| Accessibility | Add ARIA live regions announcing moves for screen reader users |
| Multi-peg generalization | Extend the core to support the Frame–Stewart algorithm for k > 3 pegs |
| Performance profiling | Instrument with Emscripten's built-in profiler to quantify Wasm vs. native overhead per operation type |
| Paper | Formalize this artifact into a full conference paper submission (ACM, IEEE, or arXiv preprint) |

---

## 5. Final Remarks

The Tower of Hanoi has been studied since Édouard Lucas introduced it in 1883. Its mathematical structure is completely understood, and it admits no polynomial-time solution. What this project contributes is not a new algorithm, but rather a concrete instantiation of software engineering best practices — **single-responsibility design, formal invariant enforcement, dual-mode compilation, and layer isolation** — applied to a well-understood domain, producing a reproducible, testable, and deployable artifact that serves simultaneously as an interactive educational tool and as a demonstration of C++ WebAssembly integration.
