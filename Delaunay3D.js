// This class receives a list of convex hull faces and returns the tetrahedralization

import { Face, FaceTypes } from "./Face.js";
import Simplex from "./Simplex.js";
import { CONSTS } from "./consts.js";

export class Delaunay3D {
    DIM_TO_AXIS = {
        0: 'x',
        1: 'y',
        2: 'z'
    }

    constructor() {
        this.renderableMesh = new BABYLON.Mesh("delaunay");
    }    

    getInputPoints(inputFaces) {
        // const uniqueIds = new Set();
        const uniquePts = [];

        for (let face of inputFaces) {
            // console.log('look at face', face);
            if (face.mark === FaceTypes.VISIBLE) {
                for (let pt of face.points) {
                    // if (!uniqueIds.has(pt.id)) {
                    //     uniqueIds.add(pt.id);
                    //     uniquePts.push(pt);
                    // }
                    if (!uniquePts.some( upt => upt.equalsWithEpsilon(pt))) {
                        uniquePts.push(pt);
                    }
                }
            }
        }

        return uniquePts;
    }

    // Compute the solid angle of the tetrahedron with origin O and face ABC
    // formula from: https://en.wikipedia.org/wiki/Solid_angle
    tetrSolidAngle(O, A, B, C) {
        const av = A.subtract(O);
        const bv = B.subtract(O);
        const cv = C.subtract(O);

        const tripleProd = BABYLON.Vector3.Dot(av, BABYLON.Vector3.Cross(bv, cv));
        const num1 = av.length() + bv.length() + cv.length();
        const num2 = BABYLON.Vector3.Dot(av, bv) * cv.length();
        const num3 = BABYLON.Vector3.Dot(av, cv) * bv.length();
        const num4 = BABYLON.Vector3.Dot(bv, cv) * av.length();

        return tripleProd / (num1 + num2 + num3 + num4);
    }

    buildRenderableMesh(scene, singleColor) {
        const vertexData = new BABYLON.VertexData();

        // Iterates over the list of faces, adding its vertices to a list and building
        // the indices. Besides, it selects the color of the face based on if the face
        // is deleted or not
        // Probably easier to render if vertices aren't unique
        const vertices = []; 
        const faces = [];
        const normals = []
        const lifetime = [];
        let vertexCount = 0;
        for (let s of this.constructedSimplexes) {
            for (let f of s.faces) {
                for (let v of f.points) {
                    vertices.push(v.x, v.y, v.z);
                    // const normal = f.normal;
                    // normals.push(normal.x, normal.y, normal.z);
                    vertexCount++;
                }
                const vlen = vertices.length;
                faces.push(vertexCount-1, vertexCount-2, vertexCount-3);
                lifetime.push({createdAt: s.createdAt, deletedAt: s.deletedAt});
            }
        }
        console.log('lifetime', lifetime);

        const materials = [];
        const multimaterial = new BABYLON.MultiMaterial("delaunay", scene);
        
        const animations = new BABYLON.AnimationGroup("delaunay-anim");

        const START_OPACITY = 0.0;
        const END_OPACITY = CONSTS.HULL_OPACITY;

        const colArr = new Array(this.totalSteps);
        console.log('colarr at start', colArr);

        // Create materials and animations for each face
        for (let i = 0; i < lifetime.length; i++) {
            const {createdAt, deletedAt} = lifetime[i];

            const nm = new BABYLON.StandardMaterial("delaunay-face" + i);
            nm.backFaceCulling = true;
            // nm.wireframe = true;

            if (!singleColor) {
                let col = colArr[createdAt];
                if (!col) {
                    col = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
                }
                colArr[createdAt] = col;
                nm.diffuseColor = col;
            } else {
                nm.diffuseColor = singleColor;
            }
        
            materials.push(nm);
            multimaterial.subMaterials.push(nm);

            const animation = new BABYLON.Animation("delaunay-face" + i, "alpha", CONSTS.FPS, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
            const keys = [];
            keys.push(
                {frame: 0, value: 0},
                {frame: createdAt*CONSTS.FPS, value: START_OPACITY},
                {frame: (createdAt+1)*CONSTS.FPS, value: END_OPACITY}
            );

            if (deletedAt) {
                keys.push(
                    {frame: deletedAt*CONSTS.FPS, value: END_OPACITY},
                    {frame: (deletedAt+1)*CONSTS.FPS, value: START_OPACITY}
                );
            }

            console.log('keys for face', i, keys);
            animation.setKeys(keys);

            animations.addTargetedAnimation(animation, nm);
        }
        console.log('colArr', colArr);

        animations.normalize();

        console.log('vertices', vertices);
        vertexData.positions = vertices;
        console.log('indices', faces);
        vertexData.indices = faces;
        // console.log('normals', normals);
        // vertexData.normals = normals;

        vertexData.applyToMesh(this.renderableMesh);

        // Create a submesh for every face
        this.renderableMesh.subMeshes = [];
        for (let i = 0; i < lifetime.length; i++) {
            console.log('i', i);
            console.log('create submesh to face with indices', faces[i*3], faces[i*3+1], faces[i*3+2]);
            new BABYLON.SubMesh(i, 0, vertices.length, i*3, 3,  this.renderableMesh);
        }

        this.renderableMesh.material = multimaterial;

        this.constructionAnimation = animations;

        console.log('finished building renderable mesh');
    }

    build(inputFaces) {
        // Receive input faces from Quickhull algorithm. Extract the visible faces only
        this.convexHull = inputFaces.filter(face => face.mark === FaceTypes.VISIBLE);
        // Save all the vertices that have to be processed    
        this.vertexList = this.getInputPoints(inputFaces);
        // Build initial shape (simplex) containing all points to be inserted
        // this.buildInitialShape(scene);

        let frontier = [];
        // Add any face from the convex hull to the face queue
        frontier.push(this.convexHull[0]);
        // const initialFace = this.getInitialFace(this.vertexList);

        const exploredFaces = [];
        // const explorableVertices = [...this.vertexList];

        const constructedSimplexes = [];
        let step = 0;
        // Main loop
        while (frontier.length > 0) {
            const faceToProcess = frontier[0];
            // frontier.splice(0,1);

            // Classify points by highest solid angle
            // if (explorableVertices.length > 0) {
            let explorableVertices = this.vertexList.filter(v => !v.equalsWithEpsilon(faceToProcess.points[0]) && !v.equalsWithEpsilon(faceToProcess.points[1]) && !v.equalsWithEpsilon(faceToProcess.points[2]));
            explorableVertices.sort((a, b) => 
            this.tetrSolidAngle(a, faceToProcess.points[0], faceToProcess.points[1], faceToProcess.points[2]) 
            - this.tetrSolidAngle(b, faceToProcess.points[0], faceToProcess.points[1], faceToProcess.points[2]));
            // }
            let i = explorableVertices.length-1;
            let newPolyhedra;
            while (i >= 0) {
                const possibleVtx = explorableVertices[i];
    
                // Check if the point can form a valid tetrahedron
                const possiblePoly = new Simplex(step);
                possiblePoly.buildFromPoints([possibleVtx, faceToProcess.points[0], faceToProcess.points[1], faceToProcess.points[2]]);
                
                let intersects = false;
                for (let simplex of constructedSimplexes) {
                    const samePoints = simplex.samePoints(possiblePoly);
                    let simplIntersects = simplex.intersects(possiblePoly);
                    if ( samePoints || simplIntersects ) {
                        intersects = true;
                        break;
                    }
                }

                if (!intersects) {
                    newPolyhedra = possiblePoly;
                    break;
                }

                i--;
            }

            if (newPolyhedra) {
                step++;
                constructedSimplexes.push(newPolyhedra);
                // If any of the new polyhedra's faces with the opposite direction is also in the frontier, then
                // remove those faces from the frontier and don't add them to
                const removeFromFrontier = new Set();
                const notAddToFrontier = new Set();
                for (let frontierFace of frontier) {
                    for (let newFace of newPolyhedra.faces) {
                        const isOpposite = frontierFace.equalsSameOrientation(newFace) || frontierFace.equalsOppositeOrientation(newFace);
                        if (isOpposite) {
                            removeFromFrontier.add(frontierFace);
                            notAddToFrontier.add(newFace);
                        }
                    }
                }
                
                frontier = frontier.filter(frontierFace => !removeFromFrontier.has(frontierFace));
                const facesToAdd = newPolyhedra.faces.filter(newFace => !notAddToFrontier.has(newFace));

                frontier.push(...facesToAdd);
            }

            // Update frontier 
            
            exploredFaces.push(faceToProcess);
            frontier.splice(0,1);

        } 
        
        this.constructedSimplexes = constructedSimplexes;
        console.log('constructed simplexes', this.constructedSimplexes);
        this.totalSteps = step;
    }
}