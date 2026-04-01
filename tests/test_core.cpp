/**
 * @file test_core.cpp
 * @brief Unit tests for the HanoiGame and HanoiSolver core logic.
 *
 * Minimal test framework (no external deps). Prints PASS/FAIL per test.
 * Should be run natively before any Wasm compilation.
 *
 * Build & run:
 *   cmake -B build -DCMAKE_BUILD_TYPE=Debug
 *   cmake --build build
 *   ctest --test-dir build --output-on-failure
 */

#include "HanoiGame.h"
#include "HanoiSolver.h"
#include <iostream>
#include <cassert>
#include <stdexcept>

// ---------------------------------------------------------------------------
// Tiny test harness
// ---------------------------------------------------------------------------
static int g_passed = 0;
static int g_failed = 0;

#define TEST(name, expr)                                                 \
    do {                                                                 \
        if (expr) {                                                      \
            std::cout << "  [PASS] " << name << "\n";                   \
            ++g_passed;                                                  \
        } else {                                                         \
            std::cout << "  [FAIL] " << name << "\n";                   \
            ++g_failed;                                                  \
        }                                                                \
    } while (false)

// ---------------------------------------------------------------------------
// Disk tests
// ---------------------------------------------------------------------------
void test_disk() {
    std::cout << "\n=== Disk ===\n";
    Disk a(3), b(5), c(3);
    TEST("smaller <",  a < b);
    TEST("larger  >",  b > a);
    TEST("equal   ==", a == c);
}

// ---------------------------------------------------------------------------
// Tower tests
// ---------------------------------------------------------------------------
void test_tower() {
    std::cout << "\n=== Tower ===\n";
    Tower t("A");
    TEST("starts empty",   t.empty());

    t.push(Disk(3));
    t.push(Disk(2));
    t.push(Disk(1));
    TEST("size 3 after pushes",        t.size() == 3);
    TEST("top is smallest disk (1)",   t.top().size() == 1);

    Disk d = t.pop();
    TEST("popped disk size 1",         d.size() == 1);
    TEST("size 2 after pop",           t.size() == 2);

    // Invariant: cannot place a larger disk on a smaller one
    bool threw = false;
    try { t.push(Disk(5)); }
    catch (const std::invalid_argument&) { threw = true; }
    TEST("push larger onto smaller throws", threw);

    // Pop until empty
    t.pop(); t.pop();
    bool emptyThrew = false;
    try { t.pop(); }
    catch (const std::out_of_range&) { emptyThrew = true; }
    TEST("pop from empty throws", emptyThrew);
}

// ---------------------------------------------------------------------------
// HanoiGame tests
// ---------------------------------------------------------------------------
void test_game() {
    std::cout << "\n=== HanoiGame ===\n";
    HanoiGame g(3);

    TEST("numDisks == 3",              g.getNumDisks() == 3);
    TEST("tower 0 has 3 disks",        g.getTowerSize(0) == 3);
    TEST("tower 1 is empty",           g.getTowerSize(1) == 0);
    TEST("tower 2 is empty",           g.getTowerSize(2) == 0);
    TEST("not finished at start",      !g.isFinished());
    TEST("moveCount == 0 at start",    g.getMoveCount() == 0);

    // Bottom disk of tower 0 must be the largest (numDisks)
    TEST("bottom disk of tower 0 is 3", g.getDiskAt(0, 0) == 3);

    // Legal move
    bool ok = g.moveDisk(0, 2);
    TEST("legal move returns true",    ok);
    TEST("move count is 1",            g.getMoveCount() == 1);
    TEST("tower 0 now has 2 disks",    g.getTowerSize(0) == 2);
    TEST("tower 2 now has 1 disk",     g.getTowerSize(2) == 1);

    // Illegal move (larger onto smaller)
    bool bad = g.moveDisk(0, 2); // disk 2 onto disk 1 → illegal
    TEST("illegal move returns false", !bad);

    // Reset
    g.reset(2);
    TEST("after reset numDisks == 2",  g.getNumDisks() == 2);
    TEST("after reset tower 0 == 2",   g.getTowerSize(0) == 2);
    TEST("after reset moveCount == 0", g.getMoveCount() == 0);
}

// ---------------------------------------------------------------------------
// HanoiSolver tests
// ---------------------------------------------------------------------------
void test_solver() {
    std::cout << "\n=== HanoiSolver ===\n";

    for (int n = 1; n <= 6; ++n) {
        int expected = HanoiSolver::computeStepCount(n);

        HanoiGame g(n);
        auto steps = HanoiSolver::solve(n);

        TEST("step count == 2^n-1 for n=" + std::to_string(n),
             static_cast<int>(steps.size()) == expected);

        // Apply solution to a fresh game
        HanoiGame g2(n);
        HanoiSolver::applyTo(g2, steps);

        TEST("game is finished after solution for n=" + std::to_string(n),
             g2.isFinished());

        TEST("move count matches step count for n=" + std::to_string(n),
             g2.getMoveCount() == expected);
    }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
int main() {
    std::cout << "== Hanoi Core Tests ==\n";

    test_disk();
    test_tower();
    test_game();
    test_solver();

    std::cout << "\n== Results: " << g_passed << " passed, "
              << g_failed << " failed ==\n";

    return g_failed == 0 ? 0 : 1;
}
