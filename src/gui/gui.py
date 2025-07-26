import tkinter as tk
from tkinter import messagebox
from stack_hanoi import Stack

# Clase para botones redondeados
class RoundedButton(tk.Canvas):
    def __init__(self, parent, text, command=None, width=150, height=50, radius=25, bg_color="#FFFFFF", text_color="black"):
        super().__init__(parent, width=width, height=height, bg=parent["bg"], highlightthickness=0, cursor="hand2")
        self.command = command
        self.radius = radius
        self.bg_color = bg_color
        
        # Dibuja el rectángulo redondeado
        self.create_rounded_rectangle(0, 0, width, height, radius, fill=bg_color, outline=bg_color)
        
        # Texto con fuente pequeña
        self.text_id = self.create_text(
            width // 2, 
            height // 2, 
            text=text, 
            fill=text_color, 
            font=("Arial", 8, "normal")
        )
        
        # Vincula eventos
        self.bind("<ButtonRelease-1>", self.on_click)
        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.on_leave)

    def create_rounded_rectangle(self, x1, y1, x2, y2, radius, **kwargs):
        self.create_arc(x1, y1, x1 + radius * 2, y1 + radius * 2, start=90, extent=90, **kwargs)
        self.create_arc(x2 - radius * 2, y1, x2, y1 + radius * 2, start=0, extent=90, **kwargs)
        self.create_arc(x1, y2 - radius * 2, x1 + radius * 2, y2, start=180, extent=90, **kwargs)
        self.create_arc(x2 - radius * 2, y2 - radius * 2, x2, y2, start=270, extent=90, **kwargs)
        self.create_rectangle(x1 + radius, y1, x2 - radius, y2, **kwargs)
        self.create_rectangle(x1, y1 + radius, x2, y2 - radius, **kwargs)

    def on_click(self, event=None):
        if self.command:
            self.command()
        return "break"

    def on_hover(self, event):
        self.config(cursor="hand2")

    def on_leave(self, event):
        self.config(cursor="")

# Clase principal de la GUI
class GUI:
    def __init__(self, root, num_disks=3, return_to_menu_callback=None):
        self.root = root
        self.root.title("Hanoi's Towers")
        
        # Fijamos tamaño de la ventana: 600x400
        self.root.geometry("600x400")
        self.root.resizable(False, False)
        
        # Fondo general azul muy clarito
        self.root.configure(bg="#F0F8FF")
        
        self.return_to_menu_callback = return_to_menu_callback
        self.num_disks = num_disks
        
        self.stacks = [Stack("Left"), Stack("Middle"), Stack("Right")]
        self.selected_disk = None
        self.origin_stack = None
        self.num_moves = 0
        self.offset_x = 0
        self.offset_y = 0

        # ----------------- Sección superior (Canvas y Frame de botones) -----------------
        # Canvas para dibujar el juego, altura 350
        self.canvas = tk.Canvas(
            self.root, 
            width=600, 
            height=350, 
            bg="#F0F8FF", 
            highlightthickness=0
        )
        self.canvas.pack(side=tk.TOP)

        # Frame para los botones (arriba a la izquierda) con fondo azul muy clarito
        button_frame = tk.Frame(self.root, bg="#F0F8FF")
        button_frame.place(x=10, y=10)

        # Botón "Back" redondeado (50x20, radio 10), color pastel rojo
        self.back_button = RoundedButton(
            button_frame,
            text="Back",
            command=self.back_to_menu,
            width=50,
            height=20,
            radius=10,
            bg_color="#FF6961",
            text_color="white"
        )
        self.back_button.pack(side=tk.LEFT, padx=5)

        # Botón "Reset" redondeado (50x20, radio 10), color pastel rojo
        self.reset_button = RoundedButton(
            button_frame,
            text="Reset",
            command=self.reset_game,
            width=50,
            height=20,
            radius=10,
            bg_color="#FF6961",
            text_color="white"
        )
        self.reset_button.pack(side=tk.LEFT, padx=5)

        # ----------------- Sección inferior (barra café) -----------------
        # Frame inferior que ocupará todo el ancho y tendrá 50 px de alto
        self.bottom_frame = tk.Frame(self.root, bg="#DEB887", width=600, height=50)
        self.bottom_frame.pack(side=tk.BOTTOM, fill=tk.X)
        # Evitamos que el frame se ajuste a su contenido
        self.bottom_frame.pack_propagate(False)

        # Etiqueta "Moves: 0" centrada dentro del frame inferior
        self.moves_label = tk.Label(
            self.bottom_frame, 
            text="Moves: 0", 
            font=("Arial", 12, "bold"), 
            bg="#DEB887"
        )
        self.moves_label.pack(expand=True)

        self.reset_game()

    def back_to_menu(self):
        """Regresa al menú principal."""
        if self.return_to_menu_callback:
            self.root.destroy()
            self.return_to_menu_callback()

    def reset_game(self):
        """Reinicia el juego y redibuja la interfaz."""
        self.stacks = [Stack("Left"), Stack("Middle"), Stack("Right")]
        for i in range(self.num_disks, 0, -1):
            self.stacks[0].push(i)
        self.num_moves = 0
        self.selected_disk = None
        self.origin_stack = None
        self.moves_label.config(text="Moves: 0")
        self.draw_game()

    def draw_game(self):
        """Dibuja las torres y los discos."""
        self.canvas.delete("all")

        # Torres con color madera oscuro (10% más oscuro que #DEB887)
        for i in range(3):
            x = 100 + i * 200
            self.canvas.create_rectangle(x - 5, 150, x + 5, 350, fill="#C8A67A")

        # Dibujar discos en colores pastel suaves
        for stack_index, stack in enumerate(self.stacks):
            x = 100 + stack_index * 200
            y = 350
            for disk in stack.get_all_items():
                width = 20 * disk
                color = self.get_disk_color(disk)
                self.canvas.create_rectangle(
                    x - width // 2, y - 20, x + width // 2, y,
                    fill=color, outline="black", tags=f"disk_{disk}"
                )
                y -= 20

        # Actualiza el contador de movimientos
        self.moves_label.config(text=f"Moves: {self.num_moves}")

        # Asocia eventos para arrastrar y soltar discos
        for disk in range(1, self.num_disks + 1):
            self.canvas.tag_bind(f"disk_{disk}", "<Button-1>", self.start_drag)
            self.canvas.tag_bind(f"disk_{disk}", "<B1-Motion>", self.during_drag)
            self.canvas.tag_bind(f"disk_{disk}", "<ButtonRelease-1>", self.stop_drag)

    def get_disk_color(self, disk):
        """Devuelve un color pastel suave para el disco según su tamaño."""
        pastel_colors = [
            "#FFB3B3",  # Pastel rojo
            "#B3FFB3",  # Pastel verde
            "#B3E5FF",  # Pastel azul
            "#FFFFB3",  # Pastel amarillo
            "#FFDAB9",  # Pastel naranja (durazno)
            "#E6B3FF",  # Pastel lila
            "#FFC0CB",  # Pastel rosa
            "#B3FFFF"   # Pastel cian
        ]
        return pastel_colors[(disk - 1) % len(pastel_colors)]

    def start_drag(self, event):
        """Inicia el arrastre de un disco."""
        x, y = event.x, event.y
        for stack_idx, stack in enumerate(self.stacks):
            if stack.get_size() > 0:
                top_disk = stack.get_all_items()[-1]
                disk_coords = self.canvas.coords(f"disk_{top_disk}")
                if disk_coords:
                    x1, y1, x2, y2 = disk_coords
                    if x1 <= x <= x2 and y1 <= y <= y2:
                        self.selected_disk = top_disk
                        self.origin_stack = stack_idx
                        self.offset_x = x - x1
                        self.offset_y = y - y1
                        return

    def during_drag(self, event):
        """Mueve el disco mientras se arrastra."""
        if self.selected_disk:
            width = 20 * self.selected_disk
            new_x1 = event.x - self.offset_x
            new_x2 = new_x1 + width
            self.canvas.coords(
                f"disk_{self.selected_disk}",
                new_x1, event.y - 10, new_x2, event.y + 10
            )

    def stop_drag(self, event):
        """Finaliza el arrastre y suelta el disco si el movimiento es válido."""
        if not self.selected_disk:
            return
        x = event.x
        for stack_idx in range(3):
            stack_center = 100 + stack_idx * 200
            # Determinamos si el cursor está dentro de +/-50 px del poste
            if stack_center - 50 <= x <= stack_center + 50:
                if self.is_valid_move(self.origin_stack, stack_idx):
                    self.move_disk(self.origin_stack, stack_idx)
                else:
                    self.draw_game()
                self.selected_disk = None
                return
        self.draw_game()
        self.selected_disk = None

    def is_valid_move(self, origin_idx, dest_idx):
        """Verifica si el movimiento es válido."""
        if origin_idx == dest_idx:
            return False
        origin_stack = self.stacks[origin_idx]
        dest_stack = self.stacks[dest_idx]
        if origin_stack.get_size() == 0:
            return False
        moving_disk = origin_stack.get_all_items()[-1]
        if dest_stack.get_size() == 0:
            return True
        dest_top_disk = dest_stack.get_all_items()[-1]
        return moving_disk < dest_top_disk

    def move_disk(self, origin_idx, dest_idx):
        """Mueve un disco y actualiza la interfaz."""
        disk = self.stacks[origin_idx].pop()
        self.stacks[dest_idx].push(disk)
        self.num_moves += 1
        self.draw_game()
        if self.check_win():
            messagebox.showinfo("You Won!", f"Completed the game in {self.num_moves} moves!")

    def check_win(self):
        """Comprueba si se ha ganado el juego."""
        return self.stacks[2].get_size() == self.num_disks
