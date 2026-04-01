/**
 * @file hanoi_api.cpp
 * @brief C-exported API for WebAssembly / Emscripten.
 *
 * Every function here is callable from JavaScript via Module._<name>().
 * We keep the API flat (C-style) so the JS bridge remains trivial.
 *
 * Build with:
 *   emcc hanoi_api.cpp -o hanoi.js \
 *        -sEXPORTED_FUNCTIONS="['_hanoi_init','_hanoi_reset','_hanoi_move',\
 *          '_hanoi_is_finished','_hanoi_get_move_count','_hanoi_get_num_disks',\
 *          '_hanoi_get_tower_size','_hanoi_get_disk_at',\
 *          '_hanoi_solve_step_count','_hanoi_solve_get_step',\
 *          '_hanoi_solve_step_from','_hanoi_solve_step_to','_hanoi_solve_step_disk']" \
 *        -sEXPORTED_RUNTIME_METHODS="['cwrap','ccall']" \
 *        -sALLOW_MEMORY_GROWTH=1 \
 *        -O2
 */

#include "HanoiGame.h"
#include "HanoiSolver.h"
#include <emscripten.h>
#include <vector>

// --------------------------------------------------------------------------
// Global singletons (one game, one cached solution sequence)
// --------------------------------------------------------------------------
static HanoiGame            g_game;
static std::vector<Move>    g_solution;

// --------------------------------------------------------------------------
// Lifecycle
// --------------------------------------------------------------------------

extern "C" {

/** Initialise (or re-initialise) the game with numDisks disks. */
EMSCRIPTEN_KEEPALIVE
void hanoi_init(int numDisks) {
    g_game.reset(numDisks);
    g_solution.clear();
}

/** Alias for hanoi_init — keeps the JS API intention clear. */
EMSCRIPTEN_KEEPALIVE
void hanoi_reset(int numDisks) {
    hanoi_init(numDisks);
}

// --------------------------------------------------------------------------
// Manual moves
// --------------------------------------------------------------------------

/**
 * @brief Try to move the top disk from tower `from` to tower `to`.
 * @return 1 if the move was legal and applied, 0 otherwise.
 */
EMSCRIPTEN_KEEPALIVE
int hanoi_move(int from, int to) {
    return g_game.moveDisk(from, to) ? 1 : 0;
}

// --------------------------------------------------------------------------
// State queries
// --------------------------------------------------------------------------

/** Returns 1 if the puzzle is solved, 0 otherwise. */
EMSCRIPTEN_KEEPALIVE
int hanoi_is_finished() {
    return g_game.isFinished() ? 1 : 0;
}

/** Total moves made so far. */
EMSCRIPTEN_KEEPALIVE
int hanoi_get_move_count() {
    return g_game.getMoveCount();
}

/** Number of disks the game was initialised with. */
EMSCRIPTEN_KEEPALIVE
int hanoi_get_num_disks() {
    return g_game.getNumDisks();
}

/** Number of disks currently on tower t (0-indexed). */
EMSCRIPTEN_KEEPALIVE
int hanoi_get_tower_size(int t) {
    return g_game.getTowerSize(t);
}

/**
 * @brief Size of the disk at position i on tower t.
 * @param t Tower index (0, 1, 2)
 * @param i Position from bottom (0 = bottom)
 * @return Disk size, or -1 if out of range.
 */
EMSCRIPTEN_KEEPALIVE
int hanoi_get_disk_at(int t, int i) {
    return g_game.getDiskAt(t, i);
}

// --------------------------------------------------------------------------
// Solver — pre-computes solution into g_solution, then JS iterates over it
// --------------------------------------------------------------------------

/**
 * @brief Compute the optimal solution for the current game state.
 *        Always solves from a fresh position (tower 0 → tower 2 via tower 1).
 * @return Total number of steps in the solution.
 */
EMSCRIPTEN_KEEPALIVE
int hanoi_solve_precompute() {
    g_solution = HanoiSolver::solve(g_game.getNumDisks(), 0, 2, 1);
    return static_cast<int>(g_solution.size());
}

/** Number of steps in the last precomputed solution. */
EMSCRIPTEN_KEEPALIVE
int hanoi_solve_step_count() {
    return static_cast<int>(g_solution.size());
}

/** Source tower of step `idx` in the solution. */
EMSCRIPTEN_KEEPALIVE
int hanoi_solve_step_from(int idx) {
    if (idx < 0 || idx >= static_cast<int>(g_solution.size())) return -1;
    return g_solution[idx].from;
}

/** Destination tower of step `idx` in the solution. */
EMSCRIPTEN_KEEPALIVE
int hanoi_solve_step_to(int idx) {
    if (idx < 0 || idx >= static_cast<int>(g_solution.size())) return -1;
    return g_solution[idx].to;
}

/** Disk size moved at step `idx` in the solution. */
EMSCRIPTEN_KEEPALIVE
int hanoi_solve_step_disk(int idx) {
    if (idx < 0 || idx >= static_cast<int>(g_solution.size())) return -1;
    return g_solution[idx].disk;
}

} // extern "C"
