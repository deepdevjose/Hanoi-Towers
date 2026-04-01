#pragma once

/**
 * @file Disk.h
 * @brief Represents a single disk in the Tower of Hanoi puzzle.
 *
 * A disk has a size (1 = smallest). The core invariant is that
 * a larger disk can never be placed on top of a smaller one.
 */
class Disk {
public:
    explicit Disk(int size) : m_size(size) {}

    int size() const { return m_size; }

    bool operator<(const Disk& other) const { return m_size < other.m_size; }
    bool operator>(const Disk& other) const { return m_size > other.m_size; }
    bool operator==(const Disk& other) const { return m_size == other.m_size; }

private:
    int m_size;
};
