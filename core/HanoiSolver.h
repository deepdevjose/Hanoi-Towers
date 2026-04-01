#pragma once

#include "HanoiGame.h"
#include <vector>
#include <functional>

/**
 * @file HanoiSolver.h
 * @brief Recursive solver for the Tower of Hanoi puzzle.
 *
 * Generates the optimal sequence of moves (2^n - 1 moves for n disks)
 * using the classic three-peg recursive algorithm.
 *
 * Usage:
 *   HanoiSolver solver;
 *   auto steps = solver.solve(n, 0, 2, 1); // from A to C via B
 *   // steps is a vector of Move{from, to, disk}
 */
class HanoiSolver {
public:
    using StepCallback = std::function<void(Move)>;

    /**
     * @brief Compute the full solution sequence.
     * @param n      Number of disks
     * @param from   Source tower index
     * @param to     Destination tower index
     * @param aux    Auxiliary tower index
     * @return Ordered list of moves that solves the puzzle
     */
    static std::vector<Move> solve(int n, int from = 0, int to = 2, int aux = 1) {
        std::vector<Move> steps;
        steps.reserve(computeStepCount(n));
        solveRecursive(n, from, to, aux, steps);
        return steps;
    }

    /**
     * @brief Compute the minimum number of moves needed (2^n - 1).
     */
    static int computeStepCount(int n) {
        int count = 1;
        for (int i = 0; i < n; ++i) count *= 2;
        return count - 1;
    }

    /**
     * @brief Apply each move of the solution directly to a HanoiGame.
     *        Useful for automated playback.
     * @param game  Game instance (will be modified)
     * @param steps Solution sequence returned by solve()
     */
    static void applyTo(HanoiGame& game, const std::vector<Move>& steps) {
        for (const auto& m : steps) {
            game.moveDisk(m.from, m.to);
        }
    }

private:
    static void solveRecursive(int n, int from, int to, int aux,
                               std::vector<Move>& steps) {
        if (n == 0) return;

        // Move n-1 disks from source to auxiliary, using destination as buffer
        solveRecursive(n - 1, from, aux, to, steps);

        // Move the nth (largest remaining) disk directly to destination
        // We need to know the disk size: it's the largest disk on `from`
        // In the recursive context, it equals n (since we always start fully loaded)
        steps.push_back({from, to, n});

        // Move n-1 disks from auxiliary to destination, using source as buffer
        solveRecursive(n - 1, aux, to, from, steps);
    }
};
