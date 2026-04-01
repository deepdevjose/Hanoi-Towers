/**
 * @file test_native.cpp
 * @brief Interactive CLI to manually play/test the game without a browser.
 *
 * Build & run:
 *   cmake -B build && cmake --build build
 *   ./build/hanoi_native
 */

#include "HanoiGame.h"
#include "HanoiSolver.h"
#include <iostream>
#include <string>

static void printState(const HanoiGame& g) {
    int n = g.getNumDisks();
    std::cout << "\n";
    for (int t = 0; t < 3; ++t) {
        std::cout << "  [" << g.getTowerName(t) << "] ";
        for (int i = 0; i < g.getTowerSize(t); ++i) {
            std::cout << g.getDiskAt(t, i) << " ";
        }
        std::cout << "\n";
    }
    std::cout << "  Moves: " << g.getMoveCount() << "\n";
}

int main() {
    int n;
    std::cout << "Tower of Hanoi -- CLI\n";
    std::cout << "Number of disks (1-8): ";
    std::cin >> n;

    HanoiGame game(n);

    std::cout << "\nCommands:\n"
              << "  m <from> <to>  -- move disk (towers: 0=A 1=B 2=C)\n"
              << "  s              -- auto-solve\n"
              << "  r              -- restart\n"
              << "  q              -- quit\n";

    std::string cmd;
    while (true) {
        printState(game);
        if (game.isFinished()) {
            std::cout << "\nSolved in " << game.getMoveCount()
                      << " moves!\n\n";
        }

        std::cout << "> ";
        std::cin >> cmd;

        if (cmd == "q") break;

        if (cmd == "m") {
            int from, to;
            std::cin >> from >> to;
            if (!game.moveDisk(from, to)) {
                std::cout << "  Illegal move.\n";
            }
        } else if (cmd == "s") {
            game.reset(n);
            auto steps = HanoiSolver::solve(n);
            std::cout << "  Solution in " << steps.size() << " steps:\n";
            for (const auto& m : steps) {
                std::cout << "    " << m.from << " -> " << m.to
                          << "  (disk " << m.disk << ")\n";
                game.moveDisk(m.from, m.to);
            }
        } else if (cmd == "r") {
            game.reset(n);
        }
    }
    return 0;
}
