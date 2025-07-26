import tkinter as tk
from tkinter import ttk, messagebox

class RoundedButton(tk.Canvas):
    def __init__(self, parent, text, command=None, width=150, height=50, radius=25, bg_color="#FFFFFF", text_color="black"):
        super().__init__(parent, width=width, height=height, bg=parent["bg"], highlightthickness=0, cursor="hand2")
        
        self.command = command
        self.radius = radius
        self.bg_color = bg_color

        self.create_rounded_rectangle(0, 0, width, height, radius, fill=bg_color, outline=bg_color)
        self.text_id = self.create_text(width // 2, height // 2, text=text, fill=text_color, font=("Arial", 12, "normal"))

        # Bind the command to the ButtonRelease event to avoid duplicate triggers.
        self.bind("<ButtonRelease-1>", self.on_click)
        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.on_leave)

    def create_rounded_rectangle(self, x1, y1, x2, y2, radius, **kwargs):
        # Draws rounded corners using arcs and rectangles.
        self.create_arc(x1, y1, x1 + radius * 2, y1 + radius * 2, start=90, extent=90, **kwargs)
        self.create_arc(x2 - radius * 2, y1, x2, y1 + radius * 2, start=0, extent=90, **kwargs)
        self.create_arc(x1, y2 - radius * 2, x1 + radius * 2, y2, start=180, extent=90, **kwargs)
        self.create_arc(x2 - radius * 2, y2 - radius * 2, x2, y2, start=270, extent=90, **kwargs)
        self.create_rectangle(x1 + radius, y1, x2 - radius, y2, **kwargs)
        self.create_rectangle(x1, y1 + radius, x2, y2 - radius, **kwargs)

    def on_click(self, event=None):
        if self.command:
            self.command()
        # Returning "break" stops further event propagation.
        return "break"

    def on_hover(self, event):
        self.config(cursor="hand2")

    def on_leave(self, event):
        self.config(cursor="")

class SettingsWindow(tk.Toplevel):
    def __init__(self, master, apply_callback, current_disks=3):
        """
        Configuration window to select the number of disks.
        
        :param master: Parent window.
        :param apply_callback: Function to apply the changes.
        :param current_disks: Current number of disks.
        """
        super().__init__(master)
        self.apply_callback = apply_callback
        self.current_disks = tk.IntVar(value=current_disks)
        self.configure(bg="#ffffff")  # White background
        self.title("Settings")
        self.geometry("300x200")
        self.resizable(False, False)

        # Center the window
        self.center_window(300, 200)

        # Label with white background
        tk.Label(self, text="Select number of disks:", font=("Arial", 12), bg="#ffffff").pack(pady=10)

        # Spinbox to select the number of disks (allowing values from 3 to 8)
        self.disk_selector = ttk.Spinbox(self, from_=3, to=8, textvariable=self.current_disks, width=5, font=("Arial", 12))
        self.disk_selector.pack(pady=10)

        # Rounded button using the RoundedButton class with pastel red color (#FF6961)
        rounded_btn = RoundedButton(self, text="Apply", command=self.apply_settings,
                                    width=100, height=40, radius=20,
                                    bg_color="#FF6961", text_color="white")
        rounded_btn.pack(pady=20)

    def apply_settings(self):
        
        """Validates and applies the settings, or shows an error message if validation fails."""
        try:
            value = int(self.disk_selector.get())
        except ValueError:
            messagebox.showerror("Error", "Please enter a valid number.", parent=self)
            return
        
        if value < 3 or value > 8:
            messagebox.showerror("Error", "Only numbers from 3 to 8 are allowed.", parent=self)
            return
        
        self.apply_callback(value)
        self.destroy()

    def center_window(self, width, height):
        """Centers the window on the screen."""
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        x = (screen_width // 2) - (width // 2)
        y = (screen_height // 2) - (height // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")
