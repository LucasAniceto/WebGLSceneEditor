# WebGL Scene Editor

A lightweight scene editor built with WebGL. This tool allows you to create and manage 3D scenes by spawning and manipulating models in real time.

🚀 Overview

![ezgif com-animated-gif-maker](https://github.com/user-attachments/assets/02dd59d5-156f-4d54-a462-3c43d0169184)

🌀 Features

    🧱 Spawn Objects: Load and add 3D models dynamically from the `models/` directory.
    ✋ Manipulate Objects: Individually translate, rotate, and scale any object in the scene.
    🎨 Texture Support: Assign individual textures to each object.
    💾 Save & Load Scenes: Export your scene as a `.json` file and load it later to continue editing.

🧪 Technologies Used

    JavaScript — Manages WebGL context and animation loop
    WebGL — Low-level graphics API to render to the browser canvas
    HTML + CSS — Simple, responsive layout to host the canvas


📂 Project Structure

    /WebGLSceneEditor
    │
    ├── models              # Where the .obj are
    ├── textures            # Texture file
    ├── index.html          # Main HTML file
    ├── style.css           # Basic styling for the page
    ├── main.js             # WebGL setup and animation loop 
    

🛠️ Getting Started

    Clone the repository: git clone https://github.com/LucasAniceto/WebGLSceneEditor
    Open index.html with a localhost (live-server on VScode)


🧠 How It Works
  
    When you spawn an object, the editor loads its model data from the `models/` directory.
    Each object in the scene can be moved, rotated, and scaled individually using UI controls.
    You can assign a unique texture to each object.
    The current scene can be exported as a `.json` file.
    You can import a saved `.json` scene to restore all objects, their transformations, and textures.

🧩 Known Issues / To Do

    📐 Responsive Design: Ensure consistent layout, scaling, and interaction across different screen sizes, resolutions, and monitor setups.
    🖱️ Object Selection via Mouse: Implement object picking to allow selecting individual objects in the scene with a mouse click.
    🌍 Environment Enhancements: Add a better ground plane and a customizable skybox or gradient background for a more immersive scene.
    🧠 Code Logic Improvements: Refactor and improve parts of the internal logic for better performance, maintainability, and clarity.
    
✨ Acknowledgments

This project was made for the Computer Graphics course at college

📜 License

MIT License. Feel free to fork, remix, and learn from it.



