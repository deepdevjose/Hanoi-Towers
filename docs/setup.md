# Guía de instalación — Torres de Hanói WebAssembly

> Sistema operativo: **Windows** · Shell: **PowerShell**

---

## Estado actual de tu máquina

Revisé qué tienes instalado. Este es el resultado:

| Herramienta | Estado | Versión |
|-------------|--------|---------|
| **Git** | ✅ Instalado | 2.53.0 |
| **Python** | ✅ Instalado | 3.14.3 |
| **Node.js** | ✅ Instalado | 24.14.1 |
| **g++ (compilador C++)** | ❌ No encontrado | — |
| **CMake** | ❌ No encontrado | — |
| **Emscripten (emcc)** | ❌ No encontrado | — |

Tienes lo que necesitas para servir la UI. Solo falta el toolchain para compilar C++ y generar el `.wasm`.

---

## Parte 1 — Cómo verificar cualquier herramienta

En cualquier momento puedes abrir **PowerShell** y ejecutar:

```powershell
g++      --version
cmake    --version
git      --version
python   --version
emcc     --version
node     --version
```

Si el comando responde con una versión → está instalado.  
Si dice *"is not recognized"* → no está instalado o no está en el PATH.

---

## Parte 2 — Instalar lo que falta

### 2.1 Compilador C++ + CMake — MSYS2 / MinGW-w64

MSYS2 instala `g++`, `gcc`, `make` y `cmake` en un solo paso.

**Paso a paso:**

1. Descarga el instalador desde: https://www.msys2.org/
2. Ejecuta el instalador (ruta por defecto: `C:\msys64`).
3. Al terminar, abre **"MSYS2 UCRT64"** desde el menú de inicio y ejecuta:

```bash
pacman -S --needed base-devel mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-cmake
```

4. Agrega la carpeta de binarios al PATH de Windows:
   - `Win + R` → escribe `sysdm.cpl` → Enter
   - Pestaña **Opciones avanzadas** → **Variables de entorno**
   - En *Variables del sistema*, selecciona `Path` → **Editar** → **Nuevo**
   - Agrega: `C:\msys64\ucrt64\bin`
   - Acepta todos los diálogos.

5. Cierra **todos** los PowerShell abiertos y abre uno nuevo. Verifica:

```powershell
g++ --version
cmake --version
```

Ambos deben mostrar su versión. ✅

---

### 2.2 Emscripten SDK (emsdk)

Emscripten convierte tu código C++ a WebAssembly. Usa Git para instalarlo (ya lo tienes ✅).

```powershell
# 1. Clona el repositorio de emsdk en C:\emsdk
cd C:\
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# 2. Instala la versión más reciente
.\emsdk install latest

# 3. Actívala (una vez, configura el sistema)
.\emsdk activate latest

# 4. Carga el entorno en tu sesión actual de PowerShell
.\emsdk_env.ps1
```

> [!IMPORTANT]
> El paso 4 (`emsdk_env.ps1`) configura las variables de entorno **solo para esa sesión de PowerShell**.
> Cada vez que abras PowerShell nuevo y quieras usar `emcc`, debes correr:
> ```powershell
> C:\emsdk\emsdk_env.ps1
> ```

**Verifica que funciona:**

```powershell
emcc --version
```

Debe mostrar algo como:
```
emcc (Emscripten gcc/clang-like replacement + linker) 3.x.x ...
```

---

## Parte 3 — Pasos siguientes del proyecto

Una vez que tengas `g++`, `cmake` y `emcc`, sigue este orden:

---

### Paso 1 — Build nativo (probar el C++ sin navegador)

```powershell
cd C:\Users\Josee\Downloads\ghrepos\Hanoi-Towers

cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
```

Ejecutar los unit tests:

```powershell
ctest --test-dir build --output-on-failure
```

Debes ver:

```
== Hanoi Core Tests ==

=== Disk ===
  [PASS] smaller <
  [PASS] larger  >
  ...
== Results: 20 passed, 0 failed ==
```

CLI interactivo (para jugar desde la terminal):

```powershell
.\build\Debug\hanoi_native.exe
```

---

### Paso 2 — Build WebAssembly

```powershell
# Activa Emscripten si no lo has hecho en esta sesión
C:\emsdk\emsdk_env.ps1

# Desde la raíz del proyecto
cd C:\Users\Josee\Downloads\ghrepos\Hanoi-Towers

emcmake cmake -B build-wasm
cmake --build build-wasm
```

Esto genera en `build-wasm/`:
- `hanoi.js` — módulo JS que carga el Wasm
- `hanoi.wasm` — binario compilado

---

### Paso 3 — Copiar el Wasm a la carpeta web

```powershell
copy build-wasm\hanoi.js   web\hanoi.js
copy build-wasm\hanoi.wasm web\hanoi.wasm
```

---

### Paso 4 — Servir y abrir la UI

```powershell
cd web
python -m http.server 8080
```

Abre en el navegador: **http://localhost:8080**

> [!NOTE]
> La UI ya funciona **sin Wasm** usando un fallback en JavaScript.
> Cuando copies los archivos del paso anterior, el badge de la cabecera cambiará a **"Wasm activo"** en lugar de **"Modo JS"**.

---

## Flujo completo de un vistazo

```
MSYS2  →  g++ + cmake disponibles en PowerShell
emsdk  →  emcc disponible en PowerShell

       ┌─────────────────────────────┐
       │   cmake -B build            │  ← build nativo
       │   cmake --build build       │
       │   ctest  (unit tests)       │
       └─────────────────────────────┘
                     ↓
       ┌─────────────────────────────┐
       │   emcmake cmake -B build-wasm  │  ← build Wasm
       │   cmake --build build-wasm     │
       └─────────────────────────────┘
                     ↓
       copy  →  web/hanoi.js + web/hanoi.wasm
                     ↓
       python -m http.server 8080  →  localhost:8080
```

---

## Referencia rápida

| Qué hacer | Comando |
|-----------|---------|
| Verificar herramienta | `herramienta --version` |
| Activar Emscripten | `C:\emsdk\emsdk_env.ps1` |
| Build nativo | `cmake -B build && cmake --build build` |
| Tests | `ctest --test-dir build --output-on-failure` |
| CLI interactivo | `.\build\Debug\hanoi_native.exe` |
| Build Wasm | `emcmake cmake -B build-wasm && cmake --build build-wasm` |
| Copiar Wasm | `copy build-wasm\hanoi.js web\ && copy build-wasm\hanoi.wasm web\` |
| Servir UI | `cd web && python -m http.server 8080` |
