import { CONSTS } from './consts.js';
import {Quickhull3D} from './Quickhull3D.js'
import {FaceTypes} from './Face.js';

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
    var camera = new BABYLON.ArcRotateCamera(
        "camera1", 
        Math.PI/6, 
        Math.PI/4, 
        60, 
        new BABYLON.Vector3(0,0,0), 
        scene
    );

    // This targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, -1, 0), scene);
    var light2 = new BABYLON.HemisphericLight("light2", new BABYLON.Vector3(0, 1, 0), scene);
    var light3 = new BABYLON.DirectionalLight("light3", new BABYLON.Vector3(-1, -1, -1), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;
    light2.intensity = 0.4;
    light3.intensity = 0.8;

    return scene;
}

// https://playground.babylonjs.com/#X7U2LD#1 reference of how to update the faces data in real time
function constructHull(inputPoints) {
    const hull = new Quickhull3D();
    hull.build(inputPoints);
    
    return hull;
}


async function main() {
    let showDebug = false;
    
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true);
    
    const scene = createScene(engine, canvas); //Call the createScene function
    showWorldAxis(1,scene);

    // Each entry is a group of points that represents a separate group on the input
    // let inputGroups = [BABYLON.MeshBuilder.CreateBox("test-box", {size: 1}, scene)];
    let inputGroups = [];
    /*let testGroup = [
        new BABYLON.Vector3(1,1,1),
        new BABYLON.Vector3(1,1,-1),
        new BABYLON.Vector3(-1,1,-1),
        new BABYLON.Vector3(-1,1,1),
        new BABYLON.Vector3(1,-1,1),
        new BABYLON.Vector3(1,-1,-1),
        new BABYLON.Vector3(-1,-1,-1),
        new BABYLON.Vector3(-1,-1,1),
    //    new BABYLON.Vector3(0,2,0)
    ];*/
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
    /*let testGroup = [
        new BABYLON.Vector3(-0.2,-0.39,0.69),
        new BABYLON.Vector3(0.68, 0.21, -0.56),
        new BABYLON.Vector3(0.11, 0.006, -0.84),
        new BABYLON.Vector3(0.94, 0.89, -0.76),
        new BABYLON.Vector3(-0.59, 0.44, -0.25),
        new BABYLON.Vector3(0.96, 0.95, -0.55),
        new BABYLON.Vector3(-0.15, 0.73, 0.68),
    ];*/
    /*let testGroup = [
        new BABYLON.Vector3(0,0,0),
        new BABYLON.Vector3(0,2,0),
        new BABYLON.Vector3(2,0,0),
        new BABYLON.Vector3(0,0,2),
        new BABYLON.Vector3(1,2,0),
        new BABYLON.Vector3(-1,2,0),
        //new BABYLON.Vector3(),
    ]*/
    /*let testGroup = [
        new BABYLON.Vector3(0.81,-0.94,1),
        new BABYLON.Vector3(0.47, -0.70, 1),
        new BABYLON.Vector3(0.48, 0.54, 1),
        new BABYLON.Vector3(0.69, -0.68, 1),
        new BABYLON.Vector3(-0.25, -0.11, -1),
        new BABYLON.Vector3(0.27, 0.54, -1),
        new BABYLON.Vector3(0.20, -0.13, -1),
        new BABYLON.Vector3(1, 0.46, -0.80),
        new BABYLON.Vector3(1, 0.75, 0.61),
        new BABYLON.Vector3(-1, -0.29, 0.43),
        new BABYLON.Vector3(-1, 0.37, 0.027),
        new BABYLON.Vector3(-0.97, 1, 0.54),
        new BABYLON.Vector3(0.27, 1, 0.05),
        new BABYLON.Vector3(0.71, -1, -0.49),
        new BABYLON.Vector3(0.85, -1, 0.90),
    ];*/
    let v = (x,y,z) => new BABYLON.Vector3(x,y,z);
    /*let testGroup = [
        v(0.89, -0.99, 1),
        v(0.1, 0.76, 1),
        v(-0.6, -0.12, -1),
        v(0.84, 0.68, -1),
        v(1, 0.91, -0.14),
        v(-1, -0.29, -0.05),
        v(-1, 0.41, -0.66),
        v(-0.43, 1, 0.4),
        v(-0.86, 1, 0.89),
        v(-0.33, -0.98, 0.99),
        v(0.31, 0.74, 0.55),
        v(0.67, 0.69, -0.84),
        v(0.2, -0.11, 0.87),
        v(0.92, 0.77, -0.99),
    ];*/
    /*let testGroup = [
        v(5.37, -4.46, -13.9),
        v(-9.34, 3.84, 12.64),
        v(4.76, 4.67, 11.08),
        v(-7.15, 12.81, 4.01),
        v(-13.59, -0.51, 7.72),
        v(0.3, -0.65, -13.34),
        v(-1.49, -13.21, -7.75),
    ];*/
    //inputGroups.push(testGroup);
    let testGroup = [];

    let tot = 5;
    for (let i = 1; i < tot+1; i++) {
        testGroup.push( new BABYLON.Vector3(Math.sin(2*Math.PI*(i/tot))*5, 10, Math.cos(2*Math.PI*(i/tot))*5) );
        testGroup.push( new BABYLON.Vector3(Math.sin(2*Math.PI*(i/tot))*5, -10, Math.cos(2*Math.PI*(i/tot))*5) );
    }
    
    let npts = testGroup.length;
    //let npts = 7;
    //let nsurf = 5;
    let nsurf = 0;
    let pcs = new BABYLON.PointsCloudSystem("pcs", 5, scene);
    //let baseShape = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 1});
    let baseShape = BABYLON.MeshBuilder.CreateBox("box", {size: 30});
    //pcs.addSurfacePoints(baseShape, nsurf, BABYLON.PointColor.Random);
    //pcs.addVolumePoints(baseShape, npts-nsurf, BABYLON.PointColor.STATED, new BABYLON.Color3(0.8,0.8,0.8));
    pcs.addPoints(npts, (p, i, s) => {
        p.position = testGroup[i];
        p.color = new BABYLON.Color4(Math.random(), Math.random(), Math.random(), 1);
    });
    await pcs.buildMeshAsync();
    baseShape.dispose();

    inputGroups.push(pcs.particles.map(p => p.position));

    console.log('inputGroups', inputGroups);

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
        canvas.addEventListener("click", () => {
            const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
            if (pickInfo.hit) {
                const faceId = pickInfo.faceId;
                if (faceId >= 0) {
                    const outhull = outputHullConstructions[0];
                    const face = outhull.faces[faceId];
                    const neighbors = [];
                    for (let e of face.halfEdges) {
                        if (e.twin.face.mark === FaceTypes.VISIBLE) {
                            neighbors.push(e.twin.face.id);
                        } else {
                            console.error(`Face ${f.id} has an edge ${e.id} whose twin face ${e.oppositeFace().id} is not visible!`);
                        }
                    }
                    console.log(`Face ${face.id} has neighbors: ${neighbors[0]}, ${neighbors[1]}, ${neighbors[2]}`);
                } else {
                    console.error("No faceID?");
                }
            }
        });
    });

    const showQuickhullButton = document.getElementById("showQuickhull");
    showQuickhullButton.addEventListener("click", function() {
        outputHullConstructions.forEach(hull => hull.constructionAnimation.start(false, CONSTS.ANIM_SPEED));
    });
}

main().then(() => {});