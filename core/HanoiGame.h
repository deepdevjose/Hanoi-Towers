#pragma once

#include "Tower.h"
#include <vector>
#include <string>
#include <stdexcept>

/**
 * @brief Represents one recorded move in the history.
 */
struct Move {
    int from;   // tower index (0, 1, 2)
    int to;     // tower index (0, 1, 2)
    int disk;   // disk size that was moved
};

/**
 * @file HanoiGame.h
 * @brief Central state machine for the Tower of Hanoi puzzle.
 *
 * Owns the three towers, the disk configuration, and the move history.
 * Enforces all game rules; never exposes raw mutation.
 *
 * Public API (exposed to JS via Emscripten):
 *   - reset(n)        Restart with n disks
 *   - moveDisk(from, to)
 *   - isFinished()
 *   - getTowerSize(t)
 *   - getDiskAt(t, i)
 *   - getMoveCount()
 *   - getHistory()
 */
class HanoiGame {
public:
    static constexpr int NUM_TOWERS = 3;

    explicit HanoiGame(int numDisks = 3) {
        reset(numDisks);
    }

    // ------- Lifecycle -------

    /** Re-initialise with numDisks disks. All disks start on tower 0. */
    void reset(int numDisks) {
        if (numDisks < 1 || numDisks > 20) {
            throw std::invalid_argument("numDisks must be between 1 and 20");
        }
        m_numDisks = numDisks;
        m_towers.clear();
        m_towers.emplace_back("A");
        m_towers.emplace_back("B");
        m_towers.emplace_back("C");

        // Place disks largest → smallest so that top = smallest
        for (int s = numDisks; s >= 1; --s) {
            m_towers[0].push(Disk(s));
        }
        m_history.clear();
        m_finished = false;
    }

    // ------- Moves -------

    /**
     * @brief Attempt to move the top disk from tower `from` to tower `to`.
     * @return true if successful, false if the move is illegal.
     */
    bool moveDisk(int from, int to) {
        if (from < 0 || from >= NUM_TOWERS || to < 0 || to >= NUM_TOWERS) return false;
        if (from == to) return false;
        if (m_towers[from].empty()) return false;
        if (!m_towers[to].empty() &&
            m_towers[to].top().size() < m_towers[from].top().size()) return false;

        Disk d = m_towers[from].pop();
        m_towers[to].push(d);
        m_history.push_back({from, to, d.size()});

        // Win condition: all disks on tower 1 or 2 (not 0)
        m_finished = checkFinished();
        return true;
    }

    // ------- Queries -------

    bool isFinished()    const { return m_finished; }
    int  getMoveCount()  const { return static_cast<int>(m_history.size()); }
    int  getNumDisks()   const { return m_numDisks; }
    int  getNumTowers()  const { return NUM_TOWERS; }

    /** Number of disks on tower t (0-indexed). */
    int getTowerSize(int t) const {
        if (t < 0 || t >= NUM_TOWERS) return -1;
        return m_towers[t].size();
    }

    /** Size of the disk at position i (0 = bottom) on tower t. */
    int getDiskAt(int t, int i) const {
        if (t < 0 || t >= NUM_TOWERS) return -1;
        const auto& disks = m_towers[t].disks();
        if (i < 0 || i >= static_cast<int>(disks.size())) return -1;
        return disks[i].size();
    }

    const std::vector<Move>& getHistory() const { return m_history; }

    /** Name of tower t ("A", "B", or "C"). */
    std::string getTowerName(int t) const {
        if (t < 0 || t >= NUM_TOWERS) return "";
        return m_towers[t].name();
    }

private:
    bool checkFinished() const {
        // Puzzle is solved when all disks are on tower 1 or tower 2
        return (m_towers[0].empty() &&
               (m_towers[1].size() == m_numDisks || m_towers[2].size() == m_numDisks));
    }

    int               m_numDisks  = 3;
    bool              m_finished  = false;
    std::vector<Tower> m_towers;
    std::vector<Move>  m_history;
};
