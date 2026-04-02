# Algorithm Analysis

## 1. Problem Definition

**Instance**: Three pegs A, B, C. Peg A holds n disks, ordered by size with the largest at the bottom (disk n) and the smallest at the top (disk 1). Pegs B and C are initially empty.

**Goal**: Transfer all n disks from peg A to peg C using peg B as auxiliary storage.

**Constraints**:
1. Only the top disk of any peg may be moved in a single operation.
2. A disk may never be placed on top of a smaller disk.
3. Only one disk may be moved per operation.

These constraints define a **decision tree** over legal configurations. The cardinality of the reachable state space for n disks over 3 pegs is 3ⁿ distinct configurations (since each disk can independently reside on any of the three pegs). The problem asks for the shortest path in this state graph from the initial configuration to the goal configuration.

---

## 2. Recursive Algorithm

### 2.1 Subproblem Decomposition

The algorithm is derived from a single recursive observation:

> To move n disks from peg `src` to peg `dst` using `aux` as auxiliary:
> 1. Move the top (n − 1) disks from `src` to `aux` using `dst` as auxiliary.
> 2. Move disk n from `src` to `dst` (one operation — always legal since disk n is the largest).
> 3. Move the (n − 1) disks from `aux` to `dst` using `src` as auxiliary.

**Base case**: n = 0 — no operation required.

### 2.2 Implementation

```cpp
static void solveRecursive(int n, int from, int to, int aux,
                           std::vector<Move>& steps) {
    if (n == 0) return;
    solveRecursive(n - 1, from, aux, to, steps);   // step 1
    steps.push_back({from, to, n});                 // step 2
    solveRecursive(n - 1, aux, to, from, steps);    // step 3
}
```

The three peg indices permute across recursive calls; at no point does the algorithm need to reference a global peg assignment. The solution is therefore **parameterized by peg roles**, not by fixed labels.

---

## 3. Recurrence Relation

Let T(n) denote the minimum number of moves required to transfer n disks.

From the recursive decomposition:

$$T(n) = 2 \cdot T(n-1) + 1, \quad T(0) = 0$$

**Closed-form solution** (by repeated substitution or induction):

$$T(n) = 2^n - 1$$

**Derivation by unrolling**:

$$T(n) = 2T(n-1) + 1$$
$$= 2(2T(n-2) + 1) + 1 = 4T(n-2) + 3$$
$$= 4(2T(n-3) + 1) + 3 = 8T(n-3) + 7$$
$$= 2^k T(n-k) + (2^k - 1)$$

Setting k = n and using T(0) = 0:

$$T(n) = 2^n \cdot 0 + (2^n - 1) = 2^n - 1$$

---

## 4. Optimality

**Theorem**: T(n) = 2ⁿ − 1 is a **lower bound** — no algorithm can solve the n-disk problem in fewer than 2ⁿ − 1 moves.

**Proof sketch (by induction on n)**:

*Base case*: n = 1. One move is necessary and sufficient. T(1) = 2¹ − 1 = 1. ✓

*Inductive step*: Assume any algorithm requires at least 2ᵏ − 1 moves for k disks. Consider the (k+1)-disk case. Disk k+1 (the largest) must be moved at least once. Before it can be moved, all k smaller disks must reside on a single peg (other than source and destination), requiring at least 2ᵏ − 1 moves by the inductive hypothesis. After moving disk k+1, all k disks must be moved to the destination peg: another 2ᵏ − 1 moves. Therefore any algorithm requires at least 2(2ᵏ − 1) + 1 = 2^(k+1) − 1 moves. ✓

The recursive algorithm achieves this bound exactly, so it is **optimal**.

---

## 5. Complexity Analysis

### 5.1 Time Complexity

| Operation | Complexity | Note |
|-----------|-----------|------|
| Full solve (generate steps) | O(2ⁿ) | Each of the 2ⁿ−1 moves is generated in O(1) |
| Single move validation | O(1) | Top-of-stack comparison |
| State query | O(n) | Iterate over up to n disks per tower |
| History append | O(1) amortized | `std::vector` push_back |

The exponential growth of T(n) = 2ⁿ − 1 is intrinsic to the problem, not an artifact of the algorithm. Because the lower bound equals the upper bound, no polynomial-time algorithm exists for computing the complete move sequence (since the output itself has exponential size).

### 5.2 Space Complexity

| Structure | Space | Note |
|-----------|-------|------|
| Disk stacks | O(n) | n disks distributed across 3 pegs |
| Recursion stack depth | O(n) | Maximum depth of `solveRecursive` |
| Precomputed solution | O(2ⁿ) | Full move sequence stored in `std::vector<Move>` |
| Call stack (worst case) | O(n) | Tail-like recursion; depth bounded by n |

The `O(2ⁿ)` space for the precomputed solution is unavoidable when the solution must be materialized in full (as required for the animated step-by-step playback in the UI). An alternative design would generate moves lazily via a generator (coroutine or iterator), reducing space to O(n) at the cost of increased coupling between solver and UI.

### 5.3 Growth Table

| n | T(n) = 2ⁿ − 1 | Approximate time @ 1 move/s |
|---|---------------|------------------------------|
| 3 | 7 | 7 seconds |
| 5 | 31 | 31 seconds |
| 10 | 1,023 | ~17 minutes |
| 20 | 1,048,575 | ~12 days |
| 30 | 1,073,741,823 | ~34 years |
| 64 | 1.84 × 10¹⁹ | ~585 billion years |

The n = 64 case is the subject of the Tower of Brahma legend (Édouard Lucas, 1883), in which monks are said to be transferring 64 golden disks — and the world will end when they finish.

---

## 6. Correctness Argument

We verify correctness of `HanoiSolver::solve` by strong induction on n.

**Claim**: `solveRecursive(n, src, dst, aux, steps)` appends to `steps` a sequence of moves that (a) legally transfers all n disks from `src` to `dst`, and (b) contains exactly 2ⁿ − 1 moves.

**Base case** (n = 0): No moves are appended. Zero disks require zero moves. ✓

**Inductive case**: Assume the claim holds for all k < n.

1. `solveRecursive(n−1, src, aux, dst, steps)` legally moves the top (n−1) disks from `src` to `aux` in 2^(n−1) − 1 moves (inductive hypothesis). Disk n is never moved in this phase, so it remains on `src` and is always larger than any disk that lands on `aux`.

2. `steps.push_back({src, dst, n})` records the move of disk n from `src` to `dst`. This is legal because: `dst` is empty (all disks on `src` were moved to `aux`) or contains only disks larger than n (impossible since n was the largest). Hence the move is valid.

3. `solveRecursive(n−1, aux, dst, src, steps)` legally moves the (n−1) disks from `aux` to `dst` in 2^(n−1) − 1 moves (inductive hypothesis). Disk n is already on `dst` and is larger than all disks being moved, so the invariant is preserved.

Total moves: 2(2^(n−1) − 1) + 1 = 2ⁿ − 1. ✓
