// This class receives a list of convex hull faces and returns the tetrahedralization

import { Face, FaceTypes } from "./Face.js";
import Simplex from "./Simplex.js";

export class Delaunay3D {
    DIM_TO_AXIS = {
        0: 'x',
        1: 'y',
        2: 'z'
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

    // Reference playground: https://playground.babylonjs.com/#XAGD4K#6
    buildInitialShape(scene) {
        // The initial shape is a bounding box with two tetrahedra containing all
        // the points
        // Store the vertices with min and max value in each dimension
        const minVertices = new BABYLON.Vector3(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
        const maxVertices = new BABYLON.Vector3(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);

        console.log('vertex list', this.vertexList);
        // for (let v of this.vertexList) {
        //     for (let i = 0; i < 3; i++) {
        //         if (v[this.DIM_TO_AXIS[i]] < minVertices[i][this.DIM_TO_AXIS[i]]) {
        //             minVertices[i] = v;
        //         }
        //         if (v[this.DIM_TO_AXIS[i]] > maxVertices[i][this.DIM_TO_AXIS[i]]) {
        //             maxVertices[i] = v;
        //         }
        //         minVertex.min
        //     }    
        // }
        minVertices.minimizeInPlace(this.vertexList);
        maxVertices.maximizeInPlace(this.vertexList);

        // bounding box from min and max pts
        const pts = [
            new BABYLON.Vector3(minVertices.x, maxVertices.y, maxVertices.z),
            new BABYLON.Vector3(maxVertices.x, maxVertices.y, maxVertices.z),
            new BABYLON.Vector3(minVertices.x, minVertices.y, maxVertices.z),
            new BABYLON.Vector3(maxVertices.x, minVertices.y, maxVertices.z),
            new BABYLON.Vector3(minVertices.x, maxVertices.y, minVertices.z),
            new BABYLON.Vector3(maxVertices.x, maxVertices.y, minVertices.z),
            new BABYLON.Vector3(minVertices.x, minVertices.y, minVertices.z),
            new BABYLON.Vector3(maxVertices.x, minVertices.y, minVertices.z),
        ];

        console.log('pts', pts);

        const tetrs = [];

        tetrs.push([pts[0], pts[1], pts[3], pts[5]]);
        tetrs.push([pts[0], pts[2], pts[3], pts[6]]);
        tetrs.push([pts[3], pts[5], pts[6], pts[7]]);
        tetrs.push([pts[0], pts[3], pts[5], pts[6]]);
        tetrs.push([pts[0], pts[4], pts[5], pts[6]]);

        let i = 0;
        for (let tetr of tetrs) {
            const centr = tetr[0].add(tetr[1]).add(tetr[2]).add(tetr[3]).scale(0.25);
            // console.log('centr', centr);
            // Create tetrahedron faces
            const tp = tetr.map(pt => [pt.x, pt.y, pt.z]).flat();
            // console.log('pts', tp);
            const idxs = [
                0, 1, 2,
                1, 2, 3,
                0, 2, 3,
                0, 1, 3
            ];

            for (let i = 0; i < idxs.length; i += 3) {
                const isOpposite = this.checkNormalOpposite(
                    tetr[idxs[i]], 
                    tetr[idxs[i+1]], 
                    tetr[idxs[i+2]], 
                    centr);
                if (!isOpposite) {
                    // reverse order of indices
                    let aux = idxs[i];
                    idxs[i] = idxs[i+2];
                    idxs[i+2] = aux;
                }
            }

            const vertexData = new BABYLON.VertexData();
            vertexData.positions = tp;
            vertexData.indices = idxs;

            const name = "tetr" + i++;
            const mesh = new BABYLON.Mesh(name, scene);
            vertexData.applyToMesh(mesh);
            mesh.material = new BABYLON.StandardMaterial(name, scene);
            mesh.material.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random())
        }
    }

    getInitialFace(vertexList) {
        // Look for the points that are closest together

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

        // Main loop
        while (frontier.length > 0) {
            const faceToProcess = frontier[0];
            frontier.splice(0,1);
            console.log('face to process is', faceToProcess);

            // Classify points by highest solid angle
            // if (explorableVertices.length > 0) {
            let explorableVertices = this.vertexList.filter(v => !v.equalsWithEpsilon(faceToProcess.points[0]) && !v.equalsWithEpsilon(faceToProcess.points[1]) && !v.equalsWithEpsilon(faceToProcess.points[2]));
            explorableVertices.sort((a, b) => 
            this.tetrSolidAngle(a, faceToProcess.points[0], faceToProcess.points[1], faceToProcess.points[2]) 
            - this.tetrSolidAngle(b, faceToProcess.points[0], faceToProcess.points[1], faceToProcess.points[2]));
            // }
            let i = explorableVertices.length-1;
            let newPolyhedra;
            while (i > 0) {
                const possibleVtx = explorableVertices[i];
                // Check if the point can form a valid tetrahedron
                const possiblePoly = new Simplex();
                possiblePoly.buildFromPoints([possibleVtx, faceToProcess.points[0], faceToProcess.points[1], faceToProcess.points[2]]);
                
                let intersects = false;
                for (let simplex of constructedSimplexes) {
                    if (simplex.samePoints(possiblePoly) || simplex.intersects(possiblePoly)) {
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
                constructedSimplexes.push(newPolyhedra);
                // If any of the new polyhedra's faces with the opposite direction is also in the frontier, then
                // remove those faces from the frontier and don't add them to
                const removeFromFrontier = new Set();
                const notAddToFrontier = new Set();
                for (let frontierFace of frontier) {
                    for (let newFace of newPolyhedra.faces) {
                        const isOpposite = frontierFace.equalsOppositeOrientation(newFace);
                        if (isOpposite) {
                            removeFromFrontier.push(frontierFace);
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
            

        }   
    }
}