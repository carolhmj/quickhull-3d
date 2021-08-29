import {Face, FaceTypes} from './Face.js';
import {pointToLineDistance, signedDistanceToPlane, removeVertexFromList} from './utils.js';
import { CONSTS } from './consts.js';

class Quickhull3D {
    DIM_TO_AXIS = {
        0: 'x',
        1: 'y',
        2: 'z'
    }

    constructor() {
        this.vertexList = []; // List of BABYLON.Vector3 objects 
        this.claimed = [] // List of BABYLON.Vector3 objects
        this.unclaimed = [];
        this.horizon = [];
        this.newFaces = [];
        this.faces = [];
        this.renderableMesh = new BABYLON.Mesh("convex-hull");
    }

    buildInitialSimplex(step) {
        // For the first two points, select the two who have the furthest one-dimensional distance
         
        // Store the vertices with min and max value in each dimension
        const minVertices = [
            new BABYLON.Vector3(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
            new BABYLON.Vector3(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
            new BABYLON.Vector3(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
        ];

        const maxVertices = [
            new BABYLON.Vector3(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
            new BABYLON.Vector3(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
            new BABYLON.Vector3(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
        ];

        for (let v of this.vertexList) {
            for (let i = 0; i < 3; i++) {
                if (v[this.DIM_TO_AXIS[i]] < minVertices[i][this.DIM_TO_AXIS[i]]) {
                    minVertices[i] = v;
                }
                if (v[this.DIM_TO_AXIS[i]] > maxVertices[i][this.DIM_TO_AXIS[i]]) {
                    maxVertices[i] = v;
                }
            }    
        }

        let maxDistance = maxVertices[0].x - minVertices[0].x;
        let maxAxis = 0;
        for (let i = 1; i < 3; i++) {
            const distance = maxVertices[i][this.DIM_TO_AXIS[i]] - minVertices[i][this.DIM_TO_AXIS[i]];
            if (distance > maxDistance) {
                maxDistance = distance;
                maxAxis = i;
            }
        }

        const v1 = minVertices[maxAxis];
        const v2 = maxVertices[maxAxis];
        // console.log('v1', v1);
        // console.log('v2', v2);
        
        let maxDist = Number.MIN_VALUE;
        let maxVertex = null;
        // For the third vertex, choose the one with the max distance to the line formed by the first two
        for (let v of this.vertexList) {
            const distance = pointToLineDistance(v2, v1, v);
            if (distance > maxDist) { 
                maxDist = distance;
                maxVertex = v;
            }
        }

        const v3 = maxVertex;
        // console.log('v3', v3);

        // For the fourth vertex, choose the one with the max distance to the plane formed by the first three
        maxDist = Number.MIN_VALUE;
        maxVertex = null;
        for (let v of this.vertexList) {
            const distance = Math.abs(signedDistanceToPlane(v1, v2, v3, v));
            if (distance > maxDist) {
                maxDist = distance;
                maxVertex = v;
            }
        }

        // console.log('max dist', maxDist);
        const v4 = maxVertex;
        // console.log('v4', v4);

        // Check if v4 is in front of the plane v1v2v3 or behind
        const signedDist = signedDistanceToPlane(v1, v2, v3, v4);
        const v4InFront = signedDist > 0;

        // Create faces from points
        const faces = [null, null, null, null];

        for (let i = 0; i < 4; i++) {
            faces[i] = new Face(step);
        }

        if (v4InFront) {
            faces[0].buildFromPoints(v3, v2, v1);
            faces[1].buildFromPoints(v2, v3, v4);
            faces[2].buildFromPoints(v4, v3, v1);
            faces[3].buildFromPoints(v1, v2, v4);
        } else {
            faces[0].buildFromPoints(v1, v2, v3);
            faces[1].buildFromPoints(v4, v3, v2);
            faces[2].buildFromPoints(v1, v3, v4);
            faces[3].buildFromPoints(v4, v2, v1);
        }

        // Connect faces, forming the initial polygon
        faces[0].findEdgeWithExtremities(v1, v2).setTwin(faces[3].findEdgeWithExtremities(v1, v2));
        faces[0].findEdgeWithExtremities(v2, v3).setTwin(faces[1].findEdgeWithExtremities(v2, v3));
        faces[0].findEdgeWithExtremities(v1, v3).setTwin(faces[2].findEdgeWithExtremities(v1, v3));

        faces[1].findEdgeWithExtremities(v3, v4).setTwin(faces[2].findEdgeWithExtremities(v3, v4));
        faces[1].findEdgeWithExtremities(v2, v4).setTwin(faces[3].findEdgeWithExtremities(v2, v4));

        faces[2].findEdgeWithExtremities(v1, v4).setTwin(faces[3].findEdgeWithExtremities(v1, v4));
        
        // console.log('initial polygon', faces);

        this.faces.push(...faces);

        // Go through the points again and check the distance to each one of the 
        // individual faces
        for (let v of this.vertexList) {
            if (v.equalsWithEpsilon(v1) || v.equalsWithEpsilon(v2) || v.equalsWithEpsilon(v3) || v.equalsWithEpsilon(v4)) {
                continue;
            }
            let maxDist = CONSTS.DISTANCE_TOLERANCE;
            let maxDistFace = null;
            for (let i = 0; i < 4; i++) {
                const dist = faces[i].signedDistanceFromPoint(v);
                if (dist > maxDist) {
                    maxDist = dist;
                    maxDistFace = faces[i];
                }
            }
            
            if (maxDistFace !== null) {
                this.addPointToFace(v, maxDistFace);
            }
        }
    }

    // Adds point v to the outside list of f
    addPointToFace(v, f) {
        v.face = f; // Associate this vertex as being "outside" of this face
        this.claimed.push(v);
        f.outside.push(v); 
    }

    nextPointToAdd() {
        if (this.claimed.length > 0) {
            let eyeFace = this.claimed[0].face;
            let eyeVertex = null;

            let maxDist = 0;
            for (let vertex of eyeFace.outside) {
                const dist = eyeFace.signedDistanceFromPoint(vertex);
                if (dist > maxDist) {
                    maxDist = dist;
                    eyeVertex = vertex;
                }
            }
            return eyeVertex;
        } else {
            return null;
        }
    }

    addPointToHull(eye, step) {
        this.horizon = [];
        this.unclaimed = [];

        this.removePointFromFace(eye, eye.face);
        this.calculateHorizon(eye, null, eye.face, this.horizon, step);
        this.newFaces = this.addNewFaces(eye, this.horizon, step);

        this.resolveUnclaimedPoints(this.newFaces);
    }

    oppositeFaceDistance(halfEdge) {
        return halfEdge.face.signedDistanceFromPoint(halfEdge.oppositeFace().centroid())
    }

    resolveUnclaimedPoints(newFaces) {
        for (let unclaimedVert of this.unclaimed) {
            let maxDist = CONSTS.DISTANCE_TOLERANCE;
            let maxFace = null;

            for (let f of newFaces) {
                if (f.mark === FaceTypes.VISIBLE) {
                    const dist = f.signedDistanceFromPoint(unclaimedVert);
                    if (dist > maxDist) {
                        maxDist = dist;
                        maxFace = f;
                    }
                }
            }
            if (maxFace !== null) {
                this.addPointToFace(unclaimedVert, maxFace);
            }
        }
    }

    addNewFaces(eye, horizon, step) {
        const newFaces = [];
        let edgePrev = null;
        let edgeBegin = null;
        
        for (let hedge of horizon) {
            let hedgeSide = this.addAdjoiningFace(eye, hedge, step); //edge of the side of the face (halfEdge[2])
            if (edgePrev != null) {
                hedgeSide.prev.setTwin(edgePrev.next);
            } else {
                edgeBegin = hedgeSide; //edge[2]
            }

            newFaces.push(hedgeSide.face);
            edgePrev = hedgeSide; //edge[2]
        }

        edgeBegin.prev.setTwin(edgePrev.next);
        return newFaces;
    }

    addAdjoiningFace(eye, edge, step) {
        const face = new Face(step);
        face.buildFromPointAndHalfEdge(eye, edge);
        this.faces.push(face);
        face.halfEdges[2].setTwin(edge.twin);
        return face.halfEdges[2];  
    }

    removePointFromFace(v, f) {
        f.removeVertexFromOutsideSet(v);
        removeVertexFromList(v, this.claimed);
    }

    removeAllPointsFromFace(f) {
        let removedPts = [...f.outside];
        for (let v of removedPts) {
            this.removePointFromFace(v, f);
        }
        return removedPts;
    }

    calculateHorizon(eye, edge0, face, horizon, step) {
        this.deleteFacePoints(face, null);
        face.markAsDeleted(step);
        let edge = null;
        if (edge0 === null) {
            edge0 = face.halfEdges[0];
            edge = edge0;
        } else {
            edge = edge0.next;
        }
        do {
            const oppFace = edge.oppositeFace();
            if (oppFace.mark === FaceTypes.VISIBLE) {
                if (oppFace.signedDistanceFromPoint(eye) > CONSTS.DISTANCE_TOLERANCE) {
                    this.calculateHorizon(eye, edge.twin, oppFace, horizon, step);
                } else {
                    horizon.push(edge);
                }
            }
            edge = edge.next;
        } while (edge != edge0);
    }

    deleteFacePoints(face, absorbingFace) {
        let faceVerts = this.removeAllPointsFromFace(face);
        if (faceVerts != null) {
            if (absorbingFace == null) {
                this.unclaimed.push(...faceVerts);
            } else {
                for (let v of faceVerts) {
                    const dist = absorbingFace.signedDistanceFromPoint(v);
                    if (dist > CONSTS.DISTANCE_TOLERANCE) {
                        this.addPointToFace(v, absorbingFace);
                    } else {
                        this.unclaimed.push(v);
                    }
                }
            }
        }
    }

    build(inputPoints) {
        let step = 0;
        this.vertexList = [...inputPoints]; 
        this.buildInitialSimplex(step);
        step += 1;

        let eye = this.nextPointToAdd();
        while (eye != null) {
            this.addPointToHull(eye, step);
            step += 1;
            eye = this.nextPointToAdd();

            for (let f of this.faces) {
                // If face is visible, print it and its neighbors for debugging:
                if (f.mark === FaceTypes.VISIBLE) {
                    let neighbors = [];
                    for (let e of f.halfEdges) {
                        if (e.twin.face.mark === FaceTypes.VISIBLE) {
                            neighbors.push(e.twin.face.id);
                        } else {
                            throw new Error(`Visible face ${f.id} has an edge ${e.id} whose twin face ${e.oppositeFace().id} is not visible!`);
                        }
                    }
                }
            }
        }
        console.log('construct hull done');
        this.totalSteps = step;
    }

    // Reference for setting a color to each face
    // https://playground.babylonjs.com/#Y8HRP3#11
    buildRenderableMesh(scene, singleColor = null) {
        const vertexData = new BABYLON.VertexData();

        // Iterates over the list of faces, adding its vertices to a list and building
        // the indices. Besides, it selects the color of the face based on if the face
        // is deleted or not
        // Probably easier to render if vertices aren't unique
        const vertices = []; 
        const faces = [];
        const normals = []
        const lifetime = [];
        for (let f of this.faces) {
            for (let v of f.points) {
                vertices.push(v.x, v.y, v.z);
                const vlen = vertices.length;
                faces.push(vlen-1, vlen-2, vlen-3);
                const normal = f.normal;
                normals.push(normal.x, normal.y, normal.z);
            }
            lifetime.push({createdAt: f.createdAt, deletedAt: f.deletedAt});
        }

        const materials = [];
        const multimaterial = new BABYLON.MultiMaterial("convex-hull", scene);
        
        const animations = new BABYLON.AnimationGroup("convex-hull-anim");

        const START_OPACITY = 0.0;
        const END_OPACITY = CONSTS.HULL_OPACITY;

        const colArr = new Array(this.totalSteps);

        // Create materials and animations for each face
        for (let i = 0; i < lifetime.length; i++) {
            const {createdAt, deletedAt} = lifetime[i];

            const nm = new BABYLON.StandardMaterial("face" + i);
            nm.backFaceCulling = false;

            if (singleColor === null) {
                let col = colArr[createdAt];
                if (col === null || col === undefined) {
                    col = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
                }
                colArr[createdAt] = col;
                nm.diffuseColor = col;
            } else {
                nm.diffuseColor = singleColor;
            }
        
            materials.push(nm);
            multimaterial.subMaterials.push(nm);

            const animation = new BABYLON.Animation("face" + i, "alpha", CONSTS.FPS, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
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

            // console.log('keys for face', i, keys);
            animation.setKeys(keys);

            animations.addTargetedAnimation(animation, nm);
        }

        animations.normalize();

        vertexData.positions = vertices;
        vertexData.indices = faces;
        vertexData.normals = normals;

        vertexData.applyToMesh(this.renderableMesh);

        // Create a submesh for every face
        this.renderableMesh.subMeshes = [];
        for (let i = 0; i < lifetime.length; i++) {
            new BABYLON.SubMesh(i, 0, vertices.length, i*3, 3, this.renderableMesh);
        }

        this.renderableMesh.material = multimaterial;

        this.constructionAnimation = animations;
        console.log('renderable mesh build');
    }
}

export {Quickhull3D};