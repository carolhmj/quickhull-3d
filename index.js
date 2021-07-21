import { CONSTS } from './consts.js';
import {Quickhull3D} from './Quickhull3D.js'

function showWorldAxis(size, scene) {
    var makeTextPlane = function(text, color, size) {
        var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
        dynamicTexture.hasAlpha = true;
        dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
        var plane = BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
        plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
        plane.material.backFaceCulling = false;
        plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
        plane.material.diffuseTexture = dynamicTexture;
    return plane;
     };
    var axisX = BABYLON.Mesh.CreateLines("axisX", [ 
      BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
      new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
      ], scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    var xChar = makeTextPlane("X", "red", size / 10);
    xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
    var axisY = BABYLON.Mesh.CreateLines("axisY", [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0), 
        new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
        ], scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    var yChar = makeTextPlane("Y", "green", size / 10);
    yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
    var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
        new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
        ], scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    var zChar = makeTextPlane("Z", "blue", size / 10);
    zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
};

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
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, -1, 0), scene);
    var light2 = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;
    light2.intensity = 0.4;

    return scene;
}

// https://playground.babylonjs.com/#X7U2LD#1 reference of how to update the faces data in real time
function constructHull(inputPoints) {
    const hull = new Quickhull3D();
    hull.build(inputPoints);
    
    return hull;
}


function main() {
    let showDebug = false;
    
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true);
    
    const scene = createScene(engine, canvas); //Call the createScene function
    showWorldAxis(1,scene);

    // Each entry is a group of points that represents a separate group on the input
    // let inputGroups = [BABYLON.MeshBuilder.CreateBox("test-box", {size: 1}, scene)];
    let inputGroups = [];
    let testGroup = [
        new BABYLON.Vector3(1,1,1),
        new BABYLON.Vector3(1,1,-1),
        new BABYLON.Vector3(-1,1,-1),
        new BABYLON.Vector3(-1,1,1),
        new BABYLON.Vector3(1,-1,1),
        new BABYLON.Vector3(1,-1,-1),
        new BABYLON.Vector3(-1,-1,-1),
        new BABYLON.Vector3(-1,-1,1),
    ];
    // let testGroup = [    
    //     new BABYLON.Vector3(0,1,0),
    //     new BABYLON.Vector3(2,0,0),
    //     new BABYLON.Vector3(-1,0,0),
    //     new BABYLON.Vector3(0,0,0.5),
    //     new BABYLON.Vector3(0,0,1),
    //     new BABYLON.Vector3(-0.5,0,0),
    //     new BABYLON.Vector3(1,0,0),
    //     new BABYLON.Vector3(0,0.5,0),
    //     new BABYLON.Vector3(1,0,1),
    // ];
    inputGroups.push(testGroup);
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
    // const hull = new BABYLON.Mesh("convex-hull");

    const runQuickhullButton = document.getElementById("runQuickhull");
    runQuickhullButton.addEventListener("click", function() {
        outputHullConstructions = inputGroups.map(inputGroup => constructHull(inputGroup));
        outputHullConstructions.forEach(hull => hull.buildRenderableMesh(scene));
        console.log('Hull construction done');
    });

    const showQuickhullButton = document.getElementById("showQuickhull");
    showQuickhullButton.addEventListener("click", function() {
        outputHullConstructions.forEach(hull => hull.constructionAnimation.start(false, CONSTS.ANIM_SPEED));
    });
}

main();