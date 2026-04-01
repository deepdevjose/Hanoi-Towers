cmake_minimum_required(VERSION 3.20)
project(HanoiTowers VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---------------------------------------------------------------------------
# Source sets
# ---------------------------------------------------------------------------
set(CORE_HEADERS
    core/Disk.h
    core/Tower.h
    core/HanoiGame.h
    core/HanoiSolver.h
)

set(CORE_API_SRC
    core/hanoi_api.cpp
)

# ---------------------------------------------------------------------------
# Native build (for local testing without the browser)
# ---------------------------------------------------------------------------
if (NOT EMSCRIPTEN)
    message(STATUS "Configuring native build")

    # CLI test executable
    add_executable(hanoi_native
        ${CORE_HEADERS}
        tests/test_native.cpp
    )
    target_include_directories(hanoi_native PRIVATE core)

    # Unit tests (one executable per test file, can be extended)
    enable_testing()
    add_executable(hanoi_tests
        ${CORE_HEADERS}
        tests/test_core.cpp
    )
    target_include_directories(hanoi_tests PRIVATE core)
    add_test(NAME CoreTests COMMAND hanoi_tests)

# ---------------------------------------------------------------------------
# Emscripten / WebAssembly build
# ---------------------------------------------------------------------------
else()
    message(STATUS "Configuring Emscripten/Wasm build")

    add_executable(hanoi ${CORE_API_SRC})
    target_include_directories(hanoi PRIVATE core)

    set(EXPORTED_FUNCTIONS
        "_hanoi_init"
        "_hanoi_reset"
        "_hanoi_move"
        "_hanoi_is_finished"
        "_hanoi_get_move_count"
        "_hanoi_get_num_disks"
        "_hanoi_get_tower_size"
        "_hanoi_get_disk_at"
        "_hanoi_solve_precompute"
        "_hanoi_solve_step_count"
        "_hanoi_solve_step_from"
        "_hanoi_solve_step_to"
        "_hanoi_solve_step_disk"
    )

    string(JOIN "," EXPORTED_FUNCTIONS_STR ${EXPORTED_FUNCTIONS})

    set_target_properties(hanoi PROPERTIES
        SUFFIX ".js"
        OUTPUT_NAME "hanoi"
    )

    target_link_options(hanoi PRIVATE
        -sEXPORTED_FUNCTIONS=[${EXPORTED_FUNCTIONS_STR}]
        -sEXPORTED_RUNTIME_METHODS=[cwrap,ccall,getValue,setValue]
        -sALLOW_MEMORY_GROWTH=1
        -sMODULARIZE=1
        -sEXPORT_NAME=HanoiModule
        -sENVIRONMENT=web
        -O2
        --no-entry
    )
endif()
