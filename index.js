function createScene(engine, canvas) {
    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new BABYLON.ArcRotateCamera("camera1", Math.PI/6, Math.PI/4, 5, new BABYLON.Vector3(0,0,0), scene);

    // This targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;

    return scene;
}

// https://playground.babylonjs.com/#X7U2LD#1 reference of how to update the faces data in real time
function constructHull(inputPoints) {
    console.log('got vertices', inputPoints);

    // Construct initial hull


    // Returns the sequence of constructed hulls (index facets)
}

function main() {
    let showDebug = false;
    
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true);
    
    const scene = createScene(engine, canvas); //Call the createScene function

    // Each entry is a group of points that represents a separate group on the input
    let inputGroups = [BABYLON.MeshBuilder.CreateBox("test-box", {size: 1}, scene)];
    // Each entry is an animation representing the construction of a convex hull
    let outputHullConstructions = [];
    
    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });

    const debugButton = document.getElementById("debugButton");
    debugButton.addEventListener("click", function() {
        showDebug = !showDebug;
        if (showDebug) {
            scene.debugLayer.show();
        } else {
            scene.debugLayer.hide();
        }
    });

    // This mesh will be used to display the hull being constructed
    const hull = new BABYLON.Mesh("convex-hull");

    const runQuickhullButton = document.getElementById("runQuickhull");
    runQuickhullButton.addEventListener("click", function() {
        outputHullConstructions = inputGroups.map(inputGroup => constructHull(inputGroup.getVerticesData(BABYLON.VertexBuffer.PositionKind)));
    });
}

main();