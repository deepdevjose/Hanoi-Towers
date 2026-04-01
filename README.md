# Tower of Hanoi — C++ Core + WebAssembly

> **Design of a Reusable C++ Core for the Tower of Hanoi with WebAssembly Deployment and Browser-Based Visualization**

[![License: MIT](https://img.shields.io/badge/License-MIT-7c6aff.svg)](LICENSE)
[![C++17](https://img.shields.io/badge/C%2B%2B-17-f5a623.svg)]()
[![WebAssembly](https://img.shields.io/badge/WebAssembly-Emscripten-63e6be.svg)]()

---

## Architecture

```
┌─────────────────────────┐
│      UI Web             │  HTML / CSS / Canvas
│  (presentación)         │
└────────────┬────────────┘
             │ eventos DOM
┌────────────▼────────────┐
│   hanoi-bridge.js       │  Capa JS — wrapper de la API Wasm
│   (puente)              │
└────────────┬────────────┘
             │ Module._hanoi_*()
┌────────────▼────────────┐
│   hanoi.wasm            │  Núcleo C++ compilado con Emscripten
│   (motor)               │  HanoiGame · HanoiSolver · Tower · Disk
└─────────────────────────┘
```

**Un solo núcleo C++.** No existe lógica duplicada en JavaScript.
La UI solo renderiza y despacha acciones; nunca toma decisiones del juego.

---

## Estructura del repositorio

```
Hanoi-Towers/
├── core/
│   ├── Disk.h            # Clase Disk (tamaño, comparadores)
│   ├── Tower.h           # Clase Tower — pila de discos con invariante
│   ├── HanoiGame.h       # Motor del juego — estado, movimientos, historial
│   ├── HanoiSolver.h     # Solver recursivo — genera secuencia óptima
│   └── hanoi_api.cpp     # API C exportada a WebAssembly (EMSCRIPTEN_KEEPALIVE)
├── web/
│   ├── index.html        # UI principal
│   ├── style.css         # Diseño oscuro con glassmorphism
│   ├── hanoi-bridge.js   # Puente JS ↔ Wasm (event-driven)
│   └── hanoi-ui.js       # Renderer Canvas + controles
├── tests/
│   ├── test_core.cpp     # Unit tests del motor (sin dependencias externas)
│   └── test_native.cpp   # CLI interactivo para pruebas nativas
├── docs/                 # UML, diagramas, capturas
├── paper/                # Paper académico y assets
├── CMakeLists.txt        # Build: nativo (tests) + Emscripten (Wasm)
└── README.md
```

---

## Compilación

### Prerrequisitos

| Herramienta | Versión recomendada |
|-------------|---------------------|
| C++ compiler | GCC ≥ 11 / Clang ≥ 14 / MSVC 2022 |
| CMake | ≥ 3.20 |
| Emscripten SDK | latest |

### 1. Instalar Emscripten

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest

# Linux/macOS:
source ./emsdk_env.sh

# Windows (PowerShell):
.\emsdk_env.ps1
```

### 2. Build nativo (pruebas sin navegador)

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build

# Ejecutar tests
ctest --test-dir build --output-on-failure

# CLI interactivo
./build/hanoi_native
```

### 3. Build WebAssembly

```bash
emcmake cmake -B build-wasm
cmake --build build-wasm

# Copiar salida a web/
cp build-wasm/hanoi.js  web/
cp build-wasm/hanoi.wasm web/
```

### 4. Servir la UI

```bash
# Python
cd web && python -m http.server 8080

# Node.js
cd web && npx serve .
```

Luego abre `http://localhost:8080`.

---

## API Wasm (C → JS)

| Función | Descripción |
|---------|-------------|
| `hanoi_init(n)` | Inicializar con n discos |
| `hanoi_reset(n)` | Reiniciar |
| `hanoi_move(from, to)` | Mover disco; retorna 1 si legal |
| `hanoi_is_finished()` | 1 si el puzzle está resuelto |
| `hanoi_get_move_count()` | Movimientos realizados |
| `hanoi_get_num_disks()` | Cantidad de discos |
| `hanoi_get_tower_size(t)` | Discos en torre t |
| `hanoi_get_disk_at(t, i)` | Tamaño del disco en posición i |
| `hanoi_solve_precompute()` | Calcular solución óptima; retorna nº de pasos |
| `hanoi_solve_step_from(i)` | Torre origen del paso i |
| `hanoi_solve_step_to(i)` | Torre destino del paso i |
| `hanoi_solve_step_disk(i)` | Disco movido en el paso i |

---

## Características de la UI

- Modo manual: click para seleccionar y mover discos
- Modo automático: solver recursivo con animación paso a paso
- Control de velocidad de animación (1× a 10×)
- Historial de movimientos en tiempo real
- Estadísticas: movimientos, óptimo, eficiencia
- Responsive: funciona en móvil y desktop
- Fallback JS en ausencia del módulo Wasm (para desarrollo)

---

## Ejes académicos

1. **Modelado OO**: `Disk`, `Tower`, `HanoiGame`, `HanoiSolver`
2. **Pilas como estructura de datos**: `Tower` implementa pila LIFO con invariante
3. **Solver recursivo**: algoritmo clásico de Hanói `O(2^n)` pasos
4. **Separación core / UI**: la lógica nunca está en JavaScript
5. **Compilación a WebAssembly**: Emscripten + CMake dual-mode
6. **Integración C++/JS**: funciones C exportadas con `EMSCRIPTEN_KEEPALIVE`
7. **Visualización interactiva**: Canvas + event-driven bridge

---

## Licencia

MIT — ver [LICENSE](LICENSE)
