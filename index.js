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
    light3.intensity = 0.6;

    return scene;
}

// https://playground.babylonjs.com/#X7U2LD#1 reference of how to update the faces data in real time
function constructHull(inputPoints) {
    const hull = new Quickhull3D();
    hull.build(inputPoints);
    
    return hull;
}

function rndOneMinusOne() {
    return Math.random() * 2 - 1;
}

function pointsToPcs(testGroup, renderPos, renderRot, singleCol, struct) {
    let visPcs = new BABYLON.PointsCloudSystem("pcs-cyl", 2);
    visPcs.addPoints(testGroup.length, (p, i, s) => {
        p.position = testGroup[i];
        p.color = singleCol;
    });
    visPcs.buildMeshAsync().then((mesh) => {
        mesh.position = renderPos;
        mesh.rotation = renderRot;
        struct.pointsMesh = mesh;
    });
}

function makeCylinderGroup(nSubdiv, height, radius, renderPos, renderRot, singleCol) {
    let testGroup = [];

    let tot = nSubdiv;
    for (let i = 1; i < tot+1; i++) {
        testGroup.push( new BABYLON.Vector3(Math.sin(2*Math.PI*(i/tot))*radius, height/2, Math.cos(2*Math.PI*(i/tot))*radius) );
        testGroup.push( new BABYLON.Vector3(Math.sin(2*Math.PI*(i/tot))*radius, -height/2, Math.cos(2*Math.PI*(i/tot))*radius) );
    }

    // Add some percentage of random points inside
    let rndInside = testGroup.length * Math.random();
    for (let i = 0; i < rndInside; i++) {
        let a = 2*Math.PI * Math.random();
        let r = radius * Math.random();

        let x = Math.sin(a)*r;
        let y = rndOneMinusOne() * height/2; 
        let z = Math.cos(a)*r;

        testGroup.push(new BABYLON.Vector3(x,y,z));
    }

    let struct = {
        points: testGroup,
        renderPos,
        renderRot,
        singleCol
    }

    pointsToPcs(testGroup, renderPos, renderRot, singleCol, struct);

    return struct;
}

function makeBoxGroup(npts, width, height, depth, renderPos, renderRot, singleCol) {
    let testGroup = [];

    for (let i = 0; i < npts; i++) {
        testGroup.push(new BABYLON.Vector3(width*i/npts-width*0.5, -height*0.5, -depth*0.5));
        testGroup.push(new BABYLON.Vector3(width*i/npts-width*0.5, height*0.5, -depth*0.5));
        testGroup.push(new BABYLON.Vector3(width*i/npts-width*0.5, height*0.5, depth*0.5));
        testGroup.push(new BABYLON.Vector3(width*i/npts-width*0.5, -height*0.5, depth*0.5));
    }

    for (let i = 0; i < npts; i++) {    
        testGroup.push(new BABYLON.Vector3(rndOneMinusOne()*width/4, rndOneMinusOne()*height/4, rndOneMinusOne()*depth/4));
    }

    let struct = {
        points: testGroup,
        renderPos,
        renderRot,
        singleCol
    }

    pointsToPcs(testGroup, renderPos, renderRot, singleCol, struct);
    
    return struct;
}

function makeSphereGroup(nPts, radius, renderPos, singleCol) {
    let testGroup = [];

    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < nPts; i++) {
        const y = 1 - (i / (nPts-1)) * 2;
        const inRadius = Math.sqrt(1 - y*y);
        
        const theta = phi * i;
        const x = Math.cos(theta)*inRadius;
        const z = Math.sin(theta)*inRadius;
        
        testGroup.push(new BABYLON.Vector3(x,y,z).scale(radius));
    }

    let struct = {
        points: testGroup,
        renderPos,
        renderRot: new BABYLON.Vector3(0,0,0),
        singleCol
    }

    pointsToPcs(testGroup, renderPos, struct.renderRot, singleCol, struct);

    return struct;
}

function buildThemeGroups() {
    const groups = [];
    
    const sph_sub = 80;
    const cyl_sub = 20;
    const mid_t_height = 7;
    const mid_t_radius = 6;
    const ul_t_radius = 5;
    const ul_t_height = 2;
    const h_rad = 6;
    const leg_len = 5;
    const leg_rad = 1.5;
    const leg_x_pos = 6;
    const arm_len = 11;
    const arm_rad = 1;
    const foot_w = 6;
    const foot_h = 1;
    const foot_d = 4;
    const foot_pts = 3;
    const foot_x_pos = 1;
    const hand_w = 3;
    const hand_h = 4;
    const hand_d = 1;
    const hand_pts = 3;
    const hand_x_pos = 13;
    const hand_y_pos = 4;
    
    // head
    groups.push(makeSphereGroup(sph_sub, h_rad, new BABYLON.Vector3(0, ul_t_height + mid_t_height/2 + h_rad*0.8), new BABYLON.Color3(1,1,0))); 
    // upper torso
    groups.push(makeCylinderGroup(cyl_sub, ul_t_height, ul_t_radius, new BABYLON.Vector3(0,ul_t_height/2 + mid_t_height/2,0), new BABYLON.Vector3(0,0,0), new BABYLON.Color3(1, 0, 0))); 
    // middle torso
    groups.push(makeCylinderGroup(cyl_sub, mid_t_height, mid_t_radius, new BABYLON.Vector3(0,0,0), new BABYLON.Vector3(0,0,0), new BABYLON.Color3(0, 1, 0))); 
    // lower torso
    groups.push(makeCylinderGroup(cyl_sub, ul_t_height, ul_t_radius, new BABYLON.Vector3(0,-ul_t_height/2 - mid_t_height/2,0), new BABYLON.Vector3(0,0,0), new BABYLON.Color3(0, 0, 1))); 
    // left leg
    groups.push(makeCylinderGroup(cyl_sub, leg_len, leg_rad, new BABYLON.Vector3(-leg_x_pos/2, -mid_t_height/2-ul_t_height-leg_len/2), new BABYLON.Vector3(0,0,0), new BABYLON.Color3(0,1,1)));
    // right leg
    groups.push(makeCylinderGroup(cyl_sub, leg_len, leg_rad, new BABYLON.Vector3(leg_x_pos/2, -mid_t_height/2-ul_t_height-leg_len/2), new BABYLON.Vector3(0,0,0), new BABYLON.Color3(0,1,1)));
    // left arm
    groups.push(makeCylinderGroup(cyl_sub, arm_len, arm_rad, new BABYLON.Vector3(-mid_t_radius*1.4, 1, 0), new BABYLON.Vector3(0,0,-Math.PI/6), new BABYLON.Color3(1,0,1)));
    // right arm
    groups.push(makeCylinderGroup(cyl_sub, arm_len, arm_rad, new BABYLON.Vector3(mid_t_radius*1.4, 1, 0), new BABYLON.Vector3(0,0,Math.PI/6), new BABYLON.Color3(1,0,1)));
    // left leg
    groups.push(makeBoxGroup(foot_pts, foot_w, foot_h, foot_d, new BABYLON.Vector3(foot_x_pos-foot_w/2, -mid_t_height/2-ul_t_height-leg_len-foot_h/2, 0.5), new BABYLON.Vector3(0,0,0), new BABYLON.Color3(0.7, 0.7, 0.2)));
    // right leg
    groups.push(makeBoxGroup(foot_pts, foot_w, foot_h, foot_d, new BABYLON.Vector3(foot_x_pos+foot_w/2, -mid_t_height/2-ul_t_height-leg_len-foot_h/2, 0.5), new BABYLON.Vector3(0,0,0), new BABYLON.Color3(0.7, 0.7, 0.2)));
    // left hand
    groups.push(makeBoxGroup(hand_pts, hand_w, hand_h, hand_d, new BABYLON.Vector3(hand_x_pos-hand_w/2, -hand_y_pos, 0), new BABYLON.Vector3(Math.PI/2,0,Math.PI/6), new BABYLON.Color3(0.2, 0.7, 0.2)));
    // right hand
    groups.push(makeBoxGroup(hand_pts, hand_w, hand_h, hand_d, new BABYLON.Vector3(-hand_x_pos+hand_w/2, -hand_y_pos, 0), new BABYLON.Vector3(Math.PI/2,0,-Math.PI/6), new BABYLON.Color3(0.2, 0.7, 0.2)));

    return groups;
}


function buildRandomExampleShape(scene) {
    const exampleMeshes = [
        BABYLON.MeshBuilder.CreateBox("example-box", {width: 25, height: 20, depth: 15}, scene),
        BABYLON.MeshBuilder.CreateSphere("example-sphere", {diameter: 25}, scene),
        BABYLON.MeshBuilder.CreateCylinder("example-cylinder", {height: 25, diameter: 20}, scene),
        BABYLON.MeshBuilder.CreateCapsule("example-capsule", {height: 25, radius: 20}, scene)
    ];

    exampleMeshes.forEach(mesh => mesh.setEnabled(false));

    const selectedMesh = exampleMeshes[Math.floor(Math.random() * exampleMeshes.length)];
    console.log('selectedMesh', selectedMesh);

    const pcs = new BABYLON.PointsCloudSystem("pcs", 2);
    pcs.addSurfacePoints(selectedMesh, 125);
    pcs.addVolumePoints(selectedMesh, 250);

    pcs.buildMeshAsync(() => {});

    return [{
        points: pcs.particles.map(p => p.position),
        renderPos: new BABYLON.Vector3(0,0,0),
        renderRot: new BABYLON.Vector3(0,0,0),
        singleCol: null
    }];
}

async function main() {
    let showDebug = false;
    
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true);
    
    let scene = createScene(engine, canvas); //Call the createScene function
    showWorldAxis(1,scene);

    // Each entry is a group of points that represents a separate group on the input
    let groups = [];

    const randomExampleButton = document.getElementById("rndExample");
    randomExampleButton.addEventListener("click", function() {
        scene.dispose();
        scene = createScene(engine, canvas);
        groups = buildRandomExampleShape(scene);
    });

    const themeButton = document.getElementById("theme");
    themeButton.addEventListener("click", function() {
        scene.dispose();
        scene = createScene(engine, canvas);
        groups = buildThemeGroups();
    });

    // groups = buildThemeGroups();
    groups = buildRandomExampleShape(scene);
    
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

    const runQuickhullButton = document.getElementById("runQuickhull");
    runQuickhullButton.addEventListener("click", function() {
        groups.forEach(group => group.hull = constructHull(group.points));
        groups.forEach(group => {
            group.hull.buildRenderableMesh(scene, group.singleCol);
            group.hull.renderableMesh.position = group.renderPos;
            group.hull.renderableMesh.rotation = group.renderRot;
        });
        console.log('Hull construction done');
    });

    const showQuickhullButton = document.getElementById("showQuickhull");
    showQuickhullButton.addEventListener("click", function() {
        groups.forEach(({hull}) => hull.constructionAnimation.start(false, CONSTS.ANIM_SPEED));
    });
}

main().then(() => {});