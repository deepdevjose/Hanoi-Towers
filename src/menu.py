import tkinter as tk
from tkinter import messagebox
from gui import GUI
from settings import SettingsWindow

class RoundedButton(tk.Canvas):
    def __init__(self, parent, text, command=None, width=150, height=50, radius=25, bg_color="#FFFFFF", text_color="black"):
        super().__init__(parent, width=width, height=height, bg=parent["bg"], highlightthickness=0, cursor="hand2")
        
        self.command = command
        self.radius = radius
        self.bg_color = bg_color

        # Botón redondeado
        self.create_rounded_rectangle(0, 0, width, height, radius, fill=bg_color, outline=bg_color)
        self.text_id = self.create_text(
            width // 2,
            height // 2,
            text=text,
            fill=text_color,
            font=("Arial", 12, "normal")
        )

        # Eventos
        self.bind("<Button-1>", self.on_click)
        self.tag_bind(self.text_id, "<Button-1>", self.on_click)
        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.on_leave)

    def create_rounded_rectangle(self, x1, y1, x2, y2, radius, **kwargs):
        self.create_arc(x1, y1, x1 + radius*2, y1 + radius*2, start=90, extent=90, **kwargs)
        self.create_arc(x2 - radius*2, y1, x2, y1 + radius*2, start=0, extent=90, **kwargs)
        self.create_arc(x1, y2 - radius*2, x1 + radius*2, y2, start=180, extent=90, **kwargs)
        self.create_arc(x2 - radius*2, y2 - radius*2, x2, y2, start=270, extent=90, **kwargs)
        self.create_rectangle(x1 + radius, y1, x2 - radius, y2, **kwargs)
        self.create_rectangle(x1, y1 + radius, x2, y2 - radius, **kwargs)

    def on_click(self, event=None):
        if self.command:
            self.command()

    def on_hover(self, event):
        self.config(cursor="hand2")

    def on_leave(self, event):
        self.config(cursor="")

class MainMenu(tk.Frame):
    def __init__(self, master, start_game_callback, exit_callback, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.start_game_callback = start_game_callback
        self.exit_callback = exit_callback
        self.num_disks = 3  # Número de discos por defecto
        
        # Fondo azul cielo clarito en todo el Frame del menú
        self.configure(bg="#F0F8FF")
        self.pack(expand=True, fill='both')

        # Frame contenedor con el mismo color de fondo
        container = tk.Frame(self, bg="#F0F8FF")
        container.pack(expand=True)

        # Frame para el título con fondo azul claro
        title_frame = tk.Frame(container, bg="#F0F8FF")
        title_frame.pack(pady=20)

        # Letras del título, cada una con su color de letra, pero fondo azul claro
        tk.Label(title_frame, text="H", font=("Arial", 35, "bold"), fg="#FFB3E6", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="a", font=("Arial", 35, "bold"), fg="#D1B3FF", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="n", font=("Arial", 35, "bold"), fg="#A7C7E7", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="o", font=("Arial", 35, "bold"), fg="#A8E6CF", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="i", font=("Arial", 35, "bold"), fg="#fff333", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="'s", font=("Arial", 35, "bold"), fg="#FFABAB", bg="#F0F8FF").pack(side=tk.LEFT)

        tk.Label(title_frame, text=" ", font=("Arial", 35, "bold"), bg="#F0F8FF").pack(side=tk.LEFT)

        tk.Label(title_frame, text="T", font=("Arial", 35, "bold"), fg="#A8E6CF", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="o", font=("Arial", 35, "bold"), fg="#FFB3E6", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="w", font=("Arial", 35, "bold"), fg="#D1B3FF", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="e", font=("Arial", 35, "bold"), fg="#A7C7E7", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="r", font=("Arial", 35, "bold"), fg="#fff333", bg="#F0F8FF").pack(side=tk.LEFT)
        tk.Label(title_frame, text="s", font=("Arial", 35, "bold"), fg="#FFABAB", bg="#F0F8FF").pack(side=tk.LEFT)

        # Botón "New Game" con fondo azul claro
        self.new_game_button = RoundedButton(
            container,
            text="New Game",
            command=lambda: self.start_game_callback(self.num_disks),
            bg_color="#F0F8FF"
        )
        self.new_game_button.pack(pady=15)

        # Frame para otros botones, también con fondo azul claro
        buttons_frame = tk.Frame(container, bg="#F0F8FF")
        buttons_frame.pack(pady=10)

        # Botón "Settings"
        self.settings_button = RoundedButton(
            buttons_frame,
            text="Settings",
            command=self.open_settings,
            bg_color="#F0F8FF"
        )
        self.settings_button.pack(side=tk.LEFT, padx=10)

        # Botón "Rules"
        self.tutorial_button = RoundedButton(
            buttons_frame,
            text="Rules",
            command=self.show_tutorial,
            bg_color="#F0F8FF"
        )
        self.tutorial_button.pack(side=tk.LEFT, padx=10)

        # Botón "Exit" con color pastel rojo
        self.exit_button = RoundedButton(
            buttons_frame,
            text="Exit",
            command=self.exit_callback,
            bg_color="#FF6961"
        )
        self.exit_button.pack(side=tk.LEFT, padx=10)

    def open_settings(self):
        """Open the settings window to change the number of disks."""
        SettingsWindow(self, self.update_disks, self.num_disks)

    def update_disks(self, new_value):
        """Update the number of disks from settings."""
        self.num_disks = new_value

    def show_tutorial(self):
        tutorial_text = (
            "The Tower of Hanoi is a mathematical game or puzzle.\n\n"
            "Rules:\n"
            "1. Only one disk can be moved at a time.\n"
            "2. Each move consists of taking the upper disk from one of the stacks and placing it on top of another stack.\n"
            "3. No disk may be placed on top of a smaller disk.\n\n"
            "Try to move the entire stack to another rod, obeying the above rules!"
        )
        messagebox.showinfo("Tutorial", tutorial_text)


class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Hanoi's Towers")
        self.root.geometry("600x400")
        self.center_window(self.root, 600, 400)
        # También se establece el fondo de la ventana principal a azul claro
        self.root.configure(bg="#F0F8FF")

        self.num_disks = 3  # Default number of disks
        self.game_window = None  # Store the game window to prevent duplicates

        self.show_main_menu()

    def show_main_menu(self):
        """Display and enable the main menu."""
        if self.game_window:
            self.game_window.destroy()  # Close any open game window

        self.root.attributes("-disabled", False)
        self.root.deiconify()

        # Clear existing content
        for widget in self.root.winfo_children():
            widget.destroy()

        self.main_menu = MainMenu(self.root, self.start_game, self.exit_game)

    def start_game(self, num_disks=None):
        """Start the game in a new window without closing the menu."""
        if num_disks is not None:
            self.num_disks = num_disks

        self.root.attributes("-disabled", True)  # Disable main window

        # Avoid creating multiple game windows
        if self.game_window is not None and tk.Toplevel.winfo_exists(self.game_window):
            return

        self.game_window = tk.Toplevel(self.root)
        self.game_window.title("Hanoi's Towers")
        self.game_window.geometry("600x400")
        self.center_window(self.game_window, 600, 400)
        self.game_window.resizable(False, False)

        # Ensure proper closure of the game window
        self.game_window.protocol("WM_DELETE_WINDOW", self.close_game)

        # Aquí se crea la GUI del juego
        self.game_gui = GUI(self.game_window, num_disks=self.num_disks, return_to_menu_callback=self.close_game)

    def close_game(self):
        """Close the game window and re-enable the main menu."""
        if self.game_window is not None:
            self.game_window.destroy()
            self.game_window = None
        self.show_main_menu()

    def exit_game(self):
        """Exit the application."""
        self.root.quit()
    
    def center_window(self, window, width, height):
        """Center the window on the screen."""
        screen_width = window.winfo_screenwidth()
        screen_height = window.winfo_screenheight()
        x = (screen_width // 2) - (width // 2)
        y = (screen_height // 2) - (height // 2)
        window.geometry(f"{width}x{height}+{x}+{y}")

