
# Barn simulation

Click here for running example >> https://klandermans.github.io/barnsimulation/

## About this project

This project is a Three.js scene that simulates a barn with moving "cows" (represented as cubes) and rows of static ricbin blocks (blue cubes). The barn structure includes walls, a saddle roof, and interactive lighting effects. The cows move through the barn while avoiding collisions with each other and the ricbin blocks. A point light dynamically illuminates the entire scene, with shadows rendered to add depth and realism.

![image](https://github.com/user-attachments/assets/fe07e8f3-0ffe-4ec4-9d43-4cca2e7b57f3)


## Purpose

I created this project to inspire colleagues within Wageningen University & Research by showing how we can use simple 3D visualizations to make data or concepts more tangible, even in domains like agriculture and animal science.

I’m not a game developer — I built this using tools and resources that were quickly available to me. My goal was not perfection, but creativity and exploration. I hope it sparks ideas and invites others to build further on it, improve it, or use it in ways I haven’t thought of yet.

Let me know what you think, and feel free to fork and experiment!



## Features

- Interactive 3D scene rendered with Three.js.
- Dynamic movement of cow-like cubes that avoid collisions.
- Real-time lighting and shadow rendering for added depth.
- Transparent walls and saddle roof.
- Customizable floor, walls, and roof materials.
- Two rows of static blue blocks ("ricbin blocks") in the barn.

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
