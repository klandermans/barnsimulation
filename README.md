
# Moving Cows and Ricbin Blocks in a Barn

This project is a Three.js scene that simulates a barn with moving "cows" (cubes) and rows of static "ricbin blocks" (blue cubes). The barn structure includes walls, a saddle roof, and interactive lighting effects. The cows avoid collisions with each other and the ricbin blocks, and the entire scene is illuminated by a point light. Shadows are rendered dynamically to add depth and realism.

## Features

- Interactive 3D scene rendered with Three.js.
- Dynamic movement of cow-like cubes that avoid collisions.
- Real-time lighting and shadow rendering for added depth.
- Transparent walls and saddle roof.
- Customizable floor, walls, and roof materials.
- Two rows of static blue blocks ("ricbin blocks") in the barn.

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- A modern browser that supports WebGL (such as Chrome, Firefox, or Edge).
- No additional software is required; simply run the HTML file in a browser.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/moving-cows-barn.git
   ```

2. Open the `index.html` file in your browser.

Alternatively, you can serve it using a local server with:
   ```bash
   python -m http.server
   ```

Then, open `http://localhost:8000` in your browser.

## Usage

Once the project is running, you'll see a barn with moving "cows" and blue blocks. You can interact with the scene by using the following controls:

- **Mouse Controls**: Use the mouse to rotate and zoom in/out on the scene.
- **Lighting**: The scene includes point lights above the barn, which dynamically render shadows on the floor and other objects.

You can customize the scene by editing the number of cows, their speed, or by adding new objects in the `script` section of the `index.html` file.

## Code Overview

### Main Components

- **Cows (Cubes)**: Represented as cubes that randomly move around the barn, while avoiding collisions with other cubes and blocks.
- **Ricbin Blocks**: Static blue cubes placed inside the barn as obstacles.
- **Saddle Roof**: The barn has a saddle-shaped roof built from two plane geometries.
- **Lighting**: The scene is illuminated by point lights above the barn, which cast dynamic shadows to add depth.

### Technologies

- **[Three.js](https://threejs.org/)**: A JavaScript library for creating 3D graphics in the browser.
- **[OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls)**: Provides mouse-based controls for orbiting and zooming in the scene.

### File Structure

```
├── index.html     # Main HTML file with Three.js scene
└── README.md      # Project README file
```

## Customization

You can modify the following parameters in the `index.html` file:

- **Cow movement speed**: Change the `cubeSpeed` variable to control the speed of the cubes.
- **Number of cows**: Adjust the number of cubes by modifying the loop that generates them.
- **Lighting**: Add more lights or change the color/intensity of the existing lights.

Feel free to experiment with other Three.js features and customize the scene as you like!

## License

This project is licensed under the MIT License. See `LICENSE` for details.

## Contact

For any questions or suggestions, feel free to contact me at [your-email@example.com].
