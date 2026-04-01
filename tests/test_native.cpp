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
    std::cout << "Torre de Hanoi — CLI\n";
    std::cout << "Número de discos (1-8): ";
    std::cin >> n;

    HanoiGame game(n);

    std::cout << "\nComandos:\n"
              << "  m <from> <to>  — mover disco (torres: 0=A 1=B 2=C)\n"
              << "  s              — resolver automáticamente\n"
              << "  r              — reiniciar\n"
              << "  q              — salir\n";

    std::string cmd;
    while (true) {
        printState(game);
        if (game.isFinished()) {
            std::cout << "\n¡Resuelto en " << game.getMoveCount()
                      << " movimientos!\n\n";
        }

        std::cout << "> ";
        std::cin >> cmd;

        if (cmd == "q") break;

        if (cmd == "m") {
            int from, to;
            std::cin >> from >> to;
            if (!game.moveDisk(from, to)) {
                std::cout << "  Movimiento ilegal.\n";
            }
        } else if (cmd == "s") {
            game.reset(n);
            auto steps = HanoiSolver::solve(n);
            std::cout << "  Solución en " << steps.size() << " pasos:\n";
            for (const auto& m : steps) {
                std::cout << "    " << m.from << " -> " << m.to
                          << "  (disco " << m.disk << ")\n";
                game.moveDisk(m.from, m.to);
            }
        } else if (cmd == "r") {
            game.reset(n);
        }
    }
    return 0;
}
