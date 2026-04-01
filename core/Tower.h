#pragma once

#include "Disk.h"
#include <vector>
#include <stdexcept>
#include <string>

/**
 * @file Tower.h
 * @brief Represents one peg/tower in the Tower of Hanoi puzzle.
 *
 * Internally uses a stack (std::vector).
 * Enforces the game invariant: no larger disk on top of a smaller one.
 */
class Tower {
public:
    explicit Tower(std::string name) : m_name(std::move(name)) {}

    const std::string& name() const { return m_name; }

    // Push a disk onto this tower. Throws if the move violates the invariant.
    void push(const Disk& disk) {
        if (!m_disks.empty() && m_disks.back().size() < disk.size()) {
            throw std::invalid_argument(
                "Cannot place disk " + std::to_string(disk.size()) +
                " on top of disk " + std::to_string(m_disks.back().size()));
        }
        m_disks.push_back(disk);
    }

    // Pop the top disk. Throws if empty.
    Disk pop() {
        if (m_disks.empty()) {
            throw std::out_of_range("Tower '" + m_name + "' is empty");
        }
        Disk top = m_disks.back();
        m_disks.pop_back();
        return top;
    }

    // Peek at the top disk without removing it.
    const Disk& top() const {
        if (m_disks.empty()) {
            throw std::out_of_range("Tower '" + m_name + "' is empty");
        }
        return m_disks.back();
    }

    bool empty() const { return m_disks.empty(); }
    int  size()  const { return static_cast<int>(m_disks.size()); }

    const std::vector<Disk>& disks() const { return m_disks; }

    void clear() { m_disks.clear(); }

private:
    std::string       m_name;
    std::vector<Disk> m_disks; // index 0 = bottom, back = top
};
